import fs from "fs-extra";

import { logger } from "../logger";
import { downloadFileFromUrl } from "../providers/utils";

const defaultHealthTimeoutMs = 2000;
const defaultPollIntervalMs = 1500;
const defaultPollTimeoutMs = 120000;

type ComfyUIWorkflowNode = {
  inputs?: Record<string, unknown>;
  _meta?: { title?: string };
};

type ComfyUIWorkflow = Record<string, ComfyUIWorkflowNode>;

type ComfyUIHistoryOutputFile = {
  filename: string;
  subfolder?: string;
  type?: string;
};

/**
 * Thin client around ComfyUI's "API format" workflow queue
 * (POST /prompt, GET /history/{id}, GET /view) - see
 * https://github.com/comfyanonymous/ComfyUI for the wire format.
 *
 * Workflow JSON files are user-supplied (exported from the ComfyUI UI via
 * "Save (API Format)") and live under `config.comfyWorkflowsDirPath`.
 * `overrides` maps a node's `_meta.title` to input fields to overwrite,
 * which is how prompt text / LoRA / IP-Adapter reference images get
 * substituted into an otherwise fixed workflow graph.
 */
export class ComfyUIClient {
  constructor(private baseUrl: string) {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/system_stats`, {
        signal: AbortSignal.timeout(defaultHealthTimeoutMs),
      });
      return res.ok;
    } catch (error: unknown) {
      logger.debug({ error }, "ComfyUI health check failed");
      return false;
    }
  }

  async runWorkflow(
    workflowPath: string,
    overrides: Record<string, Record<string, unknown>>,
    destPath: string,
  ): Promise<string> {
    if (!fs.existsSync(workflowPath)) {
      throw new Error(`ComfyUI workflow file not found: ${workflowPath}`);
    }
    const workflow = JSON.parse(
      fs.readFileSync(workflowPath, "utf-8"),
    ) as ComfyUIWorkflow;

    for (const [nodeTitle, inputs] of Object.entries(overrides)) {
      const node = Object.values(workflow).find(
        (candidate) => candidate._meta?.title === nodeTitle,
      );
      if (node) {
        node.inputs = { ...node.inputs, ...inputs };
      }
    }

    const promptResponse = await fetch(`${this.baseUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
    });
    if (!promptResponse.ok) {
      throw new Error(
        `ComfyUI /prompt error: ${promptResponse.status} ${promptResponse.statusText}`,
      );
    }
    const { prompt_id: promptId } = (await promptResponse.json()) as {
      prompt_id: string;
    };

    const outputUrl = await this.pollForOutput(promptId);
    await downloadFileFromUrl(outputUrl, destPath);
    return destPath;
  }

  private async pollForOutput(
    promptId: string,
    timeoutMs: number = defaultPollTimeoutMs,
  ): Promise<string> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const res = await fetch(`${this.baseUrl}/history/${promptId}`);
      if (res.ok) {
        const history = (await res.json()) as Record<
          string,
          { outputs?: Record<string, Record<string, ComfyUIHistoryOutputFile[]>> }
        >;
        const entry = history[promptId];
        const outputs = entry?.outputs ? Object.values(entry.outputs) : [];
        for (const output of outputs) {
          const files =
            output.images ?? output.gifs ?? output.videos ?? undefined;
          if (files?.length) {
            const file = files[0];
            const params = new URLSearchParams({
              filename: file.filename,
              subfolder: file.subfolder ?? "",
              type: file.type ?? "output",
            });
            return `${this.baseUrl}/view?${params.toString()}`;
          }
        }
      }
      await new Promise((resolve) => setTimeout(resolve, defaultPollIntervalMs));
    }
    throw new Error(
      `ComfyUI workflow ${promptId} timed out waiting for output after ${timeoutMs}ms`,
    );
  }
}

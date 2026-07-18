import fs from "fs-extra";
import path from "path";

import { ComfyUIClient } from "./comfyui";
import type { ImageGenerateOptions, ImageProvider } from "./types";

const workflowFileName = "flux.json";

export class FluxProvider implements ImageProvider {
  readonly name = "flux";
  private client?: ComfyUIClient;

  constructor(
    comfyUiUrl: string | undefined,
    private workflowsDirPath: string,
  ) {
    if (comfyUiUrl) {
      this.client = new ComfyUIClient(comfyUiUrl);
    }
  }

  private get workflowPath(): string {
    return path.join(this.workflowsDirPath, workflowFileName);
  }

  async isAvailable(): Promise<boolean> {
    if (!this.client || !fs.existsSync(this.workflowPath)) {
      return false;
    }
    return this.client.isAvailable();
  }

  async generateImage(
    options: ImageGenerateOptions,
    destPath: string,
  ): Promise<string> {
    if (!this.client) {
      throw new Error(
        "COMFYUI_URL is not configured - the FLUX image provider needs a running ComfyUI server with a FLUX-compatible workflow",
      );
    }
    return this.client.runWorkflow(
      this.workflowPath,
      {
        Prompt: { text: options.prompt },
        ...(options.loraPath
          ? { LoraLoader: { lora_name: options.loraPath } }
          : {}),
      },
      destPath,
    );
  }
}

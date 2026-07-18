import { logger } from "../logger";
import { ProjectTypeEnum, type FilmIdea, type Script } from "./types";

const defaultHealthTimeoutMs = 2000;
const defaultGenerateTimeoutMs = 30000;
const defaultModel = "llama3";

/**
 * Optional local-LLM backend for real script generation, using Ollama's
 * REST API (https://github.com/ollama/ollama/blob/main/docs/api.md):
 *   GET  {baseUrl}/api/tags     -> health check
 *   POST {baseUrl}/api/generate {model, prompt, stream: false, format: "json"}
 */
export class OllamaStoryBackend {
  constructor(
    private baseUrl: string | undefined,
    private model: string = defaultModel,
  ) {}

  async isAvailable(): Promise<boolean> {
    if (!this.baseUrl) {
      return false;
    }
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(defaultHealthTimeoutMs),
      });
      return res.ok;
    } catch (error: unknown) {
      logger.debug({ error }, "Ollama health check failed");
      return false;
    }
  }

  async generateScript(idea: FilmIdea): Promise<Script> {
    if (!this.baseUrl) {
      throw new Error("OLLAMA_URL is not configured");
    }
    const projectType = idea.projectType ?? ProjectTypeEnum.shorts;
    const prompt =
      `You are a scriptwriter for a ${projectType} video. Given the idea: "${idea.prompt}", ` +
      "write a JSON object with fields: title (string), logline (string), scenes (array of " +
      "objects with heading, narration, visualDescription, searchTerms (array of 2-3 single-word " +
      "strings)). Respond with ONLY the JSON object, no markdown fences.";

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        format: "json",
      }),
      signal: AbortSignal.timeout(defaultGenerateTimeoutMs),
    });
    if (!response.ok) {
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}`,
      );
    }
    const data = (await response.json()) as { response: string };
    const parsed = JSON.parse(data.response) as Omit<Script, "projectType">;
    return { ...parsed, projectType };
  }
}

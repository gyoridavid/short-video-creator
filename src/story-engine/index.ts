import { logger } from "../logger";
import type { Config } from "../config";
import { generateScriptWithTemplate } from "./templateEngine";
import { OllamaStoryBackend } from "./ollama";
import type { FilmIdea, Script } from "./types";

export { generateScriptWithTemplate, OllamaStoryBackend };
export type { FilmIdea, Script };

/**
 * Uses a local Ollama server for script generation when configured and
 * reachable, otherwise falls back to the zero-dependency template engine -
 * "free/local models first, API providers later".
 */
export class StoryEngine {
  private ollama: OllamaStoryBackend;

  constructor(config: Config) {
    this.ollama = new OllamaStoryBackend(config.ollamaUrl);
  }

  async generateScript(idea: FilmIdea): Promise<Script> {
    if (await this.ollama.isAvailable()) {
      try {
        return await this.ollama.generateScript(idea);
      } catch (error: unknown) {
        logger.warn(
          { error },
          "Ollama script generation failed, falling back to the template engine",
        );
      }
    }
    return generateScriptWithTemplate(idea);
  }
}

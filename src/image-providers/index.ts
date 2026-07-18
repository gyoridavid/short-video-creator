import { logger } from "../logger";
import type { Config } from "../config";
import { SDXLProvider } from "./sdxl";
import { FluxProvider } from "./flux";
import type { ImageGenerateOptions, ImageProvider } from "./types";

export { SDXLProvider, FluxProvider };
export type { ImageProvider, ImageGenerateOptions };

export class ImageProviderManager {
  private providers: ImageProvider[];

  constructor(config: Config) {
    this.providers = [
      new SDXLProvider(config.comfyUiUrl, config.comfyWorkflowsDirPath),
      new FluxProvider(config.comfyUiUrl, config.comfyWorkflowsDirPath),
    ];
  }

  async isAnyAvailable(): Promise<boolean> {
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        return true;
      }
    }
    return false;
  }

  async generateImage(
    options: ImageGenerateOptions,
    destPath: string,
  ): Promise<string> {
    for (const provider of this.providers) {
      const available = await provider.isAvailable();
      if (!available) {
        continue;
      }
      try {
        return await provider.generateImage(options, destPath);
      } catch (error: unknown) {
        logger.warn(
          { provider: provider.name, error },
          "Image provider failed, trying next",
        );
      }
    }
    throw new Error(
      "No image provider is available. Set COMFYUI_URL and drop a sdxl.json/flux.json workflow " +
        "in the folder configured by COMFY_WORKFLOWS_DIR to enable image generation.",
    );
  }
}

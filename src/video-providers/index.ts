import { logger } from "../logger";
import type { Config } from "../config";
import type { Video } from "../types/shorts";
import { VideoProviderManager, type VideoSearchQuery } from "../providers";
import { LTXVideoProvider } from "./ltx";
import { WanVideoProvider } from "./wan";
import { AnimateDiffProvider } from "./animatediff";
import type { GenerativeVideoProvider } from "./types";

export { LTXVideoProvider, WanVideoProvider, AnimateDiffProvider };
export type { GenerativeVideoProvider };

/**
 * Tries local generative video models first (LTX -> Wan -> AnimateDiff), and
 * falls back to the stock/local VideoProviderManager (Coverr/Pixabay/Pexels/
 * local files, see src/providers) when none of them are configured/available
 * or generation fails - "free/local models first, API providers later".
 */
export class GenerativeVideoProviderManager {
  private generativeProviders: GenerativeVideoProvider[];

  constructor(
    config: Config,
    private stockVideoProviderManager: VideoProviderManager,
  ) {
    this.generativeProviders = [
      new LTXVideoProvider(config.ltxVideoUrl),
      new WanVideoProvider(config.wanVideoUrl),
      new AnimateDiffProvider(config.comfyUiUrl, config.comfyWorkflowsDirPath),
    ];
  }

  async findAndDownloadVideo(
    query: VideoSearchQuery,
    destPath: string,
  ): Promise<Video> {
    const prompt = query.searchTerms.join(", ");
    for (const provider of this.generativeProviders) {
      const available = await provider.isAvailable();
      if (!available) {
        continue;
      }
      try {
        return await provider.generateVideo(
          {
            prompt,
            durationSeconds: query.minDurationSeconds,
            orientation: query.orientation,
          },
          destPath,
        );
      } catch (error: unknown) {
        logger.warn(
          { provider: provider.name, error },
          "Generative video provider failed, trying next",
        );
      }
    }
    logger.debug(
      "No generative video providers available, falling back to stock/local video providers",
    );
    return this.stockVideoProviderManager.findAndDownloadVideo(
      query,
      destPath,
    );
  }
}

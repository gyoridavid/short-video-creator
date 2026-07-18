import { logger } from "../logger";
import type { Config } from "../config";
import type { Video } from "../types/shorts";
import type { VideoProvider, VideoSearchQuery } from "./types";
import { PexelsProvider } from "./pexels";
import { CoverrProvider } from "./coverr";
import { PixabayProvider } from "./pixabay";
import { LocalVideoProvider } from "./local";

export { PexelsProvider, CoverrProvider, PixabayProvider, LocalVideoProvider };
export type { VideoProvider, VideoSearchQuery };

export const DEFAULT_FALLBACK_ORDER = [
  "coverr",
  "pixabay",
  "pexels",
  "local",
] as const;

export class VideoProviderManager {
  private providers: Map<string, VideoProvider>;
  private order: string[];

  constructor(config: Config) {
    this.providers = new Map<string, VideoProvider>([
      ["pexels", new PexelsProvider(config.pexelsApiKey)],
      ["coverr", new CoverrProvider(config.coverrApiKey)],
      ["pixabay", new PixabayProvider(config.pixabayApiKey)],
      ["local", new LocalVideoProvider(config.localVideosDirPath)],
    ]);

    // primary provider (VIDEO_PROVIDER) goes first, then the default fallback
    // order, deduplicated, keeping only known provider names.
    this.order = [config.videoProvider, ...DEFAULT_FALLBACK_ORDER].filter(
      (name, index, arr) =>
        this.providers.has(name) && arr.indexOf(name) === index,
    );
  }

  async findVideo(
    query: VideoSearchQuery,
  ): Promise<{ video: Video; providerName: string }> {
    const errors: string[] = [];
    for (const name of this.order) {
      const provider = this.providers.get(name);
      if (!provider) {
        continue;
      }
      const available = await provider.isAvailable();
      if (!available) {
        logger.debug(
          { provider: name },
          "Video provider not available, skipping",
        );
        continue;
      }
      try {
        const video = await provider.searchVideos(query);
        logger.debug({ provider: name, video }, "Found video from provider");
        return { video, providerName: name };
      } catch (error: unknown) {
        logger.warn(
          { provider: name, error },
          "Video provider failed, trying next fallback",
        );
        errors.push(
          `${name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    throw new Error(
      "All video providers failed or are unavailable. Configure at least one of " +
        "VIDEO_PROVIDER/COVERR_API_KEY/PIXABAY_API_KEY/PEXELS_API_KEY, or add video files to " +
        `LOCAL_VIDEOS_DIR. Errors: ${errors.join("; ") || "no providers available"}`,
    );
  }

  async downloadVideo(
    video: Video,
    providerName: string,
    destPath: string,
  ): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Unknown video provider: ${providerName}`);
    }
    await provider.downloadVideo(video, destPath);
  }

  async findAndDownloadVideo(
    query: VideoSearchQuery,
    destPath: string,
  ): Promise<Video> {
    const { video, providerName } = await this.findVideo(query);
    await this.downloadVideo(video, providerName, destPath);
    return video;
  }

  async hasAnyAvailableProvider(): Promise<boolean> {
    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        return true;
      }
    }
    return false;
  }
}

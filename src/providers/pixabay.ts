/* eslint-disable @remotion/deterministic-randomness */
import { logger } from "../logger";
import { OrientationEnum, type Video } from "../types/shorts";
import { downloadFileFromUrl } from "./utils";
import type { VideoProvider, VideoSearchQuery } from "./types";

const defaultTimeoutMs = 5000;

type PixabayVideoFile = {
  url: string;
  width: number;
  height: number;
};

type PixabayVideoHit = {
  id: number;
  duration: number;
  videos: {
    large?: PixabayVideoFile;
    medium?: PixabayVideoFile;
    small?: PixabayVideoFile;
    tiny?: PixabayVideoFile;
  };
};

export class PixabayProvider implements VideoProvider {
  readonly name = "pixabay";

  constructor(private apiKey: string | undefined) {}

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async searchVideos(query: VideoSearchQuery): Promise<Video> {
    if (!this.apiKey) {
      throw new Error("Pixabay API key not set");
    }
    const {
      searchTerms,
      minDurationSeconds,
      excludeIds = [],
      orientation,
      timeoutMs = defaultTimeoutMs,
    } = query;

    const pixabayOrientation =
      orientation === OrientationEnum.landscape ? "horizontal" : "vertical";

    for (const searchTerm of searchTerms) {
      logger.debug({ searchTerm }, "Searching for video in Pixabay API");
      const url = `https://pixabay.com/api/videos/?key=${encodeURIComponent(this.apiKey)}&q=${encodeURIComponent(searchTerm)}&orientation=${pixabayOrientation}&per_page=50`;

      let response: Response;
      try {
        response = await fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error: unknown) {
        logger.error(error, "Error fetching videos from Pixabay API");
        continue;
      }

      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          throw new Error(
            "Invalid Pixabay API key - please make sure you get a valid key from https://pixabay.com/api/docs/ and set it in the environment variable PIXABAY_API_KEY",
          );
        }
        logger.warn(
          { status: response.status, searchTerm },
          "Pixabay API error, trying next search term",
        );
        continue;
      }

      const data = (await response.json()) as { hits?: PixabayVideoHit[] };
      const hits = (data.hits ?? []).filter((hit) => {
        if (excludeIds.includes(String(hit.id))) {
          return false;
        }
        return hit.duration >= minDurationSeconds;
      });

      if (!hits.length) {
        continue;
      }

      const hit = hits[Math.floor(Math.random() * hits.length)];
      const file = hit.videos.large ?? hit.videos.medium ?? hit.videos.small;
      if (!file) {
        continue;
      }

      return {
        id: String(hit.id),
        url: file.url,
        width: file.width,
        height: file.height,
      };
    }

    logger.error(
      { searchTerms },
      "No videos found in Pixabay API for the given terms",
    );
    throw new Error("No videos found in Pixabay API");
  }

  async downloadVideo(video: Video, destPath: string): Promise<void> {
    await downloadFileFromUrl(video.url, destPath);
  }
}

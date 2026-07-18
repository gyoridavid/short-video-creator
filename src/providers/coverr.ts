/* eslint-disable @remotion/deterministic-randomness */
import { logger } from "../logger";
import { type Video } from "../types/shorts";
import { downloadFileFromUrl } from "./utils";
import type { VideoProvider, VideoSearchQuery } from "./types";

const defaultTimeoutMs = 5000;

type CoverrVideoHit = {
  id: string;
  urls: {
    mp4?: string;
    mp4_download?: string;
    mp4_preview?: string;
  };
  duration_seconds?: number;
  duration?: number;
};

export class CoverrProvider implements VideoProvider {
  readonly name = "coverr";

  constructor(private apiKey: string | undefined) {}

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async searchVideos(query: VideoSearchQuery): Promise<Video> {
    if (!this.apiKey) {
      throw new Error("Coverr API key not set");
    }
    const {
      searchTerms,
      minDurationSeconds,
      excludeIds = [],
      timeoutMs = defaultTimeoutMs,
    } = query;

    for (const searchTerm of searchTerms) {
      logger.debug({ searchTerm }, "Searching for video in Coverr API");
      const url = `https://api.coverr.co/videos?query=${encodeURIComponent(searchTerm)}&page_size=20&urls=true`;
      let response: Response;
      try {
        response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error: unknown) {
        logger.error(error, "Error fetching videos from Coverr API");
        continue;
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Invalid Coverr API key - please make sure you get a valid key and set it in the environment variable COVERR_API_KEY",
          );
        }
        logger.warn(
          { status: response.status, searchTerm },
          "Coverr API error, trying next search term",
        );
        continue;
      }

      const data = (await response.json()) as { hits?: CoverrVideoHit[] };
      const hits = (data.hits ?? []).filter((hit) => {
        if (excludeIds.includes(hit.id)) {
          return false;
        }
        const duration = hit.duration_seconds ?? hit.duration ?? 0;
        return duration >= minDurationSeconds;
      });

      if (!hits.length) {
        continue;
      }

      const hit = hits[Math.floor(Math.random() * hits.length)];
      const downloadUrl = hit.urls.mp4_download ?? hit.urls.mp4;
      if (!downloadUrl) {
        continue;
      }

      return {
        id: hit.id,
        url: downloadUrl,
        // Coverr doesn't reliably expose dimensions in the search payload;
        // the caller only ever consumes `url`, so these are best-effort.
        width: 1920,
        height: 1080,
      };
    }

    logger.error(
      { searchTerms },
      "No videos found in Coverr API for the given terms",
    );
    throw new Error("No videos found in Coverr API");
  }

  async downloadVideo(video: Video, destPath: string): Promise<void> {
    await downloadFileFromUrl(video.url, destPath);
  }
}

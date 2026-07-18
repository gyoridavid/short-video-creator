/* eslint-disable @remotion/deterministic-randomness */
import fs from "fs-extra";
import path from "path";

import { getOrientationConfig } from "../components/utils";
import { logger } from "../logger";
import { type Video } from "../types/shorts";
import type { VideoProvider, VideoSearchQuery } from "./types";

const videoExtensions = [".mp4", ".mov", ".webm", ".m4v"];

export class LocalVideoProvider implements VideoProvider {
  readonly name = "local";

  constructor(private videosDirPath: string) {}

  private listVideoFiles(): string[] {
    if (!fs.existsSync(this.videosDirPath)) {
      return [];
    }
    return fs
      .readdirSync(this.videosDirPath)
      .filter((file) => videoExtensions.includes(path.extname(file).toLowerCase()));
  }

  isAvailable(): boolean {
    return this.listVideoFiles().length > 0;
  }

  async searchVideos(query: VideoSearchQuery): Promise<Video> {
    const { searchTerms, excludeIds = [], orientation } = query;
    const files = this.listVideoFiles().filter(
      (file) => !excludeIds.includes(file),
    );

    if (!files.length) {
      logger.error(
        { videosDirPath: this.videosDirPath },
        "No local video files available",
      );
      throw new Error(
        `No local video files found in ${this.videosDirPath}`,
      );
    }

    const lowerTerms = searchTerms.map((term) => term.toLowerCase());
    const matches = files.filter((file) => {
      const lowerFile = file.toLowerCase();
      return lowerTerms.some((term) => lowerFile.includes(term));
    });

    const candidates = matches.length ? matches : files;
    const file = candidates[Math.floor(Math.random() * candidates.length)];
    const { width, height } = getOrientationConfig(orientation);

    logger.debug({ file, searchTerms }, "Found local video file");

    return {
      id: file,
      url: path.join(this.videosDirPath, file),
      width,
      height,
    };
  }

  async downloadVideo(video: Video, destPath: string): Promise<void> {
    // video.url is a local filesystem path for this provider - just copy it.
    await fs.copy(video.url, destPath);
  }
}

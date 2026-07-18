import type { OrientationEnum, Video } from "../types/shorts";

export type VideoSearchQuery = {
  searchTerms: string[];
  minDurationSeconds: number;
  excludeIds?: string[];
  orientation: OrientationEnum;
  timeoutMs?: number;
};

export interface VideoProvider {
  readonly name: string;
  isAvailable(): boolean | Promise<boolean>;
  searchVideos(query: VideoSearchQuery): Promise<Video>;
  downloadVideo(video: Video, destPath: string): Promise<void>;
}

import type { OrientationEnum, Video } from "../types/shorts";

export type GenerativeVideoOptions = {
  prompt: string;
  durationSeconds: number;
  orientation: OrientationEnum;
};

export interface GenerativeVideoProvider {
  readonly name: string;
  isAvailable(): boolean | Promise<boolean>;
  generateVideo(
    options: GenerativeVideoOptions,
    destPath: string,
  ): Promise<Video>;
}

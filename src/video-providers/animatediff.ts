import fs from "fs-extra";
import path from "path";

import { ComfyUIClient } from "../image-providers/comfyui";
import { OrientationEnum, type Video } from "../types/shorts";
import type { GenerativeVideoOptions, GenerativeVideoProvider } from "./types";

const workflowFileName = "animatediff.json";

export class AnimateDiffProvider implements GenerativeVideoProvider {
  readonly name = "animatediff";
  private client?: ComfyUIClient;

  constructor(
    comfyUiUrl: string | undefined,
    private workflowsDirPath: string,
  ) {
    if (comfyUiUrl) {
      this.client = new ComfyUIClient(comfyUiUrl);
    }
  }

  private get workflowPath(): string {
    return path.join(this.workflowsDirPath, workflowFileName);
  }

  async isAvailable(): Promise<boolean> {
    if (!this.client || !fs.existsSync(this.workflowPath)) {
      return false;
    }
    return this.client.isAvailable();
  }

  async generateVideo(
    options: GenerativeVideoOptions,
    destPath: string,
  ): Promise<Video> {
    if (!this.client) {
      throw new Error(
        "COMFYUI_URL is not configured - the AnimateDiff video provider needs a running ComfyUI server",
      );
    }
    await this.client.runWorkflow(
      this.workflowPath,
      {
        Prompt: { text: options.prompt },
      },
      destPath,
    );

    const isLandscape = options.orientation === OrientationEnum.landscape;
    return {
      id: destPath,
      url: destPath,
      width: isLandscape ? 1920 : 1080,
      height: isLandscape ? 1080 : 1920,
    };
  }
}

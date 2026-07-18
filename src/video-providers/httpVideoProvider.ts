import { logger } from "../logger";
import { downloadFileFromUrl } from "../providers/utils";
import { OrientationEnum, type Video } from "../types/shorts";
import type { GenerativeVideoOptions, GenerativeVideoProvider } from "./types";

const defaultTimeoutMs = 5000;

/**
 * Generic client for a local text-to-video generation server, e.g. a
 * self-hosted LTX-Video or Wan-Video inference server. Expects:
 *   GET  {baseUrl}/health   -> 200 when ready
 *   POST {baseUrl}/generate {prompt, duration_seconds, orientation}
 *        -> { video_url, id? }
 * Adjust the request/response shape to match your server if needed.
 */
export abstract class HttpGenerativeVideoProvider
  implements GenerativeVideoProvider
{
  constructor(
    protected baseUrl: string | undefined,
    public readonly name: string,
  ) {}

  async isAvailable(): Promise<boolean> {
    if (!this.baseUrl) {
      return false;
    }
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(defaultTimeoutMs),
      });
      return res.ok;
    } catch (error: unknown) {
      logger.debug(
        { provider: this.name, error },
        "Generative video server health check failed",
      );
      return false;
    }
  }

  async generateVideo(
    options: GenerativeVideoOptions,
    destPath: string,
  ): Promise<Video> {
    if (!this.baseUrl) {
      throw new Error(`${this.name} server URL is not configured`);
    }
    logger.debug(
      { provider: this.name, prompt: options.prompt },
      "Requesting generative video",
    );
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: options.prompt,
        duration_seconds: options.durationSeconds,
        orientation: options.orientation,
      }),
    });
    if (!response.ok) {
      throw new Error(
        `${this.name} generation error: ${response.status} ${response.statusText}`,
      );
    }
    const data = (await response.json()) as { video_url?: string; id?: string };
    if (!data.video_url) {
      throw new Error(`${this.name} response did not include a video_url`);
    }
    await downloadFileFromUrl(data.video_url, destPath);

    const isLandscape = options.orientation === OrientationEnum.landscape;
    return {
      id: data.id ?? destPath,
      url: data.video_url,
      width: isLandscape ? 1920 : 1080,
      height: isLandscape ? 1080 : 1920,
    };
  }
}

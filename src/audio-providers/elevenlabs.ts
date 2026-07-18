import ffmpeg from "fluent-ffmpeg";
import fs from "fs-extra";
import os from "os";
import path from "path";
import cuid from "cuid";

import { logger } from "../logger";
import type { AudioProvider, AudioSynthesisResult } from "./types";

function probeDurationSeconds(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data.format.duration ?? 0);
    });
  });
}

export class ElevenLabsProvider implements AudioProvider {
  readonly name = "elevenlabs";

  constructor(private apiKey: string | undefined) {}

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async synthesizeSpeech(
    text: string,
    voice: string,
  ): Promise<AudioSynthesisResult> {
    if (!this.apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not set");
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      },
    );
    if (!response.ok) {
      throw new Error(
        `ElevenLabs API error: ${response.status} ${response.statusText}`,
      );
    }
    const audio = await response.arrayBuffer();

    // the API doesn't return duration - probe the mp3 via ffprobe instead
    const tempPath = path.join(os.tmpdir(), `${cuid()}.mp3`);
    await fs.writeFile(tempPath, Buffer.from(audio));
    let audioLength = 0;
    try {
      audioLength = await probeDurationSeconds(tempPath);
    } catch (error: unknown) {
      logger.warn(error, "Failed to probe ElevenLabs audio duration");
    } finally {
      await fs.remove(tempPath);
    }

    return { audio, audioLength };
  }
}

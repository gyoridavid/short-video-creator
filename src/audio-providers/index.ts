import { logger } from "../logger";
import type { Config } from "../config";
import type { Kokoro } from "../short-creator/libraries/Kokoro";
import { KokoroAudioProvider } from "./kokoro";
import { ElevenLabsProvider } from "./elevenlabs";
import type { AudioProvider, AudioSynthesisResult } from "./types";

export { KokoroAudioProvider, ElevenLabsProvider };
export type { AudioProvider, AudioSynthesisResult };

/**
 * Kokoro (local, always available) first, ElevenLabs as an opt-in API
 * enhancement. Not wired into ShortCreator yet - Kokoro is called directly
 * there today and continues to work unchanged; this manager is available for
 * the AI director / future callers that want provider selection.
 */
export class AudioProviderManager {
  private providers: AudioProvider[];

  constructor(kokoro: Kokoro, config: Config) {
    this.providers = [
      new KokoroAudioProvider(kokoro),
      new ElevenLabsProvider(config.elevenLabsApiKey),
    ];
  }

  async synthesizeSpeech(
    text: string,
    voice: string,
  ): Promise<AudioSynthesisResult> {
    for (const provider of this.providers) {
      const available = await provider.isAvailable();
      if (!available) {
        continue;
      }
      try {
        return await provider.synthesizeSpeech(text, voice);
      } catch (error: unknown) {
        logger.warn(
          { provider: provider.name, error },
          "Audio provider failed, trying next",
        );
      }
    }
    throw new Error("No audio provider is available");
  }
}

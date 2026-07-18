import type { Kokoro } from "../short-creator/libraries/Kokoro";
import type { Voices } from "../types/shorts";
import type { AudioProvider, AudioSynthesisResult } from "./types";

export class KokoroAudioProvider implements AudioProvider {
  readonly name = "kokoro";

  constructor(private kokoro: Kokoro) {}

  isAvailable(): boolean {
    // Kokoro runs locally and is initialized once at startup - always available.
    return true;
  }

  async synthesizeSpeech(
    text: string,
    voice: Voices,
  ): Promise<AudioSynthesisResult> {
    return this.kokoro.generate(text, voice);
  }
}

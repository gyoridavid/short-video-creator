export type AudioSynthesisResult = {
  audio: ArrayBuffer;
  audioLength: number;
};

export interface AudioProvider {
  readonly name: string;
  isAvailable(): boolean | Promise<boolean>;
  synthesizeSpeech(text: string, voice: string): Promise<AudioSynthesisResult>;
}

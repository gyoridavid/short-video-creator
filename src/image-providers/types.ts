export type ImageGenerateOptions = {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  loraPath?: string;
  ipAdapterImagePaths?: string[];
};

export interface ImageProvider {
  readonly name: string;
  isAvailable(): boolean | Promise<boolean>;
  /** Generates an image for the given prompt, writes it to destPath, and returns destPath. */
  generateImage(options: ImageGenerateOptions, destPath: string): Promise<string>;
}

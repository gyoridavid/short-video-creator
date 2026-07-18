import { test, expect, vi, afterEach } from "vitest";

import { VideoProviderManager } from "./index";
import { PexelsProvider } from "./pexels";
import { CoverrProvider } from "./coverr";
import { PixabayProvider } from "./pixabay";
import { LocalVideoProvider } from "./local";
import { OrientationEnum, type Video } from "../types/shorts";
import type { Config } from "../config";

afterEach(() => {
  vi.restoreAllMocks();
});

function fakeConfig(overrides: Partial<Config> = {}): Config {
  return {
    pexelsApiKey: "pexels-key",
    coverrApiKey: "coverr-key",
    pixabayApiKey: undefined,
    videoProvider: "coverr",
    localVideosDirPath: "/tmp/videos",
    ...overrides,
  } as unknown as Config;
}

const query = {
  searchTerms: ["dog"],
  minDurationSeconds: 2,
  orientation: OrientationEnum.portrait,
};

test("falls back through the chain when earlier providers fail or are unavailable", async () => {
  vi.spyOn(CoverrProvider.prototype, "isAvailable").mockReturnValue(true);
  vi.spyOn(CoverrProvider.prototype, "searchVideos").mockRejectedValue(
    new Error("coverr down"),
  );
  vi.spyOn(PixabayProvider.prototype, "isAvailable").mockReturnValue(false);
  vi.spyOn(PexelsProvider.prototype, "isAvailable").mockReturnValue(true);
  vi.spyOn(PexelsProvider.prototype, "searchVideos").mockRejectedValue(
    new Error("pexels down"),
  );
  const localVideo: Video = {
    id: "local-1",
    url: "/tmp/videos/local-1.mp4",
    width: 1080,
    height: 1920,
  };
  vi.spyOn(LocalVideoProvider.prototype, "isAvailable").mockReturnValue(true);
  vi.spyOn(LocalVideoProvider.prototype, "searchVideos").mockResolvedValue(
    localVideo,
  );

  const manager = new VideoProviderManager(fakeConfig());
  const result = await manager.findVideo(query);

  expect(result.providerName).toBe("local");
  expect(result.video).toEqual(localVideo);
});

test("throws when every provider is unavailable or fails", async () => {
  vi.spyOn(CoverrProvider.prototype, "isAvailable").mockReturnValue(false);
  vi.spyOn(PixabayProvider.prototype, "isAvailable").mockReturnValue(false);
  vi.spyOn(PexelsProvider.prototype, "isAvailable").mockReturnValue(false);
  vi.spyOn(LocalVideoProvider.prototype, "isAvailable").mockReturnValue(false);

  const manager = new VideoProviderManager(fakeConfig());
  await expect(manager.findVideo(query)).rejects.toThrow(
    /video providers failed or are unavailable/i,
  );
});

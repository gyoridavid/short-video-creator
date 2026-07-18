import { test, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import os from "os";
import path from "path";

import { LocalVideoProvider } from "./local";
import { OrientationEnum } from "../types/shorts";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "local-video-provider-"));
});

afterEach(() => {
  fs.removeSync(dir);
});

test("is unavailable when the directory is empty or missing", () => {
  const provider = new LocalVideoProvider(dir);
  expect(provider.isAvailable()).toBe(false);

  const provider2 = new LocalVideoProvider(path.join(dir, "does-not-exist"));
  expect(provider2.isAvailable()).toBe(false);
});

test("is available and finds a matching video by filename", async () => {
  fs.writeFileSync(path.join(dir, "cat-playing.mp4"), "fake video");
  fs.writeFileSync(path.join(dir, "dog-running.mp4"), "fake video");
  fs.writeFileSync(path.join(dir, "notes.txt"), "not a video");

  const provider = new LocalVideoProvider(dir);
  expect(provider.isAvailable()).toBe(true);

  const video = await provider.searchVideos({
    searchTerms: ["cat"],
    minDurationSeconds: 2,
    orientation: OrientationEnum.portrait,
  });
  expect(video.id).toBe("cat-playing.mp4");
});

test("downloadVideo copies the local file to destPath", async () => {
  fs.writeFileSync(path.join(dir, "sample.mp4"), "fake video content");
  const provider = new LocalVideoProvider(dir);
  const video = await provider.searchVideos({
    searchTerms: ["sample"],
    minDurationSeconds: 2,
    orientation: OrientationEnum.portrait,
  });

  const destPath = path.join(dir, "copied.mp4");
  await provider.downloadVideo(video, destPath);
  expect(fs.readFileSync(destPath, "utf-8")).toBe("fake video content");
});

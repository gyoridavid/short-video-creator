process.env.LOG_LEVEL = "debug";

import nock from "nock";
import { PexelsProvider } from "./pexels";
import { test, assert, expect, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import { OrientationEnum } from "../types/shorts";

afterEach(() => {
  // avoid leftover interceptors (e.g. the 30x delayed mock from "should time
  // out") bleeding into later tests and consuming their real request slot
  nock.cleanAll();
});

test("test pexels", async () => {
  const mockResponse = fs.readFileSync(
    path.resolve("__mocks__/pexels-response.json"),
    "utf-8",
  );
  nock("https://api.pexels.com")
    .get(/videos\/search/)
    .reply(200, mockResponse);
  const pexels = new PexelsProvider("asdf");
  const video = await pexels.searchVideos({
    searchTerms: ["dog"],
    minDurationSeconds: 2.4,
    orientation: OrientationEnum.portrait,
  });
  console.log(video);
  assert.isObject(video, "Video should be an object");
});

test("should time out", async () => {
  nock("https://api.pexels.com")
    .get(/videos\/search/)
    .delay(1000)
    .times(30)
    .reply(200, {});
  expect(async () => {
    const pexels = new PexelsProvider("asdf");
    await pexels.searchVideos({
      searchTerms: ["dog"],
      minDurationSeconds: 2.4,
      orientation: OrientationEnum.portrait,
      timeoutMs: 100,
    });
  }).rejects.toThrow(
    expect.objectContaining({
      name: "TimeoutError",
    }),
  );
});

test("should retry 3 times", async () => {
  nock("https://api.pexels.com")
    .get(/videos\/search/)
    .delay(1000)
    .times(2)
    .reply(200, {});
  const mockResponse = fs.readFileSync(
    path.resolve("__mocks__/pexels-response.json"),
    "utf-8",
  );
  nock("https://api.pexels.com")
    .get(/videos\/search/)
    .reply(200, mockResponse);

  const pexels = new PexelsProvider("asdf");
  const video = await pexels.searchVideos({
    searchTerms: ["dog"],
    minDurationSeconds: 2.4,
    orientation: OrientationEnum.portrait,
  });
  console.log(video);
  assert.isObject(video, "Video should be an object");
}, 10000);

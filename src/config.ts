import path from "path";
import "dotenv/config";
import os from "os";
import fs from "fs-extra";
import pino from "pino";
import { kokoroModelPrecision, whisperModels } from "./types/shorts";
import { ProjectTypeEnum } from "./types/filmmaking";

const defaultLogLevel: pino.Level = "info";
const defaultPort = 3123;
const defaultVideoProvider = "pexels";
const defaultProjectType = ProjectTypeEnum.shorts;
const whisperVersion = "1.7.1";
const defaultWhisperModel: whisperModels = "medium.en"; // possible options: "tiny", "tiny.en", "base", "base.en", "small", "small.en", "medium", "medium.en", "large-v1", "large-v2", "large-v3", "large-v3-turbo"

// Create the global logger
const versionNumber = process.env.npm_package_version;
export const logger = pino({
  level: process.env.LOG_LEVEL || defaultLogLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  base: {
    pid: process.pid,
    version: versionNumber,
  },
});

export class Config {
  private dataDirPath: string;
  private libsDirPath: string;
  private staticDirPath: string;

  public installationSuccessfulPath: string;
  public whisperInstallPath: string;
  public videosDirPath: string;
  public tempDirPath: string;
  public packageDirPath: string;
  public musicDirPath: string;
  public pexelsApiKey?: string;
  public coverrApiKey?: string;
  public pixabayApiKey?: string;
  public videoProvider: string;
  public localVideosDirPath: string;

  // AI filmmaking platform (all optional)
  public projectType: ProjectTypeEnum;
  public comfyUiUrl?: string;
  public comfyWorkflowsDirPath: string;
  public ltxVideoUrl?: string;
  public wanVideoUrl?: string;
  public ollamaUrl?: string;
  public elevenLabsApiKey?: string;
  public characterStoreDirPath: string;

  public logLevel: pino.Level;
  public whisperVerbose: boolean;
  public port: number;
  public runningInDocker: boolean;
  public devMode: boolean;
  public whisperVersion: string = whisperVersion;
  public whisperModel: whisperModels = defaultWhisperModel;
  public kokoroModelPrecision: kokoroModelPrecision = "fp32";

  // docker-specific, performance-related settings to prevent memory issues
  public concurrency?: number;
  public videoCacheSizeInBytes: number | null = null;

  constructor() {
    this.dataDirPath =
      process.env.DATA_DIR_PATH ||
      path.join(os.homedir(), ".ai-agents-az-video-generator");
    this.libsDirPath = path.join(this.dataDirPath, "libs");

    this.whisperInstallPath = path.join(this.libsDirPath, "whisper");
    this.videosDirPath = path.join(this.dataDirPath, "videos");
    this.tempDirPath = path.join(this.dataDirPath, "temp");
    this.installationSuccessfulPath = path.join(
      this.dataDirPath,
      "installation-successful",
    );

    fs.ensureDirSync(this.dataDirPath);
    fs.ensureDirSync(this.libsDirPath);
    fs.ensureDirSync(this.videosDirPath);
    fs.ensureDirSync(this.tempDirPath);

    this.packageDirPath = path.join(__dirname, "..");
    this.staticDirPath = path.join(this.packageDirPath, "static");
    this.musicDirPath = path.join(this.staticDirPath, "music");

    this.pexelsApiKey = process.env.PEXELS_API_KEY || undefined;
    this.coverrApiKey = process.env.COVERR_API_KEY || undefined;
    this.pixabayApiKey = process.env.PIXABAY_API_KEY || undefined;
    this.videoProvider = process.env.VIDEO_PROVIDER || defaultVideoProvider;
    this.localVideosDirPath =
      process.env.LOCAL_VIDEOS_DIR || path.join(process.cwd(), "assets", "videos");

    this.projectType =
      (process.env.PROJECT_TYPE as ProjectTypeEnum) || defaultProjectType;
    this.comfyUiUrl = process.env.COMFYUI_URL || undefined;
    this.comfyWorkflowsDirPath =
      process.env.COMFY_WORKFLOWS_DIR ||
      path.join(process.cwd(), "assets", "workflows");
    this.ltxVideoUrl = process.env.LTX_VIDEO_URL || undefined;
    this.wanVideoUrl = process.env.WAN_VIDEO_URL || undefined;
    this.ollamaUrl = process.env.OLLAMA_URL || undefined;
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || undefined;
    this.characterStoreDirPath = path.join(this.dataDirPath, "characters");
    fs.ensureDirSync(this.characterStoreDirPath);

    this.logLevel = (process.env.LOG_LEVEL || defaultLogLevel) as pino.Level;
    this.whisperVerbose = process.env.WHISPER_VERBOSE === "true";
    this.port = process.env.PORT ? parseInt(process.env.PORT) : defaultPort;
    this.runningInDocker = process.env.DOCKER === "true";
    this.devMode = process.env.DEV === "true";

    if (process.env.WHISPER_MODEL) {
      this.whisperModel = process.env.WHISPER_MODEL as whisperModels;
    }
    if (process.env.KOKORO_MODEL_PRECISION) {
      this.kokoroModelPrecision = process.env
        .KOKORO_MODEL_PRECISION as kokoroModelPrecision;
    }

    this.concurrency = process.env.CONCURRENCY
      ? parseInt(process.env.CONCURRENCY)
      : undefined;

    if (process.env.VIDEO_CACHE_SIZE_IN_BYTES) {
      this.videoCacheSizeInBytes = parseInt(
        process.env.VIDEO_CACHE_SIZE_IN_BYTES,
      );
    }
  }

  public ensureConfig() {
    if (!this.pexelsApiKey) {
      logger.warn(
        "PEXELS_API_KEY is not set - the Pexels video provider will be skipped. Get a free key: https://www.pexels.com/api/key/",
      );
    }
    if (!this.coverrApiKey) {
      logger.warn(
        "COVERR_API_KEY is not set - the Coverr video provider will be skipped.",
      );
    }
    if (!this.pixabayApiKey) {
      logger.warn(
        "PIXABAY_API_KEY is not set - the Pixabay video provider will be skipped.",
      );
    }

    const hasLocalVideos =
      fs.existsSync(this.localVideosDirPath) &&
      fs.readdirSync(this.localVideosDirPath).length > 0;
    if (!hasLocalVideos) {
      logger.warn(
        { localVideosDirPath: this.localVideosDirPath },
        "No local video files found - the local video provider will be skipped.",
      );
    }

    if (
      !this.pexelsApiKey &&
      !this.coverrApiKey &&
      !this.pixabayApiKey &&
      !hasLocalVideos
    ) {
      throw new Error(
        "No video provider is configured. Set at least one of COVERR_API_KEY, PIXABAY_API_KEY, " +
          "PEXELS_API_KEY, or add video files to LOCAL_VIDEOS_DIR (default ./assets/videos) - " +
          "see how to run the project: https://github.com/gyoridavid/short-video-maker",
      );
    }
  }
}

export const KOKORO_MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import z from "zod";

import { ShortCreator } from "../../short-creator/ShortCreator";
import { logger } from "../../logger";
import { renderConfig, sceneInput } from "../../types/shorts";
import {
  createAiFilmInput,
  createCharacterInput,
  generateScriptInput,
} from "../../types/filmmaking";
import type { CharacterStore } from "../../character-manager/CharacterStore";
import type { StoryEngine } from "../../story-engine";
import type { AIDirector } from "../../ai-director";

export class MCPRouter {
  router: express.Router;
  shortCreator: ShortCreator;
  transports: { [sessionId: string]: SSEServerTransport } = {};
  mcpServer: McpServer;
  constructor(
    shortCreator: ShortCreator,
    private characterStore: CharacterStore,
    private storyEngine: StoryEngine,
    private aiDirector: AIDirector,
  ) {
    this.router = express.Router();
    this.shortCreator = shortCreator;

    this.mcpServer = new McpServer({
      name: "Short Creator",
      version: "0.0.1",
      capabilities: {
        resources: {},
        tools: {},
      },
    });

    this.setupMCPServer();
    this.setupRoutes();
  }

  private setupMCPServer() {
    this.mcpServer.tool(
      "get-video-status",
      "Get the status of a video (ready, processing, failed)",
      {
        videoId: z.string().describe("The ID of the video"),
      },
      async ({ videoId }) => {
        const status = this.shortCreator.status(videoId);
        return {
          content: [
            {
              type: "text",
              text: status,
            },
          ],
        };
      },
    );

    this.mcpServer.tool(
      "create-short-video",
      "Create a short video from a list of scenes",
      {
        scenes: z.array(sceneInput).describe("Each scene to be created"),
        config: renderConfig.describe("Configuration for rendering the video"),
      },
      async ({ scenes, config }) => {
        const videoId = await this.shortCreator.addToQueue(scenes, config);

        return {
          content: [
            {
              type: "text",
              text: videoId,
            },
          ],
        };
      },
    );

    this.mcpServer.tool(
      "create-character",
      "Create a character bible (name, description, reference images) so the same character can be kept consistent across scenes",
      createCharacterInput.shape,
      async (input) => {
        const character = this.characterStore.create(input);
        return {
          content: [
            {
              type: "text",
              text: character.id,
            },
          ],
        };
      },
    );

    this.mcpServer.tool(
      "generate-script",
      "Generate a script (scenes with narration and visual descriptions) from a film idea, without rendering it",
      generateScriptInput.shape,
      async ({ idea }) => {
        const script = await this.storyEngine.generateScript(idea);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(script),
            },
          ],
        };
      },
    );

    this.mcpServer.tool(
      "create-ai-film",
      "Generate a script from an idea and render it end-to-end (idea -> script -> storyboard -> video). Poll with get-video-status",
      createAiFilmInput.shape,
      async ({ idea, characterIds, config }) => {
        const videoId = await this.aiDirector.createFilm(
          idea,
          characterIds ?? [],
          config ?? {},
        );
        return {
          content: [
            {
              type: "text",
              text: videoId,
            },
          ],
        };
      },
    );
  }

  private setupRoutes() {
    this.router.get("/sse", async (req, res) => {
      logger.info("SSE GET request received");

      const transport = new SSEServerTransport("/mcp/messages", res);
      this.transports[transport.sessionId] = transport;
      res.on("close", () => {
        delete this.transports[transport.sessionId];
      });
      await this.mcpServer.connect(transport);
    });

    this.router.post("/messages", async (req, res) => {
      logger.info("SSE POST request received");

      const sessionId = req.query.sessionId as string;
      const transport = this.transports[sessionId];
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        res.status(400).send("No transport found for sessionId");
      }
    });
  }
}

import { logger } from "../logger";
import type { Config } from "../config";
import type { ShortCreator } from "../short-creator/ShortCreator";
import { StoryEngine } from "../story-engine";
import { StoryboardBuilder } from "../storyboard";
import type { CharacterStore } from "../character-manager/CharacterStore";
import type { CharacterBible } from "../character-manager/CharacterBible";
import type { FilmIdea } from "../types/filmmaking";
import type { RenderConfig } from "../types/shorts";

/**
 * Orchestrates Idea -> Script -> Characters -> Storyboard -> Render, ending
 * with the same shortCreator.addToQueue call MCP's create-short-video tool
 * uses today - the actual rendering pipeline (Remotion/Whisper/Kokoro/
 * FFmpeg) is untouched.
 */
export class AIDirector {
  private storyEngine: StoryEngine;
  private storyboardBuilder = new StoryboardBuilder();

  constructor(
    config: Config,
    private shortCreator: ShortCreator,
    private characterStore: CharacterStore,
  ) {
    this.storyEngine = new StoryEngine(config);
  }

  async createFilm(
    idea: FilmIdea,
    characterIds: string[] = [],
    renderConfig: RenderConfig = {},
  ): Promise<string> {
    logger.debug({ idea, characterIds }, "AI director: generating script");
    const script = await this.storyEngine.generateScript(idea);

    const characters: CharacterBible[] = characterIds
      .map((id) => this.characterStore.get(id))
      .filter((character): character is CharacterBible => !!character);

    const sceneInputs = this.storyboardBuilder.build(script, characters);

    const videoId = this.shortCreator.addToQueue(sceneInputs, renderConfig);
    logger.debug({ videoId }, "AI director: queued film for rendering");
    return videoId;
  }
}

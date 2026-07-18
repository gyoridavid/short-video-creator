import type { Script } from "../story-engine";
import type { CharacterBible } from "../character-manager/CharacterBible";
import type { StoryboardEntry } from "../types/filmmaking";

/**
 * Compiles a Script (+ optional characters) down to StoryboardEntry[], which
 * is structurally a SceneInput[] with extra optional fields - so it can be
 * passed straight into the existing ShortCreator.addToQueue/createShort
 * pipeline without any changes there.
 */
export class StoryboardBuilder {
  build(script: Script, characters: CharacterBible[] = []): StoryboardEntry[] {
    const charactersById = new Map(characters.map((c) => [c.id, c]));

    return script.scenes.map((scene) => {
      const characterIds = scene.characterIds?.filter((id) =>
        charactersById.has(id),
      );

      return {
        text: scene.narration,
        searchTerms: scene.searchTerms,
        imagePrompt: scene.visualDescription,
        ...(characterIds?.length ? { characterIds } : {}),
      };
    });
  }
}

import z from "zod";
import { sceneInput, renderConfig } from "./shorts";

export enum ProjectTypeEnum {
  shortFilm = "short-film",
  documentary = "documentary",
  shorts = "shorts",
  commercial = "commercial",
}

export const filmIdea = z.object({
  prompt: z
    .string()
    .describe("A short description of the film/video idea to expand into a script"),
  projectType: z
    .nativeEnum(ProjectTypeEnum)
    .optional()
    .describe("The type of project being created, default is shorts"),
  title: z.string().optional().describe("Optional working title"),
});
export type FilmIdea = z.infer<typeof filmIdea>;

export type ScriptScene = {
  heading: string;
  narration: string;
  visualDescription: string;
  searchTerms: string[];
  characterIds?: string[];
};

export type Script = {
  title: string;
  projectType: ProjectTypeEnum;
  logline: string;
  scenes: ScriptScene[];
};

export const characterBible = z.object({
  id: z.string(),
  name: z.string(),
  description: z
    .string()
    .describe(
      "A short description of the character's appearance and personality, used to keep them consistent across scenes",
    ),
  visualTraits: z.array(z.string()).default([]),
  referenceImagePaths: z.array(z.string()).default([]),
  loraPath: z
    .string()
    .optional()
    .describe("Path to a LoRA weights file for this character, if any"),
  ipAdapterImagePaths: z
    .array(z.string())
    .optional()
    .describe("Reference images to use as IP-Adapter input for this character, if any"),
});
export type CharacterBible = z.infer<typeof characterBible>;

export const createCharacterInput = characterBible.omit({ id: true });
export type CreateCharacterInput = z.infer<typeof createCharacterInput>;

export type StoryboardEntry = z.infer<typeof sceneInput> & {
  imagePrompt?: string;
  characterIds?: string[];
  shotType?: string;
};

export const generateScriptInput = z.object({
  idea: filmIdea,
});
export type GenerateScriptInput = z.infer<typeof generateScriptInput>;

export const createAiFilmInput = z.object({
  idea: filmIdea,
  characterIds: z
    .array(z.string())
    .optional()
    .describe("Existing character IDs (from create-character) to feature in the film"),
  config: renderConfig.optional().describe("Rendering configuration, same as create-short-video"),
});
export type CreateAiFilmInput = z.infer<typeof createAiFilmInput>;

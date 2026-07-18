import { ProjectTypeEnum, type FilmIdea, type Script, type ScriptScene } from "./types";

const scenesByProjectType: Record<ProjectTypeEnum, number> = {
  [ProjectTypeEnum.shorts]: 4,
  [ProjectTypeEnum.commercial]: 3,
  [ProjectTypeEnum.shortFilm]: 8,
  [ProjectTypeEnum.documentary]: 6,
};

const beatTemplates = [
  "Introduce the scene and set the mood",
  "Establish the main subject",
  "Build tension or interest",
  "Reveal a key detail",
  "Develop the idea further",
  "Show the turning point",
  "Bring the story to its climax",
  "Resolve and close out",
];

const stopWords = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "with", "for",
  "to", "is", "are", "this", "that", "it", "as", "at", "by", "be",
]);

function extractKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stopWords.has(word)),
    ),
  );
}

/**
 * Zero-dependency, deterministic idea -> scene splitter. Works with no API
 * keys or local models configured - the baseline the AI director always
 * falls back to.
 */
export function generateScriptWithTemplate(idea: FilmIdea): Script {
  const projectType = idea.projectType ?? ProjectTypeEnum.shorts;
  const sceneCount = scenesByProjectType[projectType];
  const keywords = extractKeywords(idea.prompt);
  const title = idea.title ?? idea.prompt.slice(0, 60);

  const scenes: ScriptScene[] = Array.from({ length: sceneCount }, (_, i) => {
    const beat = beatTemplates[i % beatTemplates.length];
    const sceneKeywords = keywords.length
      ? [keywords[i % keywords.length], ...keywords.slice(0, 2)]
      : [idea.prompt.split(/\s+/)[0] || "abstract"];

    return {
      heading: `Scene ${i + 1}`,
      narration: `${beat}: ${idea.prompt}.`,
      visualDescription: `${idea.prompt} - ${beat.toLowerCase()}`,
      searchTerms: Array.from(new Set(sceneKeywords)),
    };
  });

  return {
    title,
    projectType,
    logline: idea.prompt,
    scenes,
  };
}

import fs from "fs-extra";
import path from "path";
import cuid from "cuid";

import { logger } from "../logger";
import {
  characterBible,
  type CharacterBible,
  type CreateCharacterInput,
} from "./CharacterBible";

export class CharacterStore {
  constructor(private storeDirPath: string) {
    fs.ensureDirSync(this.storeDirPath);
  }

  private filePath(id: string): string {
    return path.join(this.storeDirPath, `${id}.json`);
  }

  create(input: CreateCharacterInput): CharacterBible {
    const character = characterBible.parse({ ...input, id: cuid() });
    fs.writeJsonSync(this.filePath(character.id), character, { spaces: 2 });
    logger.debug({ characterId: character.id }, "Created character bible");
    return character;
  }

  get(id: string): CharacterBible | undefined {
    const filePath = this.filePath(id);
    if (!fs.existsSync(filePath)) {
      return undefined;
    }
    return characterBible.parse(fs.readJsonSync(filePath));
  }

  list(): CharacterBible[] {
    if (!fs.existsSync(this.storeDirPath)) {
      return [];
    }
    return fs
      .readdirSync(this.storeDirPath)
      .filter((file) => file.endsWith(".json"))
      .map((file) =>
        characterBible.parse(fs.readJsonSync(path.join(this.storeDirPath, file))),
      );
  }

  update(id: string, updates: Partial<CreateCharacterInput>): CharacterBible {
    const existing = this.get(id);
    if (!existing) {
      throw new Error(`Character not found: ${id}`);
    }
    const updated = characterBible.parse({ ...existing, ...updates, id });
    fs.writeJsonSync(this.filePath(id), updated, { spaces: 2 });
    return updated;
  }

  delete(id: string): void {
    fs.removeSync(this.filePath(id));
  }
}

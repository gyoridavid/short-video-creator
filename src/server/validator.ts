import { createShortInput, CreateShortInput } from "../types/shorts";
import {
  createCharacterInput,
  CreateCharacterInput,
} from "../types/filmmaking";
import { logger } from "../logger";
import { ZodError } from "zod";

export interface ValidationErrorResult {
  message: string;
  missingFields: Record<string, string>;
}

export function validateCreateShortInput(input: object): CreateShortInput {
  const validated = createShortInput.safeParse(input);
  logger.info({ validated }, "Validated input");

  if (validated.success) {
    return validated.data;
  }

  // Process the validation errors
  const errorResult = formatZodError(validated.error);

  throw new Error(
    JSON.stringify({
      message: errorResult.message,
      missingFields: errorResult.missingFields,
    }),
  );
}

export function validateCreateCharacterInput(
  input: object,
): CreateCharacterInput {
  const validated = createCharacterInput.safeParse(input);

  if (validated.success) {
    return validated.data;
  }

  const errorResult = formatZodError(validated.error);

  throw new Error(
    JSON.stringify({
      message: errorResult.message,
      missingFields: errorResult.missingFields,
    }),
  );
}

function formatZodError(error: ZodError): ValidationErrorResult {
  const missingFields: Record<string, string> = {};

  // Extract all the errors into a human-readable format
  error.errors.forEach((err) => {
    const path = err.path.join(".");
    missingFields[path] = err.message;
  });

  // Create a human-readable message
  const errorPaths = Object.keys(missingFields);
  let message = `Validation failed for ${errorPaths.length} field(s): `;
  message += errorPaths.join(", ");

  return {
    message,
    missingFields,
  };
}

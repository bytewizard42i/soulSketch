import { getMemoryPackFileOrder, type MemoryPackFileName } from './continuity.js';

export type MemoryPackValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  filesChecked: number;
};

/**
 * Validate the CONTENTS of a 5-file memory pack, given the file texts.
 * This is deliberately pure (no filesystem access) so it can run anywhere:
 * the CLI, the MCP server, tests, or a browser.
 *
 * Files that are missing from the input map are reported as errors, so
 * callers can pass a partial map straight from a directory read.
 */
export function validateMemoryPackContents(
  files: Partial<Record<MemoryPackFileName, string>>
): MemoryPackValidationResult {
  const result: MemoryPackValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    filesChecked: 0
  };

  for (const fileName of getMemoryPackFileOrder()) {
    const content = files[fileName];
    if (content === undefined) {
      result.valid = false;
      result.errors.push(`Missing required file: ${fileName}`);
      continue;
    }

    result.filesChecked++;

    if (content.trim().length === 0) {
      result.valid = false;
      result.errors.push(`${fileName} is empty`);
    }

    if (fileName.endsWith('.md') && !content.includes('#')) {
      result.warnings.push(`${fileName} has no Markdown heading`);
    }

    if (fileName === 'runtime_observations.jsonl') {
      validateRuntimeObservationLines(content, result);
    }
  }

  return result;
}

function validateRuntimeObservationLines(
  content: string,
  result: MemoryPackValidationResult
): void {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    result.warnings.push('runtime_observations.jsonl has no observations yet');
    return;
  }

  lines.forEach((line, index) => {
    try {
      const observation = JSON.parse(line);
      if (!observation.date && !observation.timestamp) {
        result.warnings.push(
          `runtime_observations.jsonl line ${index + 1} has no date or timestamp`
        );
      }
      if (!observation.note && !observation.observation && !observation.content) {
        result.warnings.push(
          `runtime_observations.jsonl line ${index + 1} has no note-like field`
        );
      }
    } catch {
      result.valid = false;
      result.errors.push(`runtime_observations.jsonl line ${index + 1} is invalid JSON`);
    }
  });
}

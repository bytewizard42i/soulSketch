import { readFile, appendFile, stat } from 'node:fs/promises';
import * as path from 'node:path';
import {
  getMemoryPackFileOrder,
  type MemoryPackFileName,
  type MemoryPackFiles
} from '@soulsketch/core';

/**
 * Trust boundary: the server only touches memory packs under explicitly
 * allowed root directories. Roots come from the SOULSKETCH_ALLOWED_ROOTS
 * environment variable (colon-separated absolute paths); if unset, only the
 * server's working directory is allowed.
 */
export function resolveAllowedRoots(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = env.SOULSKETCH_ALLOWED_ROOTS;
  if (!configured) return [process.cwd()];
  return configured
    .split(':')
    .map((root) => root.trim())
    .filter(Boolean)
    .map((root) => path.resolve(root));
}

export function assertInsideAllowedRoots(packDirectory: string, allowedRoots: string[]): string {
  const resolved = path.resolve(packDirectory);
  const isAllowed = allowedRoots.some((root) => {
    const relative = path.relative(root, resolved);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  });
  if (!isAllowed) {
    throw new Error(
      `Access denied: ${resolved} is outside the allowed roots (${allowedRoots.join(', ')}). ` +
        `Set SOULSKETCH_ALLOWED_ROOTS to grant access.`
    );
  }
  return resolved;
}

/**
 * Load the 5 canonical files from a pack directory. Returns whatever exists;
 * validation decides how to report missing files.
 */
export async function loadMemoryPackFiles(
  packDirectory: string
): Promise<Partial<Record<MemoryPackFileName, string>>> {
  const stats = await stat(packDirectory).catch(() => null);
  if (!stats || !stats.isDirectory()) {
    throw new Error(`Not a memory pack directory: ${packDirectory}`);
  }

  const files: Partial<Record<MemoryPackFileName, string>> = {};
  for (const fileName of getMemoryPackFileOrder()) {
    try {
      files[fileName] = await readFile(path.join(packDirectory, fileName), 'utf8');
    } catch {
      // Missing file: leave undefined so validation reports it.
    }
  }
  return files;
}

export function requireCompletePack(
  files: Partial<Record<MemoryPackFileName, string>>,
  packDirectory: string
): MemoryPackFiles {
  const missing = getMemoryPackFileOrder().filter((fileName) => files[fileName] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `${packDirectory} is missing required memory pack files: ${missing.join(', ')}`
    );
  }
  return files as MemoryPackFiles;
}

/**
 * The ONLY write operation this server performs: appending a single
 * observation line to runtime_observations.jsonl. Existing lines are never
 * modified or deleted - the observation log is append-only by design.
 */
export async function appendRuntimeObservation(params: {
  packDirectory: string;
  note: string;
  author?: string;
}): Promise<string> {
  const observationsPath = path.join(params.packDirectory, 'runtime_observations.jsonl');
  const existing = await stat(observationsPath).catch(() => null);
  if (!existing || !existing.isFile()) {
    throw new Error(
      `${observationsPath} does not exist; refusing to create a new observations file implicitly.`
    );
  }

  const observation: Record<string, string> = {
    date: new Date().toISOString().slice(0, 10),
    note: params.note
  };
  if (params.author) observation.author = params.author;

  const line = JSON.stringify(observation);
  const existingContent = await readFile(observationsPath, 'utf8');
  const needsLeadingNewline = existingContent.length > 0 && !existingContent.endsWith('\n');
  await appendFile(observationsPath, (needsLeadingNewline ? '\n' : '') + line + '\n');
  return line;
}

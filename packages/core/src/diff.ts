import {
  computeMemoryPackFingerprint,
  getMemoryPackFileOrder,
  type MemoryPackFileName,
  type MemoryPackFiles
} from './continuity.js';

/** Human-readable identity dimension for each of the 5 memory pack files. */
export const memoryPackDimensionLabels: Record<MemoryPackFileName, string> = {
  'persona.md': 'Persona (core identity)',
  'relationship_dynamics.md': 'Relationships',
  'technical_domains.md': 'Technical domains',
  'stylistic_voice.md': 'Stylistic voice',
  'runtime_observations.jsonl': 'Runtime observations'
};

export type MemoryPackFileDiff = {
  file: MemoryPackFileName;
  dimension: string;
  changed: boolean;
  hashA: string;
  hashB: string;
  lineCountA: number;
  lineCountB: number;
  lineDelta: number;
};

export type MemoryPackDiffReport = {
  identical: boolean;
  fingerprintA: string;
  fingerprintB: string;
  changedDimensions: string[];
  files: MemoryPackFileDiff[];
};

/**
 * Compare two memory packs per identity dimension.
 * Uses the same normalized hashing as the pack fingerprint, so a CRLF/LF
 * difference between machines does NOT count as an identity change.
 */
export function diffMemoryPacks(
  packAFiles: MemoryPackFiles,
  packBFiles: MemoryPackFiles
): MemoryPackDiffReport {
  const resultA = computeMemoryPackFingerprint(packAFiles);
  const resultB = computeMemoryPackFingerprint(packBFiles);

  const files: MemoryPackFileDiff[] = getMemoryPackFileOrder().map((fileName) => {
    const lineCountA = countContentLines(packAFiles[fileName]);
    const lineCountB = countContentLines(packBFiles[fileName]);
    return {
      file: fileName,
      dimension: memoryPackDimensionLabels[fileName],
      changed: resultA.fileHashes[fileName] !== resultB.fileHashes[fileName],
      hashA: resultA.fileHashes[fileName],
      hashB: resultB.fileHashes[fileName],
      lineCountA,
      lineCountB,
      lineDelta: lineCountB - lineCountA
    };
  });

  return {
    identical: resultA.fingerprint === resultB.fingerprint,
    fingerprintA: resultA.fingerprint,
    fingerprintB: resultB.fingerprint,
    changedDimensions: files.filter((file) => file.changed).map((file) => file.dimension),
    files
  };
}

function countContentLines(content: string): number {
  return content.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

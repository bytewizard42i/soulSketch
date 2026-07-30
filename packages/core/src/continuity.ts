import { createHash } from 'crypto';

export type MemoryPackFileName =
  | 'persona.md'
  | 'relationship_dynamics.md'
  | 'technical_domains.md'
  | 'stylistic_voice.md'
  | 'runtime_observations.jsonl';

export type MemoryPackFiles = Record<MemoryPackFileName, string>;

export type MemoryProvenanceSource =
  | 'human-authored'
  | 'ai-assisted'
  | 'tool-generated'
  | 'imported'
  | 'unknown';

export type MemoryAuthorityLevel =
  | 'canonical'
  | 'working'
  | 'archived'
  | 'untrusted';

export type MemoryTrustLabel =
  | 'public-template'
  | 'private-state'
  | 'sanitized-example'
  | 'sensitive'
  | 'unknown';

export type MemoryPackProvenance = {
  source: MemoryProvenanceSource;
  authority: MemoryAuthorityLevel;
  trustLabel: MemoryTrustLabel;
  repo?: string;
  commit?: string;
  createdBy?: string;
  lastReviewedAt?: string;
};

export type MemoryPackContinuityRecord = {
  protocolVersion: string;
  fingerprint: string;
  fileHashes: Record<MemoryPackFileName, string>;
  provenance: MemoryPackProvenance;
  warnings: string[];
};

const orderedMemoryPackFiles: MemoryPackFileName[] = [
  'persona.md',
  'relationship_dynamics.md',
  'technical_domains.md',
  'stylistic_voice.md',
  'runtime_observations.jsonl'
];

/**
 * Build a stable SHA-256 digest from text after normalizing line endings.
 * SoulSketch memory files are meant to move across Windows, WSL, Linux, and
 * cloud systems, so CRLF vs LF should not change identity continuity.
 */
export function hashPortableText(content: string): string {
  return createHash('sha256')
    .update(content.replace(/\r\n/g, '\n'), 'utf8')
    .digest('hex');
}

/**
 * Compute a deterministic fingerprint for the complete 5-file memory pack.
 * The fingerprint is not a secret and does not reveal file contents by itself.
 * It is meant for audit logs, Git tags, and handoff records that need to refer
 * to a specific memory state. DID and ZK-proof anchoring are planned
 * integrations (future use, not yet implemented).
 */
export function computeMemoryPackFingerprint(memoryPackFiles: MemoryPackFiles): {
  fingerprint: string;
  fileHashes: Record<MemoryPackFileName, string>;
} {
  const fileHashes = orderedMemoryPackFiles.reduce(
    (hashes, fileName) => {
      hashes[fileName] = hashPortableText(memoryPackFiles[fileName]);
      return hashes;
    },
    {} as Record<MemoryPackFileName, string>
  );

  const fingerprintMaterial = orderedMemoryPackFiles
    .map((fileName) => `${fileName}:${fileHashes[fileName]}`)
    .join('\n');

  return {
    fingerprint: hashPortableText(fingerprintMaterial),
    fileHashes
  };
}

/**
 * Capture the minimum audit facts needed to tell whether a memory pack should
 * be treated as a source of truth, a working draft, an archived reference, or
 * untrusted imported material.
 */
export function createContinuityRecord(params: {
  memoryPackFiles: MemoryPackFiles;
  provenance: MemoryPackProvenance;
  protocolVersion?: string;
}): MemoryPackContinuityRecord {
  const { fingerprint, fileHashes } = computeMemoryPackFingerprint(params.memoryPackFiles);
  const warnings = assessProvenanceWarnings(params.provenance);

  return {
    protocolVersion: params.protocolVersion ?? '1.2.0',
    fingerprint,
    fileHashes,
    provenance: params.provenance,
    warnings
  };
}

export function assessProvenanceWarnings(provenance: MemoryPackProvenance): string[] {
  const warnings: string[] = [];

  if (provenance.authority === 'canonical' && !provenance.repo) {
    warnings.push('Canonical memory packs should identify the repository that owns the state.');
  }

  if (provenance.authority === 'canonical' && !provenance.commit) {
    warnings.push('Canonical memory packs should include the Git commit used for the fingerprint.');
  }

  if (provenance.trustLabel === 'public-template' && provenance.authority === 'canonical') {
    warnings.push('Public templates should not be treated as canonical private memory state.');
  }

  if (provenance.trustLabel === 'sensitive' && provenance.source === 'unknown') {
    warnings.push('Sensitive memory with unknown provenance should be reviewed before use.');
  }

  if (provenance.authority === 'untrusted' && provenance.trustLabel !== 'unknown') {
    warnings.push('Untrusted memory should keep an unknown trust label until reviewed.');
  }

  return warnings;
}

export function getMemoryPackFileOrder(): MemoryPackFileName[] {
  return [...orderedMemoryPackFiles];
}

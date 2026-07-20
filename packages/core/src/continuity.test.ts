import { describe, expect, it } from 'vitest';
import {
  assessProvenanceWarnings,
  computeMemoryPackFingerprint,
  createContinuityRecord,
  type MemoryPackFiles
} from './continuity.js';

const referenceMemoryPackFiles: MemoryPackFiles = {
  'persona.md': '# Persona\nA practical assistant.\n',
  'relationship_dynamics.md': '# Relationships\nWorks with John as a collaborator.\n',
  'technical_domains.md': '# Technical Domains\nTypeScript, Git, and portable memory packs.\n',
  'stylistic_voice.md': '# Stylistic Voice\nClear, warm, and direct.\n',
  'runtime_observations.jsonl': '{"date":"2026-07-20T12:00:00Z","note":"Initialized test pack"}\n'
};

describe('SoulSketch continuity records', () => {
  it('creates stable fingerprints across Windows and Unix line endings', () => {
    const windowsLineEndingPack: MemoryPackFiles = {
      ...referenceMemoryPackFiles,
      'persona.md': referenceMemoryPackFiles['persona.md'].replace(/\n/g, '\r\n')
    };

    const unixFingerprint = computeMemoryPackFingerprint(referenceMemoryPackFiles);
    const windowsFingerprint = computeMemoryPackFingerprint(windowsLineEndingPack);

    expect(windowsFingerprint.fingerprint).toBe(unixFingerprint.fingerprint);
    expect(windowsFingerprint.fileHashes['persona.md']).toBe(
      unixFingerprint.fileHashes['persona.md']
    );
  });

  it('changes the fingerprint when a memory artifact changes', () => {
    const changedPack: MemoryPackFiles = {
      ...referenceMemoryPackFiles,
      'runtime_observations.jsonl':
        referenceMemoryPackFiles['runtime_observations.jsonl'] +
        '{"date":"2026-07-20T12:30:00Z","note":"Added a second observation"}\n'
    };

    expect(computeMemoryPackFingerprint(changedPack).fingerprint).not.toBe(
      computeMemoryPackFingerprint(referenceMemoryPackFiles).fingerprint
    );
  });

  it('records provenance warnings for incomplete canonical state', () => {
    const continuityRecord = createContinuityRecord({
      memoryPackFiles: referenceMemoryPackFiles,
      provenance: {
        source: 'ai-assisted',
        authority: 'canonical',
        trustLabel: 'private-state',
        createdBy: 'John and the Ai family'
      }
    });

    expect(continuityRecord.protocolVersion).toBe('1.2.0');
    expect(continuityRecord.warnings).toContain(
      'Canonical memory packs should identify the repository that owns the state.'
    );
    expect(continuityRecord.warnings).toContain(
      'Canonical memory packs should include the Git commit used for the fingerprint.'
    );
  });

  it('flags public templates that are accidentally treated as canonical private state', () => {
    expect(
      assessProvenanceWarnings({
        source: 'human-authored',
        authority: 'canonical',
        trustLabel: 'public-template',
        repo: 'bytewizard42i/SoulSketch',
        commit: 'abc123'
      })
    ).toContain('Public templates should not be treated as canonical private memory state.');
  });
});

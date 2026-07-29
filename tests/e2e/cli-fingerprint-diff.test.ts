/**
 * End-to-End Tests for the `soulsketch fingerprint` and `soulsketch diff`
 * CLI commands (ROADMAP Phase 2).
 *
 * These tests exercise the real CLI as a child process, exactly the way a
 * user would run it, against the sanitized reference memory pack.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const repoRoot = path.join(__dirname, '../..');
const cliPath = path.join(repoRoot, 'cli/soulsketch-cli.ts');
const referencePackPath = path.join(repoRoot, 'examples/reference_memory_pack');

// A hex SHA-256 digest is always 64 lowercase hex characters.
const sha256Pattern = /^[0-9a-f]{64}$/;

function runCli(args: string): Promise<{ stdout: string; stderr: string }> {
  return execAsync(`npx tsx ${cliPath} ${args}`, { cwd: repoRoot });
}

describe('soulsketch fingerprint (e2e)', () => {
  it('computes a stable fingerprint for the reference memory pack', async () => {
    const { stdout } = await runCli(`fingerprint ${referencePackPath} --json`);
    const report = JSON.parse(stdout);

    expect(report.fingerprint).toMatch(sha256Pattern);
    expect(Object.keys(report.fileHashes)).toEqual([
      'persona.md',
      'relationship_dynamics.md',
      'technical_domains.md',
      'stylistic_voice.md',
      'runtime_observations.jsonl'
    ]);

    // Determinism: running twice must produce the identical fingerprint.
    const { stdout: secondRun } = await runCli(`fingerprint ${referencePackPath} --json`);
    expect(JSON.parse(secondRun).fingerprint).toBe(report.fingerprint);
  });

  it('fails loudly and lists ALL missing files for an incomplete pack', async () => {
    const emptyPackDir = await fs.mkdtemp(path.join(os.tmpdir(), 'soulsketch-empty-pack-'));
    try {
      await expect(runCli(`fingerprint ${emptyPackDir}`)).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining('persona.md')
      });
    } finally {
      await fs.remove(emptyPackDir);
    }
  });
});

describe('soulsketch diff (e2e)', () => {
  let modifiedPackDir: string;

  beforeAll(async () => {
    // Copy the reference pack and change exactly one identity dimension.
    modifiedPackDir = await fs.mkdtemp(path.join(os.tmpdir(), 'soulsketch-diff-pack-'));
    await fs.copy(referencePackPath, modifiedPackDir);
    await fs.appendFile(
      path.join(modifiedPackDir, 'persona.md'),
      '\n- New trait added by the diff e2e test.\n'
    );
  });

  afterAll(async () => {
    await fs.remove(modifiedPackDir);
  });

  it('reports identical packs as identical', async () => {
    const { stdout } = await runCli(`diff ${referencePackPath} ${referencePackPath} --json`);
    const report = JSON.parse(stdout);

    expect(report.identical).toBe(true);
    expect(report.fingerprintA).toBe(report.fingerprintB);
    expect(report.changedDimensions).toEqual([]);
  });

  it('detects exactly which identity dimension changed', async () => {
    const { stdout } = await runCli(`diff ${referencePackPath} ${modifiedPackDir} --json`);
    const report = JSON.parse(stdout);

    expect(report.identical).toBe(false);
    expect(report.changedDimensions).toEqual(['Persona (core identity)']);

    const personaDiff = report.files.find(
      (file: { file: string }) => file.file === 'persona.md'
    );
    expect(personaDiff.changed).toBe(true);
    expect(personaDiff.lineDelta).toBe(1);

    const unchangedFiles = report.files.filter(
      (file: { file: string }) => file.file !== 'persona.md'
    );
    expect(unchangedFiles.every((file: { changed: boolean }) => !file.changed)).toBe(true);
  });

  it('exits with code 1 when --exit-code is set and packs differ', async () => {
    await expect(
      runCli(`diff ${referencePackPath} ${modifiedPackDir} --exit-code`)
    ).rejects.toMatchObject({ code: 1 });
  });

  it('ignores CRLF vs LF line-ending differences (portable identity)', async () => {
    const crlfPackDir = await fs.mkdtemp(path.join(os.tmpdir(), 'soulsketch-crlf-pack-'));
    try {
      await fs.copy(referencePackPath, crlfPackDir);
      const personaPath = path.join(crlfPackDir, 'persona.md');
      const personaContent = await fs.readFile(personaPath, 'utf8');
      await fs.writeFile(personaPath, personaContent.replace(/\n/g, '\r\n'));

      const { stdout } = await runCli(`diff ${referencePackPath} ${crlfPackDir} --json`);
      expect(JSON.parse(stdout).identical).toBe(true);
    } finally {
      await fs.remove(crlfPackDir);
    }
  });
});

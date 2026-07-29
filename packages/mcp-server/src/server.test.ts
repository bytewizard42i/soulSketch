/**
 * Tests for the SoulSketch MCP server.
 *
 * Uses the MCP SDK's InMemoryTransport to connect a real MCP client to the
 * real server in-process, so these tests exercise the actual protocol layer,
 * not just the underlying functions.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mkdtemp, mkdir, writeFile, readFile, rm, cp } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildSoulSketchServer } from './server.js';

const referencePackSource = path.join(
  __dirname,
  '../../../examples/reference_memory_pack'
);

let workspaceRoot: string;
let packDir: string;
let modifiedPackDir: string;
let client: Client;

function parseToolResult(result: { content?: unknown }): Record<string, unknown> {
  const content = result.content as Array<{ type: string; text: string }>;
  return JSON.parse(content[0].text);
}

async function callTool(name: string, args: Record<string, unknown>) {
  return client.callTool({ name, arguments: args });
}

beforeAll(async () => {
  // Copy the sanitized reference pack into a temp workspace we're allowed to touch.
  workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'soulsketch-mcp-test-'));
  packDir = path.join(workspaceRoot, 'pack');
  modifiedPackDir = path.join(workspaceRoot, 'pack-modified');
  await cp(referencePackSource, packDir, { recursive: true });
  await cp(referencePackSource, modifiedPackDir, { recursive: true });
  await writeFile(
    path.join(modifiedPackDir, 'persona.md'),
    (await readFile(path.join(modifiedPackDir, 'persona.md'), 'utf8')) +
      '\n- Trait added by MCP server test.\n'
  );

  // Connect a real MCP client to the server through an in-memory pipe.
  const server = buildSoulSketchServer({ allowedRoots: [workspaceRoot] });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'test-client', version: '0.0.0' });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
});

afterAll(async () => {
  await client.close();
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('tool discovery', () => {
  it('exposes the six SoulSketch tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name).sort();
    expect(names).toEqual([
      'soulsketch_continuity_record',
      'soulsketch_diff_packs',
      'soulsketch_fingerprint_pack',
      'soulsketch_observe',
      'soulsketch_read_pack',
      'soulsketch_validate_pack'
    ]);
  });
});

describe('soulsketch_validate_pack', () => {
  it('validates a healthy pack', async () => {
    const report = parseToolResult(await callTool('soulsketch_validate_pack', { pack_dir: packDir }));
    expect(report.valid).toBe(true);
    expect(report.filesChecked).toBe(5);
  });

  it('reports missing files for an incomplete pack', async () => {
    const emptyDir = path.join(workspaceRoot, 'empty-pack');
    await mkdir(emptyDir, { recursive: true });
    const report = parseToolResult(await callTool('soulsketch_validate_pack', { pack_dir: emptyDir }));
    expect(report.valid).toBe(false);
    expect((report.errors as string[]).length).toBe(5);
  });
});

describe('soulsketch_fingerprint_pack', () => {
  it('returns a deterministic sha256 fingerprint', async () => {
    const first = parseToolResult(await callTool('soulsketch_fingerprint_pack', { pack_dir: packDir }));
    const second = parseToolResult(await callTool('soulsketch_fingerprint_pack', { pack_dir: packDir }));
    expect(first.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(first.fingerprint).toBe(second.fingerprint);
  });
});

describe('soulsketch_diff_packs', () => {
  it('detects which identity dimension changed', async () => {
    const report = parseToolResult(
      await callTool('soulsketch_diff_packs', { pack_dir_a: packDir, pack_dir_b: modifiedPackDir })
    );
    expect(report.identical).toBe(false);
    expect(report.changedDimensions).toEqual(['Persona (core identity)']);
  });
});

describe('soulsketch_read_pack', () => {
  it('returns requested file contents', async () => {
    const report = parseToolResult(
      await callTool('soulsketch_read_pack', { pack_dir: packDir, files: ['persona.md'] })
    );
    const contents = report.contents as Record<string, string | null>;
    expect(Object.keys(contents)).toEqual(['persona.md']);
    expect(contents['persona.md']).toContain('#');
  });
});

describe('soulsketch_observe', () => {
  it('appends exactly one observation line and never touches existing ones', async () => {
    const observationsPath = path.join(packDir, 'runtime_observations.jsonl');
    const before = await readFile(observationsPath, 'utf8');

    const report = parseToolResult(
      await callTool('soulsketch_observe', {
        pack_dir: packDir,
        note: 'Observation from MCP test',
        author: 'test'
      })
    );

    const after = await readFile(observationsPath, 'utf8');
    expect(after.startsWith(before.endsWith('\n') ? before : before + '\n')).toBe(true);
    const appended = report.appended as Record<string, string>;
    expect(appended.note).toBe('Observation from MCP test');
    expect(appended.author).toBe('test');
    expect(appended.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('soulsketch_continuity_record', () => {
  it('builds a record with provenance labels and warnings', async () => {
    const report = parseToolResult(
      await callTool('soulsketch_continuity_record', {
        pack_dir: packDir,
        source: 'human-authored',
        authority: 'canonical',
        trust_label: 'private-state'
        // no repo/commit on purpose: canonical packs should warn about that
      })
    );
    expect(report.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect((report.warnings as string[]).length).toBeGreaterThan(0);
  });
});

describe('trust boundary', () => {
  it('denies access to packs outside the allowed roots', async () => {
    const result = await callTool('soulsketch_validate_pack', { pack_dir: '/etc' });
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ text: string }>)[0].text;
    expect(text).toContain('Access denied');
  });
});

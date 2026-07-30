/**
 * Tests for the setup wizard, settings resolution, and tool filtering.
 * The wizard is driven by a scripted "user" (canned answers), so the whole
 * Q&A flow runs for real - just without a human at the keyboard.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildSoulSketchServer } from './server.js';
import { resolveEnabledOptionalTools, OPTIONAL_TOOLS } from './settings.js';
import { runWizard } from './wizard.js';

let workspaceRoot: string;

beforeAll(async () => {
  workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'soulsketch-wizard-test-'));
});

afterAll(async () => {
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('setup wizard (scripted user)', () => {
  it('creates a Soul-Sanctum, starter pack, and settings from the Q&A', async () => {
    const sanctumPath = path.join(workspaceRoot, 'my-sanctum');
    // The scripted user: sanctum path, soul name "Pixel", vessel names,
    // create pack -> yes, observe -> yes, fingerprint -> yes, diff -> NO,
    // continuity_record -> default (yes).
    const answers = [sanctumPath, 'Pixel', 'Windsurf: Pix, Claude Desktop: Pixie', 'y', 'y', 'y', 'n', ''];
    const transcript: string[] = [];

    await runWizard({
      ask: async (question) => {
        transcript.push(question);
        return answers.shift() ?? '';
      },
      say: (text) => transcript.push(text)
    });

    // Starter pack: all five files, personalized, with the Vessels section.
    const persona = await readFile(path.join(sanctumPath, 'memory_packs', 'persona.md'), 'utf8');
    expect(persona).toContain('Pixel');
    expect(persona).toContain('## Vessels');
    expect(persona).toContain('Windsurf: Pix');
    expect(persona).toContain('Claude Desktop: Pixie');
    const diary = await readFile(
      path.join(sanctumPath, 'memory_packs', 'runtime_observations.jsonl'),
      'utf8'
    );
    expect(JSON.parse(diary.trim()).author).toBe('setup-wizard');

    // Settings reflect the choices (diff declined).
    const settings = JSON.parse(
      await readFile(path.join(sanctumPath, '.soulsketch', 'settings.json'), 'utf8')
    );
    expect(settings.enabledTools).toEqual(['observe', 'fingerprint', 'continuity_record']);

    // The printed config snippet points at the sanctum.
    expect(transcript.join('\n')).toContain('SOULSKETCH_ALLOWED_ROOTS');
    expect(transcript.join('\n')).toContain(sanctumPath);
  });
});

describe('settings resolution priority', () => {
  it('env var beats settings file; settings file beats default', async () => {
    const root = path.join(workspaceRoot, 'settings-root');
    await mkdir(path.join(root, '.soulsketch'), { recursive: true });
    await writeFile(
      path.join(root, '.soulsketch', 'settings.json'),
      JSON.stringify({ enabledTools: ['diff'] })
    );

    // 1. Env var wins.
    expect(
      await resolveEnabledOptionalTools({ allowedRoots: [root], env: { SOULSKETCH_TOOLS: 'observe' } as NodeJS.ProcessEnv })
    ).toEqual(['observe']);
    // 2. Settings file wins over default.
    expect(await resolveEnabledOptionalTools({ allowedRoots: [root], env: {} as NodeJS.ProcessEnv })).toEqual(['diff']);
    // 3. No env, no file -> everything on.
    expect(
      await resolveEnabledOptionalTools({ allowedRoots: [workspaceRoot], env: {} as NodeJS.ProcessEnv })
    ).toEqual([...OPTIONAL_TOOLS]);
    // 4. "none" disables all optional tools.
    expect(
      await resolveEnabledOptionalTools({ allowedRoots: [root], env: { SOULSKETCH_TOOLS: 'none' } as NodeJS.ProcessEnv })
    ).toEqual([]);
  });
});

describe('tool filtering on the live server', () => {
  it('registers only Need tools plus the chosen optional ones', async () => {
    const server = buildSoulSketchServer({ allowedRoots: [workspaceRoot], enabledTools: ['observe'] });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0' });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'soulsketch_observe',
      'soulsketch_read_pack',
      'soulsketch_validate_pack'
    ]);
    await client.close();
  });
});

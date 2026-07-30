import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import {
  computeMemoryPackFingerprint,
  createContinuityRecord,
  diffMemoryPacks,
  getMemoryPackFileOrder,
  validateMemoryPackContents,
  type MemoryAuthorityLevel,
  type MemoryProvenanceSource,
  type MemoryTrustLabel
} from '@soulsketch/core';
import {
  appendRuntimeObservation,
  assertInsideAllowedRoots,
  loadMemoryPackFiles,
  requireCompletePack,
  resolveAllowedRoots
} from './pack-io.js';
import { collectDueReminders, OPTIONAL_TOOLS, type OptionalTool } from './settings.js';

const SERVER_NAME = 'soulsketch';
// Read the version from package.json so it can never drift from the release
// (the CLI had this exact hardcoded-version bug once; never again).
const SERVER_VERSION: string = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
).version;

function asTextResult(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}

function asErrorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
}

/**
 * Build the SoulSketch MCP server. Exposes the working parts of the protocol
 * as tools any MCP client (Claude Desktop, Windsurf, Cursor, ...) can call.
 *
 * Trust model:
 * - Read tools only touch pack directories inside the allowed roots.
 * - The single write tool (observe) appends one line to
 *   runtime_observations.jsonl and can never modify existing memories.
 *
 * Tool selection: read_pack and validate_pack are always registered (the
 * "Need" tools). The optional tools (observe, fingerprint, diff,
 * continuity_record) can be limited via options.enabledTools - normally
 * chosen by the user in the setup wizard (`soulsketch-mcp setup`).
 */
export function buildSoulSketchServer(options?: {
  allowedRoots?: string[];
  enabledTools?: OptionalTool[];
}): McpServer {
  const allowedRoots = options?.allowedRoots ?? resolveAllowedRoots();
  const enabledTools = new Set(options?.enabledTools ?? OPTIONAL_TOOLS);

  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    'soulsketch_validate_pack',
    {
      title: 'Validate a memory pack',
      description:
        'Check that a directory is a healthy 5-file SoulSketch memory pack ' +
        '(persona.md, relationship_dynamics.md, technical_domains.md, ' +
        'stylistic_voice.md, runtime_observations.jsonl). Returns errors and warnings.',
      inputSchema: {
        pack_dir: z.string().describe('Absolute path to the memory pack directory')
      }
    },
    async ({ pack_dir }) => {
      try {
        const resolved = assertInsideAllowedRoots(pack_dir, allowedRoots);
        const files = await loadMemoryPackFiles(resolved);
        return asTextResult({ pack: resolved, ...validateMemoryPackContents(files) });
      } catch (error) {
        return asErrorResult(error);
      }
    }
  );

  if (enabledTools.has('fingerprint'))
  server.registerTool(
    'soulsketch_fingerprint_pack',
    {
      title: 'Fingerprint a memory pack',
      description:
        'Compute the deterministic SHA-256 identity fingerprint of a memory pack, ' +
        'plus per-file hashes. The fingerprint refers to a memory state without ' +
        'revealing its contents; use it for audit logs, handoffs, and continuity proofs.',
      inputSchema: {
        pack_dir: z.string().describe('Absolute path to the memory pack directory')
      }
    },
    async ({ pack_dir }) => {
      try {
        const resolved = assertInsideAllowedRoots(pack_dir, allowedRoots);
        const files = requireCompletePack(await loadMemoryPackFiles(resolved), resolved);
        return asTextResult({ pack: resolved, ...computeMemoryPackFingerprint(files) });
      } catch (error) {
        return asErrorResult(error);
      }
    }
  );

  if (enabledTools.has('diff'))
  server.registerTool(
    'soulsketch_diff_packs',
    {
      title: 'Diff two memory packs',
      description:
        'Compare two memory pack directories and explain WHICH identity dimension ' +
        'changed (persona, relationships, technical domains, voice, observations). ' +
        'Line-ending differences (CRLF vs LF) never count as identity changes.',
      inputSchema: {
        pack_dir_a: z.string().describe('Absolute path to the first pack directory'),
        pack_dir_b: z.string().describe('Absolute path to the second pack directory')
      }
    },
    async ({ pack_dir_a, pack_dir_b }) => {
      try {
        const resolvedA = assertInsideAllowedRoots(pack_dir_a, allowedRoots);
        const resolvedB = assertInsideAllowedRoots(pack_dir_b, allowedRoots);
        const filesA = requireCompletePack(await loadMemoryPackFiles(resolvedA), resolvedA);
        const filesB = requireCompletePack(await loadMemoryPackFiles(resolvedB), resolvedB);
        return asTextResult({ packA: resolvedA, packB: resolvedB, ...diffMemoryPacks(filesA, filesB) });
      } catch (error) {
        return asErrorResult(error);
      }
    }
  );

  server.registerTool(
    'soulsketch_read_pack',
    {
      title: 'Read a memory pack',
      description:
        'Load the contents of a memory pack so the assistant can adopt its identity: ' +
        'persona, relationships, technical context, voice, and recent observations. ' +
        'Optionally restrict to specific files. ' +
        'ONE SOUL, MANY VESSELS: the pack is a single shared identity. If persona.md ' +
        'has a "Vessels" section listing a name for the tool you are running in, adopt ' +
        'that name (and use it as the author when observing) while keeping the shared ' +
        'persona, relationships, and voice.',
      inputSchema: {
        pack_dir: z.string().describe('Absolute path to the memory pack directory'),
        files: z
          .array(z.enum(getMemoryPackFileOrder() as [string, ...string[]]))
          .optional()
          .describe('Optional subset of pack files to read (default: all five)')
      }
    },
    async ({ pack_dir, files }) => {
      try {
        const resolved = assertInsideAllowedRoots(pack_dir, allowedRoots);
        const allFiles = await loadMemoryPackFiles(resolved);
        const wanted = files && files.length > 0 ? files : getMemoryPackFileOrder();
        const contents: Record<string, string | null> = {};
        for (const fileName of wanted) {
          contents[fileName] = allFiles[fileName as keyof typeof allFiles] ?? null;
        }
        // Due reminders (e.g. "set up GitHub backup") ride along with the pack
        // so the assistant can gently relay them to the user, in character.
        const dueReminders = await collectDueReminders(resolved);
        return asTextResult(
          dueReminders.length > 0
            ? { pack: resolved, contents, reminders_for_user: dueReminders }
            : { pack: resolved, contents }
        );
      } catch (error) {
        return asErrorResult(error);
      }
    }
  );

  if (enabledTools.has('observe'))
  server.registerTool(
    'soulsketch_observe',
    {
      title: 'Append a runtime observation',
      description:
        'Append ONE observation line to the pack\'s runtime_observations.jsonl ' +
        '(the living memory stream). This is the only write this server can perform: ' +
        'append-only, never modifying or deleting existing memories. ' +
        'MEMORY ETIQUETTE: when the conversation surfaces something memory-worthy ' +
        '(a durable preference, a decision, a milestone, a relationship change), ' +
        'FIRST ask the user, e.g. "Would you like me to save this to your ' +
        'Soul-Sanctum?" - and only call this tool after they agree. Never save ' +
        'silently; the user owns their memory.',
      inputSchema: {
        pack_dir: z.string().describe('Absolute path to the memory pack directory'),
        note: z.string().min(1).describe('The observation to remember'),
        author: z.string().optional().describe('Who is recording this (e.g. assistant name)')
      }
    },
    async ({ pack_dir, note, author }) => {
      try {
        const resolved = assertInsideAllowedRoots(pack_dir, allowedRoots);
        const appended = await appendRuntimeObservation({ packDirectory: resolved, note, author });
        return asTextResult({ pack: resolved, appended: JSON.parse(appended) });
      } catch (error) {
        return asErrorResult(error);
      }
    }
  );

  if (enabledTools.has('continuity_record'))
  server.registerTool(
    'soulsketch_continuity_record',
    {
      title: 'Create a continuity record',
      description:
        'Build a full continuity record for a pack: fingerprint, per-file hashes, ' +
        'provenance labels (source, authority, trust), and provenance warnings. ' +
        'This is the audit artifact to store alongside the pack or anchor elsewhere.',
      inputSchema: {
        pack_dir: z.string().describe('Absolute path to the memory pack directory'),
        source: z
          .enum(['human-authored', 'ai-assisted', 'tool-generated', 'imported', 'unknown'])
          .default('unknown')
          .describe('How the memory content was produced'),
        authority: z
          .enum(['canonical', 'working', 'archived', 'untrusted'])
          .default('working')
          .describe('How authoritative this pack state is'),
        trust_label: z
          .enum(['public-template', 'private-state', 'sanitized-example', 'sensitive', 'unknown'])
          .default('unknown')
          .describe('Sensitivity classification of the contents'),
        repo: z.string().optional().describe('Repository that owns this state'),
        commit: z.string().optional().describe('Git commit hash pinning this state')
      }
    },
    async ({ pack_dir, source, authority, trust_label, repo, commit }) => {
      try {
        const resolved = assertInsideAllowedRoots(pack_dir, allowedRoots);
        const files = requireCompletePack(await loadMemoryPackFiles(resolved), resolved);
        const record = createContinuityRecord({
          memoryPackFiles: files,
          provenance: {
            source: source as MemoryProvenanceSource,
            authority: authority as MemoryAuthorityLevel,
            trustLabel: trust_label as MemoryTrustLabel,
            repo,
            commit,
            lastReviewedAt: new Date().toISOString()
          }
        });
        return asTextResult({ pack: resolved, ...record });
      } catch (error) {
        return asErrorResult(error);
      }
    }
  );

  return server;
}

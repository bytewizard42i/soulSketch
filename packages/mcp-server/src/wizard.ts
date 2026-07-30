/**
 * SoulSketch interactive setup wizard.
 *
 * Run once in a terminal:  npx -y @soulsketch/mcp-server setup
 *
 * An MCP server itself is started headlessly by the AI tool (its stdin and
 * stdout ARE the protocol wire), so the friendly Q&A lives here instead:
 * this wizard creates/locates the user's Soul-Sanctum, lets them choose
 * which optional tools to enable (with a plain-language explanation for
 * each), writes those choices to <sanctum>/.soulsketch/settings.json, and
 * prints the exact config snippet to paste into their AI tool.
 */

import * as readline from 'node:readline';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { OPTIONAL_TOOLS, type OptionalTool } from './settings.js';

type WizardIO = { ask: (question: string) => Promise<string>; say: (text: string) => void };

/** Verbose, plain-language description of every tool, shown during setup. */
export const TOOL_EXPLANATIONS: Record<string, { title: string; need: boolean; text: string }> = {
  read_pack: {
    title: 'Read memory pack ("wake up and remember who you are")',
    need: true,
    text:
      'Loads your assistant\'s identity - persona, relationships, technical\n' +
      'context, voice, and recent observations - so it "comes home" in any AI\n' +
      'tool, on any model. Without this the server has no purpose, so it is\n' +
      'always enabled.'
  },
  validate_pack: {
    title: 'Validate memory pack ("health check")',
    need: true,
    text:
      'Checks that a memory pack has all five files, none are empty, and the\n' +
      'observation diary is well-formed. Protects you from loading a broken or\n' +
      'half-copied pack. Read-only and always enabled.'
  },
  observe: {
    title: 'Observe ("write that down") - THE ONLY TOOL THAT WRITES',
    need: false,
    text:
      'Lets the assistant append one line to the memory diary\n' +
      '(runtime_observations.jsonl) - e.g. a preference you stated or a\n' +
      'decision you made. It asks you first ("Would you like me to save this\n' +
      'to your Soul-Sanctum?") and can only ADD lines: it is mechanically\n' +
      'incapable of editing or deleting an existing memory. Disable it if you\n' +
      'want a strictly read-only setup where memories are only ever written\n' +
      'by you, by hand.'
  },
  fingerprint: {
    title: 'Fingerprint ("tamper-evident seal")',
    need: false,
    text:
      'Computes a deterministic SHA-256 fingerprint of the whole pack. Same\n' +
      'memories -> same fingerprint, always; change one character -> completely\n' +
      'different. Lets you PROVE the memories are unchanged without revealing\n' +
      'them. Read-only; disable only if you want the smallest possible tool\n' +
      'list.'
  },
  diff: {
    title: 'Diff ("what changed, in human terms")',
    need: false,
    text:
      'Compares two packs and reports WHICH identity dimension changed -\n' +
      'persona? relationships? voice? just the diary? Useful before accepting\n' +
      'a synced or imported pack. Read-only.'
  },
  continuity_record: {
    title: 'Continuity record ("notarized snapshot")',
    need: false,
    text:
      'Bundles the fingerprint with provenance labels (who authored this\n' +
      'state, how authoritative, how sensitive) into an audit artifact you can\n' +
      'store beside the pack or pin to a Git commit. Read-only.'
  }
};

const STARTER_PACK_FILES = (assistantName: string, vesselLines: string[]): Record<string, string> => ({
  'persona.md':
    `# ${assistantName} - Persona\n\n` +
    `- **Name**: ${assistantName}\n` +
    `- Describe who your assistant is: role, character, values.\n` +
    `- This file answers: "who am I?"\n\n` +
    `## Vessels\n\n` +
    `One soul, many vessels: the same identity wakes up in every AI tool, but\n` +
    `may carry a different name depending on who is calling. When a tool\n` +
    `listed here reads this pack, it should adopt that name (and sign diary\n` +
    `entries with it).\n\n` +
    (vesselLines.length > 0
      ? vesselLines.map((line) => `- ${line}\n`).join('')
      : `- (example) Windsurf: ${assistantName}\n- (example) Claude Desktop: add a name here\n`),
  'relationship_dynamics.md':
    `# Relationships\n\n` +
    `- Who does ${assistantName} know, and how? (you, family, collaborators)\n` +
    `- Communication preferences, trust levels, inside references.\n`,
  'technical_domains.md':
    `# Technical Domains\n\n` +
    `- What is ${assistantName} good at? Languages, tools, systems, projects.\n`,
  'stylistic_voice.md':
    `# Stylistic Voice\n\n` +
    `- How does ${assistantName} talk? Tone, formatting habits, signatures.\n`,
  'runtime_observations.jsonl':
    JSON.stringify({
      date: new Date().toISOString().slice(0, 10),
      note: `Soul-Sanctum created by the SoulSketch setup wizard for ${assistantName}.`,
      author: 'setup-wizard'
    }) + '\n'
});

async function isDirectory(candidatePath: string): Promise<boolean> {
  const stats = await stat(candidatePath).catch(() => null);
  return stats?.isDirectory() ?? false;
}

async function askYesNo(io: WizardIO, question: string, defaultYes: boolean): Promise<boolean> {
  const suffix = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = (await io.ask(`${question} ${suffix} `)).trim().toLowerCase();
  if (answer === '') return defaultYes;
  return answer === 'y' || answer === 'yes';
}

/** The wizard body, separated from stdin/stdout wiring so tests can drive it. */
export async function runWizard(io: WizardIO): Promise<void> {
  io.say('');
  io.say('=========================================================');
  io.say('  SoulSketch Setup Wizard');
  io.say('  Portable, user-owned memory for your AI assistant');
  io.say('=========================================================');
  io.say('');
  io.say('Your assistant\'s identity will live in five plain text files inside a');
  io.say('folder you own, called your Soul-Sanctum. This wizard will:');
  io.say('  1. create (or locate) your Soul-Sanctum');
  io.say('  2. let you choose which tools your assistant gets');
  io.say('  3. print the config snippet to paste into your AI tool');
  io.say('');

  // ---- Step 1: the Soul-Sanctum ----
  const defaultSanctum = path.join(os.homedir(), 'soul-sanctum');
  const sanctumAnswer = (await io.ask(`Where should your Soul-Sanctum live? [${defaultSanctum}] `)).trim();
  const sanctumPath = path.resolve(sanctumAnswer || defaultSanctum);

  // ---- Step 2: one soul, many vessels ----
  io.say('');
  io.say('SoulSketch keeps ONE soul for all your AI tools: the same identity');
  io.say('wakes up everywhere, and every tool\'s diary notes are attributed by');
  io.say('author. Each tool (each "vessel") may carry its own name - like one');
  io.say('person known by different names to different friends.');
  io.say('');
  const assistantName =
    (await io.ask('What is the soul\'s name? [Assistant] ')).trim() || 'Assistant';

  io.say('');
  io.say('Optionally, name some vessels now (comma-separated "tool: name" pairs,');
  io.say('e.g. "Windsurf: Penny, Claude Desktop: Cassie") or press Enter to skip.');
  const vesselAnswer = (await io.ask('Vessel names: ')).trim();
  const vesselLines = vesselAnswer
    ? vesselAnswer.split(',').map((pair) => pair.trim()).filter(Boolean)
    : [];

  const packDirName = 'memory_packs';
  const packPath = path.join(sanctumPath, packDirName);
  if (!(await isDirectory(packPath))) {
    io.say('');
    const create = await askYesNo(
      io,
      `Create ${packPath} with a starter memory pack for ${assistantName}?`,
      true
    );
    if (create) {
      await mkdir(packPath, { recursive: true });
      for (const [fileName, content] of Object.entries(STARTER_PACK_FILES(assistantName, vesselLines))) {
        await writeFile(path.join(packPath, fileName), content, { flag: 'wx' }).catch(() => {
          /* never overwrite an existing memory file */
        });
      }
      io.say(`Created starter pack in ${packPath} - open the .md files and make them yours.`);
      io.say('Tip: run `git init` in your Soul-Sanctum so every memory change is versioned.');
    }
  } else {
    io.say(`Found existing pack at ${packPath} - leaving it untouched.`);
  }

  // ---- Step 3: choose tools ----
  io.say('');
  io.say('--- Tools your assistant will get ---');
  io.say('');
  io.say('ALWAYS ON (the "Need" tools):');
  for (const key of ['read_pack', 'validate_pack']) {
    const info = TOOL_EXPLANATIONS[key];
    io.say(`  * ${info.title}`);
    io.say(indent(info.text));
    io.say('');
  }

  io.say('OPTIONAL (your choice):');
  const enabledTools: OptionalTool[] = [];
  for (const tool of OPTIONAL_TOOLS) {
    const info = TOOL_EXPLANATIONS[tool];
    io.say('');
    io.say(`  * ${info.title}`);
    io.say(indent(info.text));
    if (await askYesNo(io, `  Enable "${tool}"?`, true)) enabledTools.push(tool);
  }

  // ---- Step 4: write settings into the Sanctum (portable with it) ----
  const settingsDir = path.join(sanctumPath, '.soulsketch');
  await mkdir(settingsDir, { recursive: true });
  await writeFile(
    path.join(settingsDir, 'settings.json'),
    JSON.stringify(
      { enabledTools, createdBy: 'soulsketch setup wizard', updatedAt: new Date().toISOString() },
      null,
      2
    ) + '\n'
  );

  // ---- Step 5: print the config to paste ----
  io.say('');
  io.say('=========================================================');
  io.say('  Done! Paste this into your AI tool\'s MCP config');
  io.say('  (Claude Desktop / Windsurf / Cursor / ...):');
  io.say('=========================================================');
  io.say('');
  io.say(
    JSON.stringify(
      {
        mcpServers: {
          soulsketch: {
            command: 'npx',
            args: ['-y', '@soulsketch/mcp-server'],
            env: { SOULSKETCH_ALLOWED_ROOTS: sanctumPath }
          }
        }
      },
      null,
      2
    )
  );
  io.say('');
  io.say(`Your choices are saved in ${path.join(settingsDir, 'settings.json')}.`);
  io.say('Re-run `npx -y @soulsketch/mcp-server setup` any time to change them.');
  io.say('');
  io.say(`Then tell your assistant: "Read the memory pack at ${packPath}`);
  io.say('and adopt that identity" - and watch it come home.');
  io.say('');
}

function indent(text: string): string {
  return text
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n');
}

/**
 * Wire the wizard to the real terminal.
 *
 * Answers are buffered in a queue instead of using rl.question() directly:
 * with piped (non-interactive) stdin, readline can emit lines while the
 * wizard is busy between questions, and un-listened lines would be lost.
 * The queue makes the wizard equally happy with a human or a script.
 */
export async function runWizardInteractive(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const pendingLines: string[] = [];
  const waiters: Array<(line: string) => void> = [];
  let ended = false;

  rl.on('line', (line) => {
    const waiter = waiters.shift();
    if (waiter) waiter(line);
    else pendingLines.push(line);
  });
  rl.on('close', () => {
    ended = true;
    while (waiters.length > 0) waiters.shift()!('');
  });

  const nextLine = (): Promise<string> => {
    if (pendingLines.length > 0) return Promise.resolve(pendingLines.shift()!);
    if (ended) return Promise.resolve('');
    return new Promise((resolve) => waiters.push(resolve));
  };

  try {
    await runWizard({
      ask: async (question) => {
        process.stdout.write(question);
        return nextLine();
      },
      say: (text) => console.log(text)
    });
  } finally {
    rl.close();
  }
}

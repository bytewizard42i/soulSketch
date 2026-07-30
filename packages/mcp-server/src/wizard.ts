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
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import * as os from 'node:os';
import { OPTIONAL_TOOLS, type OptionalTool, type SanctumReminder } from './settings.js';
import { validateMemoryPackContents } from '@soulsketch/core';
import { loadMemoryPackFiles } from './pack-io.js';

const execFileAsync = promisify(execFile);

/**
 * A friendly, OS-aware description of where the default Soul-Sanctum lands,
 * so users who have never typed a "path" understand what they're agreeing to.
 */
export function describeDefaultLocation(platform: string, homeDirectory: string): string {
  const example = path.join(homeDirectory, 'soul-sanctum');
  if (platform === 'win32') {
    return (
      `We suggest: ${example}\n` +
      `(that's inside YOUR user folder - the same place as your Documents and\n` +
      `Downloads folders. You can see it any time in File Explorer.)`
    );
  }
  if (platform === 'darwin') {
    return (
      `We suggest: ${example}\n` +
      `(that's inside your Mac home folder - the one with your Documents,\n` +
      `Downloads, and Desktop. You can see it any time in Finder with Cmd+Shift+H.)`
    );
  }
  return (
    `We suggest: ${example}\n` +
    `(that's inside your home folder - the same place as your Documents and\n` +
    `Downloads folders.)`
  );
}

/** Where each popular AI tool keeps its MCP config file, per OS. */
export function describeClientConfigLocations(platform: string): string[] {
  const lines = ['Where do I paste it? Find your AI tool below:', ''];
  if (platform === 'win32') {
    lines.push('  Claude Desktop:  %APPDATA%\\Claude\\claude_desktop_config.json');
    lines.push('                   (paste that into the File Explorer address bar)');
  } else if (platform === 'darwin') {
    lines.push('  Claude Desktop:  ~/Library/Application Support/Claude/claude_desktop_config.json');
  } else {
    lines.push('  Claude Desktop:  ~/.config/Claude/claude_desktop_config.json');
  }
  lines.push('  Windsurf:        ~/.codeium/windsurf/mcp_config.json');
  lines.push('  Cursor:          ~/.cursor/mcp.json');
  lines.push('');
  lines.push('  Open the file in any text editor, paste the snippet, save, and');
  lines.push('  restart the AI tool. (If the file already has entries, add ours');
  lines.push('  inside the existing "mcpServers" section.)');
  return lines;
}

type WizardIO = { ask: (question: string) => Promise<string>; say: (text: string) => void };

/** Verbose, plain-language description of every tool, shown during setup. */
export const TOOL_EXPLANATIONS: Record<string, { title: string; need: boolean; text: string }> = {
  read_pack: {
    title: 'Read memory pack ("wake up and remember who you are")',
    need: true,
    text:
      'Lets your assistant read its own memory files so it "comes home" in any\n' +
      'AI tool, on any model. Think of a favorite coworker returning from\n' +
      'vacation: they still know you, your projects, and your inside jokes.\n' +
      'Without this tool the server has no purpose, so it is always on.'
  },
  validate_pack: {
    title: 'Validate memory pack ("health check")',
    need: true,
    text:
      'A quick physical for the memory folder: are all five files present,\n' +
      'none empty, diary readable? Like checking a suitcase is packed before a\n' +
      'trip - it protects you from "waking up" an assistant from a broken or\n' +
      'half-copied folder. Read-only, always on.'
  },
  observe: {
    title: 'Observe ("write that down") - THE ONLY TOOL THAT CAN WRITE',
    need: false,
    text:
      'Lets the assistant add ONE line to its diary when something worth\n' +
      'remembering happens - say you mention "I\'m allergic to long meetings;\n' +
      'keep summaries short." The assistant will ASK first ("Would you like me\n' +
      'to save this to your Soul-Sanctum?") and writes only if you agree.\n' +
      'It can only ADD lines to the diary - like writing in pen in a bound\n' +
      'notebook, it cannot erase or rewrite anything already there.\n' +
      'Say NO if you prefer your assistant read-only, with you editing the\n' +
      'memory files yourself. Most people say yes.'
  },
  fingerprint: {
    title: 'Fingerprint ("wax seal for your memories")',
    need: false,
    text:
      'Stamps the whole memory folder with a unique code, like a wax seal on\n' +
      'an envelope: if even one letter inside changes, the seal comes out\n' +
      'completely different. Handy to prove "nothing tampered with my\n' +
      'assistant\'s memory" - without showing anyone what the memories say.\n' +
      'Read-only. Say yes unless you want the shortest possible tool list.'
  },
  diff: {
    title: 'Diff ("spot the difference, in human terms")',
    need: false,
    text:
      'Compares two versions of a memory folder and tells you WHICH part of\n' +
      'the identity changed - the personality? the relationships? the voice?\n' +
      'or just new diary lines? Like comparing two photos of your kitchen and\n' +
      'being told "only the curtains changed." Useful before accepting a\n' +
      'memory folder synced from another computer. Read-only.'
  },
  continuity_record: {
    title: 'Continuity record ("notary stamp")',
    need: false,
    text:
      'Creates a small certificate: the wax-seal fingerprint PLUS labels for\n' +
      'who wrote this memory state and how much to trust it - like a notary\n' +
      'stamping a document with a date and signature. You keep it next to the\n' +
      'memories as an audit trail. Read-only.'
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
  io.say('folder you own, called your Soul-Sanctum. Think of it as your');
  io.say('assistant\'s diary, address book, and voice memo - in one folder that');
  io.say('belongs to YOU, not to any AI company. This wizard will:');
  io.say('  1. create (or locate) your Soul-Sanctum');
  io.say('  2. let you choose which tools your assistant gets');
  io.say('  3. print the config snippet to paste into your AI tool');
  io.say('');
  io.say('Press Enter at any question to accept the suggestion in [brackets].');
  io.say('');

  // ---- Step 1: the Soul-Sanctum ----
  io.say('First: where should your Soul-Sanctum folder live?');
  io.say(describeDefaultLocation(process.platform, os.homedir()));
  io.say('');
  const defaultSanctum = path.join(os.homedir(), 'soul-sanctum');
  const sanctumAnswer = (await io.ask(`Soul-Sanctum location [press Enter for ${defaultSanctum}]: `)).trim();
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

      // Offer Git: a time machine for memories, entirely optional.
      io.say('');
      io.say('One more nicety: Git can keep a history of every memory change -');
      io.say('like a time machine, you can always see (or restore) what your');
      io.say('assistant\'s memory looked like last week. Completely optional.');
      if (await askYesNo(io, 'Turn on memory history (git init)?', true)) {
        try {
          await execFileAsync('git', ['init'], { cwd: sanctumPath });
          io.say('Memory history is on. (Git is doing the work behind the scenes.)');
        } catch {
          io.say('Could not find Git on this computer - skipping. Everything else');
          io.say('still works; you can install Git later from https://git-scm.com');
        }
      }
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

  // ---- Step 4: offer remote backup (GitHub), with skip-and-remind ----
  const reminders: SanctumReminder[] = [];
  io.say('');
  io.say('--- Backing up your Soul-Sanctum (optional, recommended) ---');
  io.say('');
  io.say('Right now your assistant\'s memory lives only on THIS computer. If the');
  io.say('laptop dies or gets lost, the memories go with it - like keeping the');
  io.say('only photo album in a house with no fire safe. A free, PRIVATE GitHub');
  io.say('repository gives you an off-site copy and lets the same soul follow');
  io.say('you to other computers. (Private means only you can see it.)');
  io.say('');
  io.say('  1) I have a GitHub account - show me what to do');
  io.say('  2) Skip for now, remind me in a week');
  io.say('  3) Skip forever - my memories stay local only');
  const backupChoice = (await io.ask('Your choice [2]: ')).trim() || '2';

  if (backupChoice === '1') {
    io.say('');
    io.say('Three steps (five minutes, one-time):');
    io.say('  a) On github.com click "+" -> "New repository". Name it anything');
    io.say('     (e.g. "my-soul-sanctum") and - important - choose PRIVATE.');
    io.say('  b) GitHub then shows commands under "push an existing repository".');
    io.say('     Run them inside your Soul-Sanctum folder:');
    io.say(`       cd ${sanctumPath}`);
    io.say('       git remote add origin git@github.com:YOURNAME/my-soul-sanctum.git');
    io.say('       git push -u origin main');
    io.say('  c) From then on, after memorable sessions: git push. That\'s the');
    io.say('     whole backup ritual.');
    io.say('  (No GitHub account yet? It\'s free: https://github.com/signup)');
  } else if (backupChoice === '2') {
    const remindAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    reminders.push({
      topic: 'github-backup',
      remindAt: remindAt.toISOString(),
      note:
        'Gentle reminder from your setup wizard (you asked for this a week ago): ' +
        'your Soul-Sanctum memories still live on only one computer. Consider a ' +
        'free PRIVATE GitHub repo as an off-site backup - re-run ' +
        '`npx -y @soulsketch/mcp-server setup` and pick option 1 for the steps.'
    });
    io.say('');
    io.say('No problem - your assistant will gently remind you in a week.');
  } else {
    io.say('');
    io.say('Understood - strictly local. You can revisit any time by re-running setup.');
  }

  // ---- Step 5: write settings into the Sanctum (portable with it) ----
  const settingsDir = path.join(sanctumPath, '.soulsketch');
  await mkdir(settingsDir, { recursive: true });
  await writeFile(
    path.join(settingsDir, 'settings.json'),
    JSON.stringify(
      {
        enabledTools,
        reminders,
        createdBy: 'soulsketch setup wizard',
        updatedAt: new Date().toISOString()
      },
      null,
      2
    ) + '\n'
  );

  // ---- Step 6: final health check, so the wizard ends on a green light ----
  io.say('');
  const packFiles = await loadMemoryPackFiles(packPath).catch(() => null);
  if (packFiles) {
    const health = validateMemoryPackContents(packFiles);
    io.say(
      health.valid
        ? 'Health check: your Soul-Sanctum passed - all five memory files are in order. ✔'
        : `Health check: something is off - ${health.errors.join('; ')}`
    );
  }

  // ---- Step 7: print the config to paste, and say exactly WHERE ----
  io.say('');
  io.say('=========================================================');
  io.say('  Done! One last step: copy the snippet below into your');
  io.say('  AI tool\'s config file, save, and restart the tool.');
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
  for (const line of describeClientConfigLocations(process.platform)) io.say(line);
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

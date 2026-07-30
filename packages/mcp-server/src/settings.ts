import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Optional tools the user can enable/disable. The two "Need" tools
 * (read_pack, validate_pack) are always on: without them the assistant
 * cannot wake up or check a pack's health, so a server without them
 * would be pointless.
 */
export const OPTIONAL_TOOLS = ['observe', 'fingerprint', 'diff', 'continuity_record'] as const;
export type OptionalTool = (typeof OPTIONAL_TOOLS)[number];

export type SanctumReminder = {
  topic: string;
  remindAt: string; // ISO date - surfaced via read_pack once this passes
  note: string;
};

export type SanctumSettings = {
  enabledTools?: string[];
  reminders?: SanctumReminder[];
};

/**
 * Collect reminders that have come due for a pack. The settings file lives
 * in the Sanctum root (.soulsketch/settings.json); packs usually sit one
 * level below it, so we check both the pack directory and its parent.
 * Read-only: firing a reminder never modifies anything - it keeps appearing
 * until the user acts (e.g. re-runs the setup wizard, which reschedules it).
 */
export async function collectDueReminders(packDirectory: string, now = new Date()): Promise<string[]> {
  const candidates = [packDirectory, path.dirname(packDirectory)];
  for (const dir of candidates) {
    try {
      const raw = await readFile(path.join(dir, '.soulsketch', 'settings.json'), 'utf8');
      const settings = JSON.parse(raw) as SanctumSettings;
      return (settings.reminders ?? [])
        .filter((reminder) => new Date(reminder.remindAt) <= now)
        .map((reminder) => reminder.note);
    } catch {
      // No settings here - try the next candidate.
    }
  }
  return [];
}

/**
 * Decide which optional tools are enabled, in priority order:
 *   1. SOULSKETCH_TOOLS env var ("all", "none", or comma list, e.g. "observe,diff")
 *   2. .soulsketch/settings.json in the first allowed root (written by the setup wizard)
 *   3. Default: everything enabled
 */
export async function resolveEnabledOptionalTools(params: {
  allowedRoots: string[];
  env?: NodeJS.ProcessEnv;
}): Promise<OptionalTool[]> {
  const env = params.env ?? process.env;

  const fromEnv = env.SOULSKETCH_TOOLS?.trim();
  if (fromEnv) {
    if (fromEnv === 'all') return [...OPTIONAL_TOOLS];
    if (fromEnv === 'none') return [];
    return filterKnown(fromEnv.split(','));
  }

  for (const root of params.allowedRoots) {
    try {
      const raw = await readFile(path.join(root, '.soulsketch', 'settings.json'), 'utf8');
      const settings = JSON.parse(raw) as SanctumSettings;
      if (Array.isArray(settings.enabledTools)) return filterKnown(settings.enabledTools);
    } catch {
      // No settings file in this root - keep looking, then fall through to default.
    }
  }

  return [...OPTIONAL_TOOLS];
}

function filterKnown(names: string[]): OptionalTool[] {
  const wanted = new Set(names.map((name) => name.trim()));
  return OPTIONAL_TOOLS.filter((tool) => wanted.has(tool));
}

#!/usr/bin/env node
/**
 * Import markdown files into SoulSketch memory
 * Usage: pnpm ts-node scripts/import_md.ts --path ./notes --project SoulSketch
 */

import fs from "node:fs/promises";
import path from "node:path";
import { memoryAPI } from "../api/index.js";
import type { MemoryPacket } from "../api/types.js";
import { markdownToPacket } from "../sync/github_sync.js";

interface ImportOptions {
  path: string;
  project?: string;
  author?: string;
  visibility?: "owner" | "collaborator" | "public";
  dryRun?: boolean;
}

async function importMarkdown(options: ImportOptions) {
  console.log(`📥 Importing markdown from: ${options.path}`);
  console.log(`   Project: ${options.project || "N/A"}`);
  console.log(`   Author: ${options.author || "system"}`);
  console.log(`   Visibility: ${options.visibility || "owner"}`);
  console.log(`   Dry run: ${options.dryRun ? "YES" : "NO"}`);
  console.log("");

  const stats = await fs.stat(options.path);

  let files: string[] = [];

  if (stats.isDirectory()) {
    const dirFiles = await fs.readdir(options.path);
    files = dirFiles
      .filter((f) => f.endsWith(".md"))
      .map((f) => path.join(options.path, f));
  } else if (stats.isFile() && options.path.endsWith(".md")) {
    files = [options.path];
  } else {
    console.error("❌ Path must be a directory or .md file");
    process.exit(1);
  }

  console.log(`Found ${files.length} markdown files\n`);

  let imported = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const markdown = await fs.readFile(file, "utf8");

      let packet: MemoryPacket;

      // Try to parse as memory packet first
      try {
        packet = markdownToPacket(markdown);
      } catch {
        // If parsing fails, create a new packet from content
        const filename = path.basename(file, ".md");
        const firstLine = markdown.split("\n")[0].replace(/^#+\s*/, "");
        
        packet = {
          id: filename.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          title: firstLine || filename,
          content: markdown,
          created_at: new Date().toISOString(),
          authors: options.author ? [options.author] : ["system"],
          visibility: options.visibility || "owner",
          project: options.project,
        };
      }

      // Override with command line options if provided
      if (options.project) packet.project = options.project;
      if (options.author && !packet.authors.includes(options.author)) {
        packet.authors.push(options.author);
      }

      if (options.dryRun) {
        console.log(`✓ [DRY RUN] Would import: ${packet.id} - ${packet.title}`);
      } else {
        const result = await memoryAPI.upsertPacket(packet, "owner");
        console.log(`✓ Imported: ${packet.id} - ${packet.title}`);
        console.log(`  GitHub: ${result.backends.github}`);
        if (result.backends.notion) {
          console.log(`  Notion: ${result.backends.notion}`);
        }
      }

      imported++;
    } catch (error) {
      console.error(`✗ Failed to import ${file}:`, error);
      failed++;
    }
  }

  console.log("");
  console.log(`📊 Import complete:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Failed: ${failed}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: ImportOptions = { path: "" };

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === "--path" && args[i + 1]) {
    options.path = args[++i];
  } else if (arg === "--project" && args[i + 1]) {
    options.project = args[++i];
  } else if (arg === "--author" && args[i + 1]) {
    options.author = args[++i];
  } else if (arg === "--visibility" && args[i + 1]) {
    options.visibility = args[++i] as any;
  } else if (arg === "--dry-run") {
    options.dryRun = true;
  }
}

if (!options.path) {
  console.error("Usage: import_md.ts --path <path> [options]");
  console.error("");
  console.error("Options:");
  console.error("  --path <path>          Path to markdown file or directory (required)");
  console.error("  --project <name>       Project identifier");
  console.error("  --author <name>        Author name");
  console.error("  --visibility <level>   owner|collaborator|public (default: owner)");
  console.error("  --dry-run              Show what would be imported without doing it");
  process.exit(1);
}

importMarkdown(options).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

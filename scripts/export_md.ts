#!/usr/bin/env node
/**
 * Export memory packets to markdown files
 * Usage: pnpm ts-node scripts/export_md.ts --visibility public --out ./public
 */

import fs from "node:fs/promises";
import path from "node:path";
import { memoryAPI } from "../api/index.js";
import { packetToMarkdown } from "../sync/github_sync.js";

interface ExportOptions {
  out: string;
  project?: string;
  visibility?: "owner" | "collaborator" | "public";
  tags?: string[];
  since?: string;
  until?: string;
}

async function exportMarkdown(options: ExportOptions) {
  console.log(`📤 Exporting memory packets to: ${options.out}`);
  console.log(`   Project: ${options.project || "all"}`);
  console.log(`   Visibility: ${options.visibility || "all"}`);
  console.log(`   Tags: ${options.tags?.join(", ") || "all"}`);
  console.log("");

  // Create output directory
  await fs.mkdir(options.out, { recursive: true });

  // List packets with filters
  const packets = await memoryAPI.listPackets(
    {
      project: options.project,
      visibility: options.visibility,
      tags: options.tags,
      since: options.since,
      until: options.until,
    },
    "owner" // Export with owner role to get full content
  );

  console.log(`Found ${packets.length} packets to export\n`);

  let exported = 0;
  let failed = 0;

  for (const packet of packets) {
    try {
      const markdown = packetToMarkdown(packet);
      const date = new Date(packet.created_at).toISOString().slice(0, 10);
      const filename = `${date}_${packet.id}.md`;
      const filepath = path.join(options.out, filename);

      await fs.writeFile(filepath, markdown, "utf8");

      console.log(`✓ Exported: ${filename}`);
      exported++;
    } catch (error) {
      console.error(`✗ Failed to export ${packet.id}:`, error);
      failed++;
    }
  }

  console.log("");
  console.log(`📊 Export complete:`);
  console.log(`   Exported: ${exported}`);
  console.log(`   Failed: ${failed}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: ExportOptions = { out: "" };

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === "--out" && args[i + 1]) {
    options.out = args[++i];
  } else if (arg === "--project" && args[i + 1]) {
    options.project = args[++i];
  } else if (arg === "--visibility" && args[i + 1]) {
    options.visibility = args[++i] as any;
  } else if (arg === "--tags" && args[i + 1]) {
    options.tags = args[++i].split(",");
  } else if (arg === "--since" && args[i + 1]) {
    options.since = args[++i];
  } else if (arg === "--until" && args[i + 1]) {
    options.until = args[++i];
  }
}

if (!options.out) {
  console.error("Usage: export_md.ts --out <directory> [options]");
  console.error("");
  console.error("Options:");
  console.error("  --out <directory>      Output directory (required)");
  console.error("  --project <name>       Filter by project");
  console.error("  --visibility <level>   Filter by visibility (owner|collaborator|public)");
  console.error("  --tags <tag1,tag2>     Filter by tags (comma-separated)");
  console.error("  --since <date>         Filter by creation date (ISO format)");
  console.error("  --until <date>         Filter by creation date (ISO format)");
  process.exit(1);
}

exportMarkdown(options).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

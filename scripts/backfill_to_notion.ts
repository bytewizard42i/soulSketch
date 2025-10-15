#!/usr/bin/env node
/**
 * Backfill memory packets from GitHub to Notion
 * Usage: pnpm ts-node scripts/backfill_to_notion.ts --since 2025-10-01
 */

import { memoryAPI } from "../api/index.js";
import { batchSyncToNotion } from "../sync/notion_sync.js";
import meta from "../config/.soulmeta.json" assert { type: "json" };

interface BackfillOptions {
  since?: string;
  project?: string;
  dryRun?: boolean;
}

async function backfillToNotion(options: BackfillOptions) {
  console.log(`🔄 Backfilling memory packets to Notion`);
  console.log(`   Since: ${options.since || "all time"}`);
  console.log(`   Project: ${options.project || "all"}`);
  console.log(`   Dry run: ${options.dryRun ? "YES" : "NO"}`);
  console.log("");

  if (!meta.notion?.enabled) {
    console.error("❌ Notion is not enabled in .soulmeta.json");
    console.error("   Set notion.enabled: true and features.notion_sync: true");
    process.exit(1);
  }

  if (!process.env[meta.notion.integration_token_env]) {
    console.error(`❌ Notion token not found: ${meta.notion.integration_token_env}`);
    console.error(`   Set environment variable: export ${meta.notion.integration_token_env}=your_token`);
    process.exit(1);
  }

  // List packets from GitHub
  const packets = await memoryAPI.listPackets(
    {
      since: options.since,
      project: options.project,
    },
    "owner"
  );

  console.log(`Found ${packets.length} packets to sync\n`);

  if (options.dryRun) {
    console.log("Dry run - would sync the following packets:");
    for (const packet of packets) {
      console.log(`  - ${packet.id}: ${packet.title}`);
    }
    return;
  }

  const batchSize = meta.notion.sync?.batch_size || 10;
  let totalSynced = 0;
  let totalFailed = 0;

  for (let i = 0; i < packets.length; i += batchSize) {
    const batch = packets.slice(i, i + batchSize);
    console.log(`Syncing batch ${Math.floor(i / batchSize) + 1}...`);

    const result = await batchSyncToNotion(batch);
    totalSynced += result.synced;
    totalFailed += result.failed;

    // Rate limiting delay
    if (i + batchSize < packets.length) {
      console.log("Waiting 1s for rate limit...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log("");
  console.log(`📊 Backfill complete:`);
  console.log(`   Synced: ${totalSynced}`);
  console.log(`   Failed: ${totalFailed}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: BackfillOptions = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === "--since" && args[i + 1]) {
    options.since = args[++i];
  } else if (arg === "--project" && args[i + 1]) {
    options.project = args[++i];
  } else if (arg === "--dry-run") {
    options.dryRun = true;
  }
}

backfillToNotion(options).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

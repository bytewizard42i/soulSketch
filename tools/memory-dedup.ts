#!/usr/bin/env node
/**
 * SoulSketch Memory Deduplication Tool
 * Removes duplicate entries from runtime_observations.jsonl while preserving unique insights
 * 
 * Usage:
 *   node memory-dedup.ts <jsonl-file> [--dry-run] [--similarity-threshold=0.9]
 */

import * as fs from 'fs-extra';
import { createHash } from 'crypto';

interface RuntimeObservation {
  date?: string;
  timestamp?: string;
  note?: string;
  content?: string;
  observation?: string;
  type?: string;
  [key: string]: any;
}

interface DeduplicationStats {
  totalEntries: number;
  uniqueEntries: number;
  duplicatesRemoved: number;
  similarEntriesMerged: number;
}

/**
 * Calculate simple text similarity using Jaccard similarity
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Extract main content from observation object
 */
function extractContent(obs: RuntimeObservation): string {
  return obs.note || obs.content || obs.observation || JSON.stringify(obs);
}

/**
 * Generate hash for exact duplicate detection
 */
function generateHash(content: string): string {
  return createHash('sha256').update(content.toLowerCase().trim()).digest('hex');
}

/**
 * Deduplicate runtime observations
 */
async function deduplicateMemories(
  filePath: string,
  dryRun: boolean = false,
  similarityThreshold: number = 0.9
): Promise<DeduplicationStats> {
  console.log('🧬 SoulSketch Memory Deduplication');
  console.log(`📁 Processing: ${filePath}`);
  console.log(`🎯 Similarity threshold: ${(similarityThreshold * 100).toFixed(0)}%`);
  if (dryRun) console.log('🔍 DRY RUN MODE - No changes will be saved\n');

  // Read all observations
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const observations: RuntimeObservation[] = [];
  for (const line of lines) {
    try {
      observations.push(JSON.parse(line));
    } catch (e) {
      console.warn(`⚠️  Skipping invalid JSON line: ${line.substring(0, 50)}...`);
    }
  }

  console.log(`📊 Total entries: ${observations.length}`);

  // Stage 1: Remove exact duplicates by hash
  const seen = new Map<string, RuntimeObservation>();
  const uniqueByHash: RuntimeObservation[] = [];
  let exactDuplicates = 0;

  for (const obs of observations) {
    const content = extractContent(obs);
    const hash = generateHash(content);
    
    if (!seen.has(hash)) {
      seen.set(hash, obs);
      uniqueByHash.push(obs);
    } else {
      exactDuplicates++;
      console.log(`❌ Exact duplicate: "${content.substring(0, 60)}..."`);
    }
  }

  console.log(`\n✅ Stage 1: Removed ${exactDuplicates} exact duplicates`);
  console.log(`   Remaining: ${uniqueByHash.length} entries`);

  // Stage 2: Merge similar entries
  const finalEntries: RuntimeObservation[] = [];
  const processed = new Set<number>();
  let similarMerged = 0;

  for (let i = 0; i < uniqueByHash.length; i++) {
    if (processed.has(i)) continue;
    
    const current = uniqueByHash[i];
    const currentContent = extractContent(current);
    let merged = false;

    // Check against already finalized entries
    for (const final of finalEntries) {
      const finalContent = extractContent(final);
      const similarity = calculateSimilarity(currentContent, finalContent);
      
      if (similarity >= similarityThreshold) {
        // Very similar - merge by keeping the more detailed one
        if (currentContent.length > finalContent.length) {
          // Replace with more detailed version
          const index = finalEntries.indexOf(final);
          finalEntries[index] = current;
        }
        merged = true;
        similarMerged++;
        console.log(`🔗 Merged similar (${(similarity * 100).toFixed(0)}%): "${currentContent.substring(0, 50)}..."`);
        break;
      }
    }

    if (!merged) {
      finalEntries.push(current);
    }
    processed.add(i);
  }

  console.log(`\n✅ Stage 2: Merged ${similarMerged} similar entries`);
  console.log(`   Final count: ${finalEntries.length} unique entries`);

  const stats: DeduplicationStats = {
    totalEntries: observations.length,
    uniqueEntries: finalEntries.length,
    duplicatesRemoved: exactDuplicates,
    similarEntriesMerged: similarMerged
  };

  // Save results
  if (!dryRun) {
    // Backup original
    const backupPath = `${filePath}.backup-${Date.now()}`;
    await fs.copy(filePath, backupPath);
    console.log(`\n💾 Backup created: ${backupPath}`);

    // Write deduplicated file
    const output = finalEntries.map(obs => JSON.stringify(obs)).join('\n') + '\n';
    await fs.writeFile(filePath, output);
    console.log(`✅ Deduplicated file saved: ${filePath}`);
  } else {
    console.log(`\n🔍 DRY RUN: Would save ${finalEntries.length} entries (no changes made)`);
  }

  // Print summary
  console.log('\n📊 Deduplication Summary:');
  console.log(`   Original entries: ${stats.totalEntries}`);
  console.log(`   Unique entries: ${stats.uniqueEntries}`);
  console.log(`   Exact duplicates removed: ${stats.duplicatesRemoved}`);
  console.log(`   Similar entries merged: ${stats.similarEntriesMerged}`);
  console.log(`   Space saved: ${((1 - stats.uniqueEntries / stats.totalEntries) * 100).toFixed(1)}%`);

  return stats;
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: memory-dedup <jsonl-file> [options]');
    console.log('\nOptions:');
    console.log('  --dry-run                    Show what would be removed without making changes');
    console.log('  --similarity-threshold=N     Set similarity threshold (0.0-1.0, default: 0.9)');
    console.log('\nExample:');
    console.log('  memory-dedup runtime_observations.jsonl --dry-run');
    console.log('  memory-dedup runtime_observations.jsonl --similarity-threshold=0.85');
    process.exit(1);
  }

  const filePath = args[0];
  const dryRun = args.includes('--dry-run');
  
  let threshold = 0.9;
  const thresholdArg = args.find(arg => arg.startsWith('--similarity-threshold='));
  if (thresholdArg) {
    threshold = parseFloat(thresholdArg.split('=')[1]);
    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
      console.error('❌ Similarity threshold must be between 0.0 and 1.0');
      process.exit(1);
    }
  }

  try {
    await deduplicateMemories(filePath, dryRun, threshold);
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();

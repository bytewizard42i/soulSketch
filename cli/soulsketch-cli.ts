#!/usr/bin/env node

/**
 * SoulSketch CLI
 * Command-line interface for managing memory packs and identity transitions
 * Inspired by Cipher's CLI architecture
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import inquirer from 'inquirer';
import { MemoryEngine } from '../protocol/memory-engine.js';
import { SessionManager } from '../protocol/session-manager.js';
import { MemoryValidator } from '../protocol/memory-validator.js';
import { KnowledgeGraph } from '../protocol/knowledge-graph.js';
import {
  computeMemoryPackFingerprint,
  getMemoryPackFileOrder,
  type MemoryPackFiles
} from '../packages/core/src/continuity.js';
import { diffMemoryPacks, type MemoryPackDiffReport } from '../packages/core/src/diff.js';

const program = new Command();

// Read the version from the monorepo package.json so the CLI can never
// drift out of sync with the released version again.
const repoRootDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION: string = fs.readJsonSync(path.join(repoRootDirectory, 'package.json')).version;

// ASCII art logo
const LOGO = `
╔═══════════════════════════════════════╗
║   ____             _ ____  _        _ ║
║  / ___|  ___  _   _| / ___|| | ___  | ║
║  \\___ \\ / _ \\| | | | \\___ \\| |/ / | | ║
║   ___) | (_) | |_| | |___) |   <| |_| ║
║  |____/ \\___/ \\__,_|_|____/|_|\\_\\\\__,_|║
║                                       ║
║     Identity Preservation Protocol    ║
╚═══════════════════════════════════════╝
`;

// Initialize components
const memoryEngine = new MemoryEngine();
const sessionManager = new SessionManager();
const validator = new MemoryValidator();
const knowledgeGraph = new KnowledgeGraph();

program
  .name('soulsketch')
  .description('SoulSketch CLI - AI Identity & Memory Management')
  .version(VERSION);

/**
 * Memory Commands
 */
const memoryCmd = program
  .command('memory')
  .description('Manage memories and memory packs');

memoryCmd
  .command('store <content>')
  .description('Store a new memory')
  .option('-t, --type <type>', 'Memory type (persona/relationship/technical/stylistic/runtime)', 'runtime')
  .option('-e, --embedding <embedding>', 'Embedding vector (JSON array)')
  .action(async (content, options) => {
    const spinner = ora('Storing memory...').start();
    
    try {
      const memory = await memoryEngine.storeMemory({
        category: options.type,
        content,
        embedding: options.embedding ? JSON.parse(options.embedding) : undefined
      });
      
      spinner.succeed(chalk.green(`Memory stored successfully: ${memory}`));
    } catch (error) {
      spinner.fail(chalk.red(`Failed to store memory: ${error.message}`));
      process.exit(1);
    }
  });

memoryCmd
  .command('search <query>')
  .description('Search memories semantically')
  .option('-l, --limit <limit>', 'Maximum results', '10')
  .option('-e, --embedding <embedding>', 'Query embedding (JSON array)')
  .action(async (query, options) => {
    const spinner = ora('Searching memories...').start();
    
    try {
      const results = await memoryEngine.searchMemories(
        query,
        options.embedding ? JSON.parse(options.embedding) : undefined,
        parseInt(options.limit)
      );
      
      spinner.stop();
      
      if (results.length === 0) {
        console.log(chalk.yellow('No memories found matching your query.'));
        return;
      }
      
      console.log(chalk.cyan(`\nFound ${results.length} memories:\n`));
      
      const tableData = [
        ['ID', 'Type', 'Content (Preview)', 'Resonance'],
        ...results.map(m => [
          m.id.substring(0, 20) + '...',
          m.type,
          JSON.stringify(m.content).substring(0, 50) + '...',
          m.resonanceScore?.toFixed(2) || 'N/A'
        ])
      ];
      
      console.log(table(tableData));
    } catch (error) {
      spinner.fail(chalk.red(`Search failed: ${error.message}`));
      process.exit(1);
    }
  });

memoryCmd
  .command('symphony')
  .description('Create a complete memory symphony (snapshot)')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    const spinner = ora('Creating memory symphony...').start();
    
    try {
      const pack = await memoryEngine.createSymphony();
      
      spinner.succeed(chalk.green('Memory symphony created successfully'));
      
      // Display statistics
      console.log(chalk.cyan('\nSymphony Statistics:'));
      console.log(`  ${chalk.white('Persona:')} ${pack.persona.length} memories`);
      console.log(`  ${chalk.white('Relationships:')} ${pack.relationships.length} memories`);
      console.log(`  ${chalk.white('Technical:')} ${pack.technical.length} memories`);
      console.log(`  ${chalk.white('Stylistic:')} ${pack.stylistic.length} memories`);
      console.log(`  ${chalk.white('Runtime:')} ${pack.runtime.length} memories`);
      console.log(`  ${chalk.white('Symphony Hash:')} ${pack.metadata.symphonyHash}`);
      
      if (options.output) {
        await fs.writeJson(options.output, pack, { spaces: 2 });
        console.log(chalk.green(`\nSymphony saved to: ${options.output}`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed to create symphony: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Validation Commands
 */
const validateCmd = program
  .command('validate')
  .description('Validate and repair memory integrity');

validateCmd
  .command('pack <path>')
  .description('Validate a memory pack JSON file or 5-file SoulSketch directory')
  .option('-r, --repair', 'Attempt to repair corrupted memories')
  .option('-s, --strict', 'Use strict validation mode')
  .action(async (packPath, options) => {
    const spinner = ora('Loading memory pack...').start();
    
    try {
      const stats = await fs.stat(packPath);
      if (stats.isDirectory()) {
        spinner.text = 'Validating 5-file memory pack directory...';
        const result = await validateFiveFileMemoryPack(packPath);
        spinner.stop();
        console.log(formatFiveFileValidationReport(result));
        process.exit(result.valid ? 0 : 1);
      }

      const pack = await fs.readJson(packPath);
      spinner.text = 'Validating memory pack...';
      
      const validator = new MemoryValidator({
        strictMode: options.strict
      });
      
      const result = await validator.validateMemoryPack(pack);
      spinner.stop();
      
      // Display validation report
      const report = validator.generateReport(result);
      console.log(report);
      
      if (!result.valid && options.repair) {
        const repairSpinner = ora('Attempting repairs...').start();
        const repaired = await validator.repairMemoryPack(pack);
        
        const repairedPath = packPath.replace('.json', '-repaired.json');
        await fs.writeJson(repairedPath, repaired, { spaces: 2 });
        
        repairSpinner.succeed(chalk.green(`Repaired pack saved to: ${repairedPath}`));
      }
      
      process.exit(result.valid ? 0 : 1);
    } catch (error) {
      spinner.fail(chalk.red(`Validation failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Fingerprint Command
 * Computes the deterministic identity fingerprint of a 5-file memory pack.
 * The fingerprint is safe to publish: it refers to a memory state without
 * revealing its contents (see packages/core/src/continuity.ts).
 */
program
  .command('fingerprint <pack>')
  .description('Compute the deterministic fingerprint of a 5-file memory pack directory')
  .option('-j, --json', 'Output machine-readable JSON')
  .action(async (packPath, options) => {
    try {
      const memoryPackFiles = await loadFiveFileMemoryPack(packPath);
      const { fingerprint, fileHashes } = computeMemoryPackFingerprint(memoryPackFiles);

      if (options.json) {
        console.log(JSON.stringify({ pack: path.resolve(packPath), fingerprint, fileHashes }, null, 2));
        return;
      }

      console.log(chalk.cyan('\nSoulSketch Memory Pack Fingerprint'));
      console.log(`${chalk.white('Pack:')} ${path.resolve(packPath)}`);
      console.log(`${chalk.white('Fingerprint:')} ${chalk.green(fingerprint)}\n`);
      console.log(chalk.cyan('Per-file hashes:'));
      for (const fileName of getMemoryPackFileOrder()) {
        console.log(`  ${chalk.white(fileName.padEnd(28))} ${fileHashes[fileName]}`);
      }
    } catch (error) {
      console.error(chalk.red(`Fingerprint failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Diff Command
 * Compares two memory packs and explains WHICH identity dimension changed
 * (persona vs relationships vs technical vs voice vs runtime observations),
 * not just that bytes differ.
 */
program
  .command('diff <packA> <packB>')
  .description('Compare two 5-file memory pack directories and explain what changed')
  .option('-j, --json', 'Output machine-readable JSON')
  .option('--exit-code', 'Exit with code 1 when the packs differ (like git diff --exit-code)')
  .action(async (packAPath, packBPath, options) => {
    try {
      const packAFiles = await loadFiveFileMemoryPack(packAPath);
      const packBFiles = await loadFiveFileMemoryPack(packBPath);
      const diffReport = diffMemoryPacks(packAFiles, packBFiles);

      if (options.json) {
        console.log(
          JSON.stringify(
            { packA: path.resolve(packAPath), packB: path.resolve(packBPath), ...diffReport },
            null,
            2
          )
        );
      } else {
        console.log(formatMemoryPackDiffReport(packAPath, packBPath, diffReport));
      }

      if (options.exitCode && !diffReport.identical) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Diff failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Session Commands
 */
const sessionCmd = program
  .command('session')
  .description('Manage identity transition sessions');

sessionCmd
  .command('create <source> <target>')
  .description('Create a new identity transition session')
  .action(async (source, target) => {
    const spinner = ora('Creating transition session...').start();
    
    try {
      const session = await sessionManager.createTransitionSession(source, target);
      
      spinner.succeed(chalk.green('Transition session created'));
      console.log(chalk.cyan(`\nSession ID: ${session.id}`));
      console.log(`${chalk.white('From:')} ${source}`);
      console.log(`${chalk.white('To:')} ${target}`);
      console.log(`${chalk.white('Status:')} ${session.status}`);
    } catch (error) {
      spinner.fail(chalk.red(`Failed to create session: ${error.message}`));
      process.exit(1);
    }
  });

sessionCmd
  .command('list')
  .description('List all transition sessions')
  .option('-a, --active', 'Show only active sessions')
  .action(async (options) => {
    const sessions = options.active 
      ? sessionManager.getActiveSessions()
      : Array.from((sessionManager as any).sessions.values());
    
    if (sessions.length === 0) {
      console.log(chalk.yellow('No sessions found.'));
      return;
    }
    
    const tableData = [
      ['Session ID', 'Source', 'Target', 'Status', 'Started'],
      ...sessions.map(s => [
        s.id.substring(0, 8) + '...',
        s.sourceIdentity,
        s.targetIdentity,
        s.status,
        new Date(s.startTime).toLocaleString()
      ])
    ];
    
    console.log(table(tableData));
  });

/**
 * Graph Commands
 */
const graphCmd = program
  .command('graph')
  .description('Manage knowledge graph relationships');

graphCmd
  .command('stats')
  .description('Display graph statistics')
  .action(async () => {
    const stats = knowledgeGraph.getStatistics();
    
    console.log(chalk.cyan('\nKnowledge Graph Statistics:'));
    console.log(`  ${chalk.white('Nodes:')} ${stats.nodeCount}`);
    console.log(`  ${chalk.white('Edges:')} ${stats.edgeCount}`);
    console.log(`  ${chalk.white('Clusters:')} ${stats.clusterCount}`);
    console.log(`  ${chalk.white('Average Degree:')} ${stats.avgDegree.toFixed(2)}`);
    console.log(`  ${chalk.white('Density:')} ${(stats.density * 100).toFixed(1)}%`);
    console.log(`  ${chalk.white('Components:')} ${stats.components}`);
  });

graphCmd
  .command('traverse <startNode>')
  .description('Traverse graph from a starting node')
  .option('-d, --depth <depth>', 'Maximum traversal depth', '3')
  .option('-t, --type <type>', 'Node type filter')
  .action(async (startNode, options) => {
    const spinner = ora('Traversing graph...').start();
    
    try {
      const nodes = knowledgeGraph.traverse({
        startNode,
        maxDepth: parseInt(options.depth),
        nodeType: options.type
      });
      
      spinner.stop();
      
      if (nodes.length === 0) {
        console.log(chalk.yellow('No nodes found.'));
        return;
      }
      
      console.log(chalk.cyan(`\nFound ${nodes.length} nodes:\n`));
      
      nodes.forEach(node => {
        const indent = '  ';
        console.log(`${indent}${chalk.white(node.id)}`);
        console.log(`${indent}  Type: ${node.type}`);
        console.log(`${indent}  Label: ${node.label}`);
        console.log(`${indent}  Weight: ${node.weight.toFixed(2)}`);
      });
    } catch (error) {
      spinner.fail(chalk.red(`Traversal failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Interactive mode
 */
program
  .command('interactive')
  .description('Start interactive mode')
  .action(async () => {
    console.log(chalk.cyan(LOGO));
    console.log(chalk.gray('Welcome to SoulSketch Interactive Mode\n'));
    
    let running = true;
    
    while (running) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '📝 Store a new memory', value: 'store' },
            { name: '🔍 Search memories', value: 'search' },
            { name: '🎼 Create memory symphony', value: 'symphony' },
            { name: '✅ Validate memory pack', value: 'validate' },
            { name: '🔄 Start identity transition', value: 'transition' },
            { name: '📊 View graph statistics', value: 'graph' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);
      
      switch (action) {
        case 'store':
          await interactiveStore();
          break;
        case 'search':
          await interactiveSearch();
          break;
        case 'symphony':
          await memoryEngine.createSymphony();
          console.log(chalk.green('Symphony created successfully!'));
          break;
        case 'validate':
          await interactiveValidate();
          break;
        case 'transition':
          await interactiveTransition();
          break;
        case 'graph': {
          const stats = knowledgeGraph.getStatistics();
          console.log(chalk.cyan('\nGraph Statistics:'));
          console.log(JSON.stringify(stats, null, 2));
          break;
        }
        case 'exit':
          running = false;
          break;
      }
      
      if (running) {
        console.log(''); // Add spacing
      }
    }
    
    console.log(chalk.gray('\nGoodbye! Your memories resonate eternally. 🌟'));
  });

/**
 * Interactive helper functions
 */
async function interactiveStore() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Memory type:',
      choices: ['persona', 'relationship', 'technical', 'stylistic', 'runtime']
    },
    {
      type: 'editor',
      name: 'content',
      message: 'Memory content:'
    }
  ]);
  
  const memory = await memoryEngine.storeMemory(answers);
  console.log(chalk.green(`✓ Memory stored: ${memory.id}`));
}

async function interactiveSearch() {
  const { query } = await inquirer.prompt([
    {
      type: 'input',
      name: 'query',
      message: 'Search query:'
    }
  ]);
  
  const results = await memoryEngine.searchMemories(query);
  
  if (results.length === 0) {
    console.log(chalk.yellow('No memories found.'));
  } else {
    console.log(chalk.cyan(`Found ${results.length} memories:`));
    results.forEach(m => {
      console.log(`  • [${m.type}] ${m.content.substring(0, 60)}...`);
    });
  }
}

async function interactiveValidate() {
  const { file } = await inquirer.prompt([
    {
      type: 'input',
      name: 'file',
      message: 'Path to memory pack file:'
    }
  ]);
  
  try {
    const stats = await fs.stat(file);
    if (stats.isDirectory()) {
      const result = await validateFiveFileMemoryPack(file);
      console.log(formatFiveFileValidationReport(result));
    } else {
      const pack = await fs.readJson(file);
      const result = await validator.validateMemoryPack(pack);
      console.log(validator.generateReport(result));
    }
  } catch (error) {
    console.log(chalk.red(`Validation failed: ${error.message}`));
  }
}

async function interactiveTransition() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'source',
      message: 'Source identity:'
    },
    {
      type: 'input',
      name: 'target',
      message: 'Target identity:'
    }
  ]);
  
  const session = await sessionManager.createTransitionSession(answers.source, answers.target);
  console.log(chalk.green(`✓ Transition session created: ${session.id}`));
}

// Error handling
process.on('unhandledRejection', (error: Error) => {
  console.error(chalk.red(`\nUnhandled error: ${error.message}`));
  process.exit(1);
});

type FiveFileValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  filesChecked: number;
};

const requiredMemoryPackFiles = [
  'persona.md',
  'relationship_dynamics.md',
  'technical_domains.md',
  'stylistic_voice.md',
  'runtime_observations.jsonl'
] as const;

async function validateFiveFileMemoryPack(packDirectory: string): Promise<FiveFileValidationResult> {
  const result: FiveFileValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    filesChecked: 0
  };

  for (const fileName of requiredMemoryPackFiles) {
    const filePath = path.join(packDirectory, fileName);
    if (!await fs.pathExists(filePath)) {
      result.valid = false;
      result.errors.push(`Missing required file: ${fileName}`);
      continue;
    }

    const content = await fs.readFile(filePath, 'utf8');
    result.filesChecked++;

    if (content.trim().length === 0) {
      result.valid = false;
      result.errors.push(`${fileName} is empty`);
    }

    if (fileName.endsWith('.md') && !content.includes('#')) {
      result.warnings.push(`${fileName} has no Markdown heading`);
    }

    if (fileName === 'runtime_observations.jsonl') {
      validateRuntimeObservations(content, result);
    }
  }

  return result;
}

function validateRuntimeObservations(content: string, result: FiveFileValidationResult): void {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    result.warnings.push('runtime_observations.jsonl has no observations yet');
    return;
  }

  lines.forEach((line, index) => {
    try {
      const observation = JSON.parse(line);
      if (!observation.date && !observation.timestamp) {
        result.warnings.push(`runtime_observations.jsonl line ${index + 1} has no date or timestamp`);
      }
      if (!observation.note && !observation.observation && !observation.content) {
        result.warnings.push(`runtime_observations.jsonl line ${index + 1} has no note-like field`);
      }
    } catch {
      result.valid = false;
      result.errors.push(`runtime_observations.jsonl line ${index + 1} is invalid JSON`);
    }
  });
}

/**
 * Load the 5 canonical memory pack files from a directory into memory.
 * Fails loudly with the full list of missing files so the user can fix the
 * pack in one pass instead of replaying the command per missing file.
 */
async function loadFiveFileMemoryPack(packDirectory: string): Promise<MemoryPackFiles> {
  const stats = await fs.stat(packDirectory).catch(() => null);
  if (!stats || !stats.isDirectory()) {
    throw new Error(`Not a memory pack directory: ${packDirectory}`);
  }

  const missingFiles: string[] = [];
  const memoryPackFiles = {} as MemoryPackFiles;

  for (const fileName of getMemoryPackFileOrder()) {
    const filePath = path.join(packDirectory, fileName);
    if (await fs.pathExists(filePath)) {
      memoryPackFiles[fileName] = await fs.readFile(filePath, 'utf8');
    } else {
      missingFiles.push(fileName);
    }
  }

  if (missingFiles.length > 0) {
    throw new Error(
      `${packDirectory} is missing required memory pack files: ${missingFiles.join(', ')}. ` +
        `A SoulSketch pack needs all 5 files (see examples/reference_memory_pack).`
    );
  }

  return memoryPackFiles;
}

function formatMemoryPackDiffReport(
  packAPath: string,
  packBPath: string,
  report: MemoryPackDiffReport
): string {
  const lines = [
    chalk.cyan('\nSoulSketch Memory Pack Diff'),
    `${chalk.white('Pack A:')} ${path.resolve(packAPath)}`,
    `${chalk.white('Pack B:')} ${path.resolve(packBPath)}`,
    `${chalk.white('Fingerprint A:')} ${report.fingerprintA}`,
    `${chalk.white('Fingerprint B:')} ${report.fingerprintB}`,
    ''
  ];

  if (report.identical) {
    lines.push(chalk.green('The packs are identical: same identity state, same fingerprint.'));
    return lines.join('\n');
  }

  lines.push(chalk.yellow(`Identity changed in ${report.changedDimensions.length} dimension(s):`), '');

  for (const file of report.files) {
    if (!file.changed) {
      lines.push(`  ${chalk.gray('unchanged')}  ${file.dimension} (${file.file})`);
      continue;
    }
    const lineDeltaText =
      file.lineDelta === 0
        ? 'same line count, content edited'
        : `${file.lineDelta > 0 ? '+' : ''}${file.lineDelta} non-empty line(s)`;
    lines.push(`  ${chalk.yellow('changed  ')}  ${chalk.white(file.dimension)} (${file.file}): ${lineDeltaText}`);
  }

  lines.push('', chalk.gray('Tip: run `git diff` inside the pack repo to see the exact text changes.'));
  return lines.join('\n');
}

function formatFiveFileValidationReport(result: FiveFileValidationResult): string {
  const lines = [
    '=== SoulSketch 5-File Memory Pack Validation Report ===',
    `Status: ${result.valid ? 'VALID' : 'INVALID'}`,
    `Files checked: ${result.filesChecked}`,
    ''
  ];

  if (result.errors.length > 0) {
    lines.push(`Errors (${result.errors.length}):`);
    result.errors.forEach((error) => lines.push(`  - ${error}`));
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push(`Warnings (${result.warnings.length}):`);
    result.warnings.forEach((warning) => lines.push(`  - ${warning}`));
    lines.push('');
  }

  lines.push('=======================================================');
  return lines.join('\n');
}

// Parse arguments after every helper is initialized.
program.parse(process.argv);

// Show help if no command provided.
if (!process.argv.slice(2).length) {
  console.log(chalk.cyan(LOGO));
  program.outputHelp();
}

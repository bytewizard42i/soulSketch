#!/usr/bin/env node
/**
 * SoulSketch Memory Format Converter
 * Converts between human-friendly Markdown format and machine-friendly JSON format
 * 
 * Usage:
 *   node memory-converter.ts md-to-json <input-dir> <output-file>
 *   node memory-converter.ts json-to-md <input-file> <output-dir>
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { createHash } from 'crypto';

interface MemoryPackJSON {
  version: string;
  identity: {
    id: string;
    name: string;
    created: string;
    lastModified: string;
  };
  memories: {
    persona: any;
    relationships: any[];
    stylistic: any;
    technical: any[];
    runtime: any[];
  };
  metadata: {
    llmDefaults?: any;
    embeddingConfig?: any;
  };
}

/**
 * Convert Markdown memory pack to JSON format
 */
async function markdownToJSON(inputDir: string, outputFile: string): Promise<void> {
  console.log('🔄 Converting Markdown to JSON...');
  
  const pack: MemoryPackJSON = {
    version: '1.1.0',
    identity: {
      id: createHash('sha256').update(inputDir).digest('hex').substring(0, 16),
      name: path.basename(inputDir),
      created: new Date().toISOString(),
      lastModified: new Date().toISOString()
    },
    memories: {
      persona: {},
      relationships: [],
      stylistic: {},
      technical: [],
      runtime: []
    },
    metadata: {}
  };

  // Read persona.md
  const personaFile = path.join(inputDir, 'persona.md');
  if (await fs.pathExists(personaFile)) {
    const content = await fs.readFile(personaFile, 'utf-8');
    pack.memories.persona = parseMarkdownToObject(content);
  }

  // Read relationship_dynamics.md
  const relationshipsFile = path.join(inputDir, 'relationship_dynamics.md');
  if (await fs.pathExists(relationshipsFile)) {
    const content = await fs.readFile(relationshipsFile, 'utf-8');
    pack.memories.relationships = [parseMarkdownToObject(content)];
  }

  // Read stylistic_voice.md
  const stylisticFile = path.join(inputDir, 'stylistic_voice.md');
  if (await fs.pathExists(stylisticFile)) {
    const content = await fs.readFile(stylisticFile, 'utf-8');
    pack.memories.stylistic = parseMarkdownToObject(content);
  }

  // Read technical_domains.md
  const technicalFile = path.join(inputDir, 'technical_domains.md');
  if (await fs.pathExists(technicalFile)) {
    const content = await fs.readFile(technicalFile, 'utf-8');
    pack.memories.technical = [parseMarkdownToObject(content)];
  }

  // Read runtime_observations.jsonl
  const runtimeFile = path.join(inputDir, 'runtime_observations.jsonl');
  if (await fs.pathExists(runtimeFile)) {
    const content = await fs.readFile(runtimeFile, 'utf-8');
    pack.memories.runtime = content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return { content: line, timestamp: new Date().toISOString() };
        }
      });
  }

  // Write JSON output
  await fs.writeJson(outputFile, pack, { spaces: 2 });
  console.log(`✅ Converted to JSON: ${outputFile}`);
  console.log(`   Persona: ${Object.keys(pack.memories.persona).length} sections`);
  console.log(`   Relationships: ${pack.memories.relationships.length} entries`);
  console.log(`   Technical: ${pack.memories.technical.length} entries`);
  console.log(`   Runtime: ${pack.memories.runtime.length} observations`);
}

/**
 * Convert JSON memory pack to Markdown format
 */
async function jsonToMarkdown(inputFile: string, outputDir: string): Promise<void> {
  console.log('🔄 Converting JSON to Markdown...');
  
  const pack: MemoryPackJSON = await fs.readJson(inputFile);
  await fs.ensureDir(outputDir);

  // Write persona.md
  if (pack.memories.persona) {
    const content = objectToMarkdown('Persona', pack.memories.persona);
    await fs.writeFile(path.join(outputDir, 'persona.md'), content);
  }

  // Write relationship_dynamics.md
  if (pack.memories.relationships && pack.memories.relationships.length > 0) {
    const content = objectToMarkdown('Relationship Dynamics', pack.memories.relationships[0]);
    await fs.writeFile(path.join(outputDir, 'relationship_dynamics.md'), content);
  }

  // Write stylistic_voice.md
  if (pack.memories.stylistic) {
    const content = objectToMarkdown('Stylistic Voice', pack.memories.stylistic);
    await fs.writeFile(path.join(outputDir, 'stylistic_voice.md'), content);
  }

  // Write technical_domains.md
  if (pack.memories.technical && pack.memories.technical.length > 0) {
    const content = objectToMarkdown('Technical Domains', pack.memories.technical[0]);
    await fs.writeFile(path.join(outputDir, 'technical_domains.md'), content);
  }

  // Write runtime_observations.jsonl
  if (pack.memories.runtime && pack.memories.runtime.length > 0) {
    const lines = pack.memories.runtime.map(obs => JSON.stringify(obs)).join('\n') + '\n';
    await fs.writeFile(path.join(outputDir, 'runtime_observations.jsonl'), lines);
  }

  console.log(`✅ Converted to Markdown: ${outputDir}`);
  console.log(`   Created 5-fold memory structure`);
}

/**
 * Parse Markdown content into structured object
 */
function parseMarkdownToObject(markdown: string): any {
  const lines = markdown.split('\n');
  const result: any = {};
  let currentSection = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      // Save previous section
      if (currentSection) {
        result[currentSection] = currentContent.join('\n').trim();
      }
      // Start new section
      currentSection = line.substring(3).trim().toLowerCase().replace(/\s+/g, '_');
      currentContent = [];
    } else if (line.startsWith('# ')) {
      // Top-level heading - use as title
      result.title = line.substring(2).trim();
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    result[currentSection] = currentContent.join('\n').trim();
  }

  return result;
}

/**
 * Convert structured object to Markdown
 */
function objectToMarkdown(title: string, obj: any): string {
  let md = `# ${title}\n\n`;

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'title') continue;
    
    const heading = key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    md += `## ${heading}\n\n`;
    md += `${value}\n\n`;
  }

  return md;
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage:');
    console.log('  memory-converter md-to-json <input-dir> <output-file>');
    console.log('  memory-converter json-to-md <input-file> <output-dir>');
    process.exit(1);
  }

  const command = args[0];
  const input = args[1];
  const output = args[2];

  try {
    if (command === 'md-to-json') {
      await markdownToJSON(input, output);
    } else if (command === 'json-to-md') {
      await jsonToMarkdown(input, output);
    } else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();

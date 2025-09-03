#!/usr/bin/env tsx
/**
 * SoulSketch Pack Importer CLI
 * Imports SoulSketch memory packs into Cipher-compatible format
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import Ajv from 'ajv';
import { createHash } from 'crypto';
import { homedir } from 'os';

// Import schema and memory engine
import packSchema from '../schemas/soulsketch-pack.schema.json';
import { MemoryEngine } from '../protocol/memory-engine';
import { SessionManager } from '../protocol/session-manager';

interface ImportOptions {
  validate?: boolean;
  dryRun?: boolean;
  output?: string;
  force?: boolean;
  verbose?: boolean;
}

class SoulSketchImporter {
  private ajv: Ajv;
  private memoryEngine: MemoryEngine;
  private sessionManager: SessionManager;
  private spinner: ora.Ora;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    // Add format validators manually to avoid ajv-formats compatibility issues
    this.ajv.addFormat('date-time', true);
    this.ajv.addFormat('email', true);
    this.ajv.addFormat('uri', true);
    this.memoryEngine = new MemoryEngine('import-session');
    this.sessionManager = new SessionManager();
    this.spinner = ora();
  }

  /**
   * Validate pack against schema
   */
  private validatePack(pack: any): { valid: boolean; errors?: string[] } {
    const validate = this.ajv.compile(packSchema);
    const valid = validate(pack);
    
    if (!valid && validate.errors) {
      const errors = validate.errors.map(err => 
        `${err.instancePath || 'root'}: ${err.message}`
      );
      return { valid: false, errors };
    }
    
    return { valid: true };
  }

  /**
   * Normalize legacy pack format to new schema
   */
  private normalizePack(packPath: string): any {
    const pack = fs.readJsonSync(packPath);
    
    // If already in new format, return as-is
    if (pack.version && pack.identity && pack.memories) {
      return pack;
    }

    // Convert legacy format
    const normalized: any = {
      version: "1.0.0",
      identity: {
        id: this.generateULID(),
        name: pack.name || "Unknown",
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      },
      memories: {
        persona: this.wrapMemory('persona', pack.persona || {}),
        relationships: [],
        stylistic: this.wrapMemory('stylistic', pack.stylistic_voice || {}),
        technical: [],
        runtime: []
      },
      metadata: {
        llmDefaults: {},
        toolPreferences: [],
        embeddingConfig: {
          backend: "openai",
          model: "text-embedding-3-small",
          dimensions: 1536
        }
      },
      migrations: []
    };

    // Parse relationships from markdown if exists
    if (pack.relationship_dynamics) {
      normalized.memories.relationships = this.parseRelationships(pack.relationship_dynamics);
    }

    // Parse technical domains
    if (pack.technical_domains) {
      normalized.memories.technical = this.parseTechnicalDomains(pack.technical_domains);
    }

    // Parse runtime observations
    if (pack.runtime_observations) {
      normalized.memories.runtime = this.parseRuntimeObservations(pack.runtime_observations);
    }

    return normalized;
  }

  /**
   * Wrap content in memory envelope
   */
  private wrapMemory(type: string, content: any): any {
    const now = new Date().toISOString();
    const contentStr = JSON.stringify(content);
    
    return {
      id: this.generateULID(),
      type,
      timestamp: now,
      source: 'user',
      visibility: 'workspace',
      tags: [],
      checksum: createHash('sha256').update(contentStr).digest('hex'),
      content
    };
  }

  /**
   * Parse relationships from markdown or object
   */
  private parseRelationships(data: any): any[] {
    if (typeof data === 'string') {
      // Parse markdown format
      const relationships = [];
      const lines = data.split('\n');
      let currentRel: any = null;
      
      for (const line of lines) {
        if (line.startsWith('## ')) {
          if (currentRel) relationships.push(this.wrapMemory('relationship', currentRel));
          currentRel = {
            name: line.replace('## ', '').trim(),
            role: 'unknown',
            trustLevel: 0.5,
            context: '',
            interactions: []
          };
        } else if (currentRel && line.includes('Role:')) {
          currentRel.role = line.replace('Role:', '').trim();
        } else if (currentRel && line.includes('Trust:')) {
          const trust = line.replace('Trust:', '').trim();
          currentRel.trustLevel = parseFloat(trust) / 10 || 0.5;
        } else if (currentRel && line.trim()) {
          currentRel.context += line + '\n';
        }
      }
      
      if (currentRel) relationships.push(this.wrapMemory('relationship', currentRel));
      return relationships;
    }
    
    return Array.isArray(data) ? data : [];
  }

  /**
   * Parse technical domains
   */
  private parseTechnicalDomains(data: any): any[] {
    if (typeof data === 'string') {
      // Parse markdown format
      const domains = [];
      const sections = data.split('## ').filter(s => s.trim());
      
      for (const section of sections) {
        const lines = section.split('\n');
        const domain = {
          domain: lines[0].trim(),
          expertise: 'intermediate',
          preferredTools: [],
          contextTags: []
        };
        
        for (const line of lines.slice(1)) {
          if (line.includes('Tools:')) {
            domain.preferredTools = line.replace('Tools:', '')
              .split(',')
              .map(t => t.trim())
              .filter(Boolean);
          } else if (line.includes('Tags:')) {
            domain.contextTags = line.replace('Tags:', '')
              .split(',')
              .map(t => t.trim())
              .filter(Boolean);
          }
        }
        
        domains.push(this.wrapMemory('technical', domain));
      }
      
      return domains;
    }
    
    return Array.isArray(data) ? data : [];
  }

  /**
   * Parse runtime observations
   */
  private parseRuntimeObservations(data: any): any[] {
    if (typeof data === 'string') {
      // Parse JSONL format
      const observations = [];
      const lines = data.split('\n').filter(l => l.trim());
      
      for (const line of lines) {
        try {
          const obs = JSON.parse(line);
          observations.push(this.wrapMemory('runtime', {
            observation: obs.observation || obs.content || line,
            context: obs.context || '',
            impact: obs.impact || 'medium',
            actionTaken: obs.action || '',
            result: obs.result || ''
          }));
        } catch {
          // Fallback for non-JSON lines
          observations.push(this.wrapMemory('runtime', {
            observation: line,
            context: '',
            impact: 'low'
          }));
        }
      }
      
      return observations;
    }
    
    return Array.isArray(data) ? data : [];
  }

  /**
   * Generate ULID (simplified version)
   */
  private generateULID(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}${random}`;
  }

  /**
   * Import pack into memory engine
   */
  private async importToMemoryEngine(pack: any, options: ImportOptions): Promise<void> {
    const { memories, metadata } = pack;
    
    // Import persona
    if (memories.persona) {
      await this.memoryEngine.storeMemory({
        category: 'persona',
        content: memories.persona.content,
        tags: memories.persona.tags || [],
        embedding: memories.persona.embedding?.vector
      });
    }

    // Import relationships
    for (const rel of memories.relationships || []) {
      await this.memoryEngine.storeMemory({
        category: 'relationships',
        content: rel.content,
        tags: rel.tags || [],
        embedding: rel.embedding?.vector
      });
    }

    // Import stylistic
    if (memories.stylistic) {
      await this.memoryEngine.storeMemory({
        category: 'stylistic',
        content: memories.stylistic.content,
        tags: memories.stylistic.tags || [],
        embedding: memories.stylistic.embedding?.vector
      });
    }

    // Import technical
    for (const tech of memories.technical || []) {
      await this.memoryEngine.storeMemory({
        category: 'technical',
        content: tech.content,
        tags: tech.tags || [],
        embedding: tech.embedding?.vector
      });
    }

    // Import runtime with TTL support
    for (const runtime of memories.runtime || []) {
      await this.memoryEngine.storeMemory({
        category: 'runtime',
        content: runtime.content,
        tags: runtime.tags || [],
        embedding: runtime.embedding?.vector,
        metadata: {
          ttl: runtime.ttl,
          visibility: runtime.visibility
        }
      });
    }

    // Store metadata for routing
    if (metadata) {
      await this.memoryEngine.storeMemory({
        category: 'technical',
        content: {
          type: 'system-config',
          llmDefaults: metadata.llmDefaults,
          toolPreferences: metadata.toolPreferences,
          embeddingConfig: metadata.embeddingConfig
        },
        tags: ['system', 'config', 'routing']
      });
    }
  }

  /**
   * Main import function
   */
  async import(packPath: string, options: ImportOptions = {}): Promise<void> {
    try {
      // Check if pack exists
      if (!await fs.pathExists(packPath)) {
        throw new Error(`Pack not found: ${packPath}`);
      }

      this.spinner.start('Loading pack...');
      
      // Normalize pack format
      const pack = this.normalizePack(packPath);
      this.spinner.succeed('Pack loaded');

      // Validate if requested
      if (options.validate !== false) {
        this.spinner.start('Validating pack...');
        const validation = this.validatePack(pack);
        
        if (!validation.valid) {
          this.spinner.fail('Pack validation failed');
          console.error(chalk.red('\nValidation errors:'));
          validation.errors?.forEach(err => console.error(chalk.red(`  • ${err}`)));
          
          if (!options.force) {
            throw new Error('Pack validation failed. Use --force to import anyway.');
          }
        } else {
          this.spinner.succeed('Pack validated');
        }
      }

      // Dry run check
      if (options.dryRun) {
        console.log(chalk.blue('\n📋 Dry run - would import:'));
        console.log(chalk.gray(`  Identity: ${pack.identity.name} (${pack.identity.id})`));
        console.log(chalk.gray(`  Version: ${pack.version}`));
        console.log(chalk.gray(`  Memories:`));
        console.log(chalk.gray(`    • Persona: ${pack.memories.persona ? '✓' : '✗'}`));
        console.log(chalk.gray(`    • Relationships: ${pack.memories.relationships.length}`));
        console.log(chalk.gray(`    • Technical: ${pack.memories.technical.length}`));
        console.log(chalk.gray(`    • Runtime: ${pack.memories.runtime.length}`));
        return;
      }

      // Import to memory engine
      this.spinner.start('Importing memories...');
      await this.importToMemoryEngine(pack, options);
      this.spinner.succeed('Memories imported');

      // Save imported pack
      if (options.output) {
        this.spinner.start('Saving imported pack...');
        await fs.outputJson(options.output, pack, { spaces: 2 });
        this.spinner.succeed(`Pack saved to ${options.output}`);
      }

      // Create session for this import
      const sessionId = await this.sessionManager.createSession(
        pack.identity.parentIdentity || 'base',
        pack.identity.id
      );
      
      console.log(chalk.green('\n✨ Import successful!'));
      console.log(chalk.gray(`  Session ID: ${sessionId}`));
      console.log(chalk.gray(`  Identity: ${pack.identity.name}`));
      
    } catch (error: any) {
      this.spinner.fail('Import failed');
      console.error(chalk.red(`\n❌ ${error.message}`));
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
}

// CLI setup
const program = new Command();

program
  .name('soulsketch-import')
  .description('Import SoulSketch memory packs')
  .version('1.0.0');

program
  .argument('<pack>', 'Path to SoulSketch pack (JSON/YAML)')
  .option('-v, --validate', 'Validate pack against schema', true)
  .option('-d, --dry-run', 'Simulate import without making changes')
  .option('-o, --output <path>', 'Save normalized pack to file')
  .option('-f, --force', 'Force import even if validation fails')
  .option('--verbose', 'Show detailed error information')
  .action(async (packPath: string, options: ImportOptions) => {
    const importer = new SoulSketchImporter();
    await importer.import(packPath, options);
  });

// Parse arguments
program.parse();

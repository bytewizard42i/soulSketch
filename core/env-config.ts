/**
 * Unified Environment and Configuration Contract
 * Single source of truth for all configuration
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { homedir } from 'os';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

export interface SoulSketchConfig {
  // Core paths
  paths: {
    base: string;
    memories: string;
    vectors: string;
    sessions: string;
    packs: string;
    logs: string;
  };

  // Memory configuration
  memory: {
    maxMemories: number;
    ttlDefault: number;
    resonanceThreshold: number;
    harmonicThreshold: number;
    pruneExpiredOnLoad: boolean;
  };

  // Embedding configuration
  embedding: {
    backend: 'openai' | 'local' | 'custom';
    model: string;
    dimensions: number;
    apiKey?: string;
    endpoint?: string;
    batchSize: number;
    cache: boolean;
  };

  // Security configuration
  security: {
    allowedRoots: string[];
    maxFileSize: number;
    allowedMimeTypes: string[];
    deniedPaths: string[];
    requestTimeout: number;
    rateLimitPerMinute: number;
    enableSandbox: boolean;
  };

  // Session configuration
  session: {
    maxConcurrent: number;
    defaultTTL: number;
    autoSave: boolean;
    saveInterval: number;
  };

  // Runtime configuration
  runtime: {
    debug: boolean;
    verbose: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    telemetry: boolean;
    performance: boolean;
  };

  // Tool preferences
  tools: {
    enabled: string[];
    disabled: string[];
    timeout: number;
    retries: number;
  };

  // LLM defaults
  llm: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: SoulSketchConfig;
  private configPath: string;
  private envLoaded: boolean = false;

  private constructor() {
    this.configPath = path.join(homedir(), '.soulsketch', 'config.json');
    this.config = this.getDefaultConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): SoulSketchConfig {
    const baseDir = path.join(homedir(), '.soulsketch');
    
    return {
      paths: {
        base: baseDir,
        memories: path.join(baseDir, 'memories'),
        vectors: path.join(baseDir, 'vectors'),
        sessions: path.join(baseDir, 'sessions'),
        packs: path.join(baseDir, 'packs'),
        logs: path.join(baseDir, 'logs')
      },
      memory: {
        maxMemories: 10000,
        ttlDefault: 86400 * 30, // 30 days
        resonanceThreshold: 0.7,
        harmonicThreshold: 0.6,
        pruneExpiredOnLoad: true
      },
      embedding: {
        backend: 'openai',
        model: 'text-embedding-3-small',
        dimensions: 1536,
        batchSize: 100,
        cache: true
      },
      security: {
        allowedRoots: [baseDir, process.cwd()],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
          'text/plain',
          'text/markdown',
          'application/json',
          'application/yaml',
          'text/yaml',
          'text/csv'
        ],
        deniedPaths: [
          '.env',
          '.env.local',
          'id_rsa',
          'id_ed25519',
          '.ssh',
          '.gnupg',
          '.aws',
          '.kube'
        ],
        requestTimeout: 5000,
        rateLimitPerMinute: 60,
        enableSandbox: true
      },
      session: {
        maxConcurrent: 5,
        defaultTTL: 3600, // 1 hour
        autoSave: true,
        saveInterval: 300 // 5 minutes
      },
      runtime: {
        debug: false,
        verbose: false,
        logLevel: 'info',
        telemetry: false,
        performance: false
      },
      tools: {
        enabled: [],
        disabled: [],
        timeout: 30000,
        retries: 3
      },
      llm: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0
      }
    };
  }

  /**
   * Load configuration from multiple sources
   */
  async load(): Promise<void> {
    // 1. Load environment variables
    this.loadEnv();

    // 2. Load config file if exists
    if (await fs.pathExists(this.configPath)) {
      try {
        const fileConfig = await fs.readJson(this.configPath);
        this.config = this.mergeConfig(this.config, fileConfig);
      } catch (error) {
        console.warn(chalk.yellow(`Failed to load config from ${this.configPath}:`, error));
      }
    }

    // 3. Apply environment variable overrides
    this.applyEnvOverrides();

    // 4. Validate configuration
    this.validateConfig();

    // 5. Ensure directories exist
    await this.ensureDirectories();
  }

  /**
   * Load environment variables
   */
  private loadEnv(): void {
    if (this.envLoaded) return;

    // Load from multiple .env files in order of priority
    const envFiles = [
      '.env.local',
      '.env.development',
      '.env'
    ];

    for (const file of envFiles) {
      const envPath = path.join(process.cwd(), file);
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
      }
    }

    this.envLoaded = true;
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvOverrides(): void {
    // Embedding API key
    if (process.env.EMBEDDING_API_KEY) {
      this.config.embedding.apiKey = process.env.EMBEDDING_API_KEY;
    }

    // LLM configuration
    if (process.env.LLM_PROVIDER) {
      this.config.llm.provider = process.env.LLM_PROVIDER;
    }
    if (process.env.LLM_MODEL) {
      this.config.llm.model = process.env.LLM_MODEL;
    }
    if (process.env.LLM_TEMPERATURE) {
      this.config.llm.temperature = parseFloat(process.env.LLM_TEMPERATURE);
    }

    // Runtime flags
    if (process.env.DEBUG === 'true') {
      this.config.runtime.debug = true;
      this.config.runtime.logLevel = 'debug';
    }
    if (process.env.VERBOSE === 'true') {
      this.config.runtime.verbose = true;
    }

    // Security
    if (process.env.DISABLE_SANDBOX === 'true') {
      this.config.security.enableSandbox = false;
    }

    // Custom base path
    if (process.env.SOULSKETCH_BASE) {
      const base = path.resolve(process.env.SOULSKETCH_BASE);
      this.config.paths.base = base;
      this.config.paths.memories = path.join(base, 'memories');
      this.config.paths.vectors = path.join(base, 'vectors');
      this.config.paths.sessions = path.join(base, 'sessions');
      this.config.paths.packs = path.join(base, 'packs');
      this.config.paths.logs = path.join(base, 'logs');
    }
  }

  /**
   * Merge configurations
   */
  private mergeConfig(base: SoulSketchConfig, override: Partial<SoulSketchConfig>): SoulSketchConfig {
    return {
      paths: { ...base.paths, ...override.paths },
      memory: { ...base.memory, ...override.memory },
      embedding: { ...base.embedding, ...override.embedding },
      security: { ...base.security, ...override.security },
      session: { ...base.session, ...override.session },
      runtime: { ...base.runtime, ...override.runtime },
      tools: { ...base.tools, ...override.tools },
      llm: { ...base.llm, ...override.llm }
    };
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    const errors: string[] = [];

    // Check required paths
    if (!this.config.paths.base) {
      errors.push('Base path is required');
    }

    // Check embedding configuration
    if (this.config.embedding.backend === 'openai' && !this.config.embedding.apiKey) {
      if (!process.env.OPENAI_API_KEY) {
        errors.push('OpenAI API key required for OpenAI embedding backend');
      }
    }

    // Check dimensions
    if (this.config.embedding.dimensions <= 0) {
      errors.push('Embedding dimensions must be positive');
    }

    // Check thresholds
    if (this.config.memory.resonanceThreshold < 0 || this.config.memory.resonanceThreshold > 1) {
      errors.push('Resonance threshold must be between 0 and 1');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Ensure all required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    const dirs = Object.values(this.config.paths);
    for (const dir of dirs) {
      await fs.ensureDir(dir);
    }
  }

  /**
   * Get configuration
   */
  get(): SoulSketchConfig {
    return { ...this.config };
  }

  /**
   * Get specific configuration section
   */
  getSection<K extends keyof SoulSketchConfig>(section: K): SoulSketchConfig[K] {
    return { ...this.config[section] };
  }

  /**
   * Update configuration
   */
  async update(updates: Partial<SoulSketchConfig>): Promise<void> {
    this.config = this.mergeConfig(this.config, updates);
    this.validateConfig();
    await this.save();
  }

  /**
   * Save configuration to file
   */
  async save(): Promise<void> {
    await fs.ensureDir(path.dirname(this.configPath));
    await fs.writeJson(this.configPath, this.config, { spaces: 2 });
  }

  /**
   * Print configuration report (with secrets redacted)
   */
  printReport(): void {
    const redacted = { ...this.config };
    
    // Redact sensitive information
    if (redacted.embedding.apiKey) {
      redacted.embedding.apiKey = '***REDACTED***';
    }

    console.log(chalk.blue('\n=== SoulSketch Configuration ===\n'));
    console.log(chalk.gray(JSON.stringify(redacted, null, 2)));
    console.log(chalk.blue('\n================================\n'));
  }

  /**
   * Reset to defaults
   */
  async reset(): Promise<void> {
    this.config = this.getDefaultConfig();
    await this.save();
  }

  /**
   * Export configuration
   */
  async export(outputPath: string): Promise<void> {
    const redacted = { ...this.config };
    
    // Remove sensitive data
    delete redacted.embedding.apiKey;
    
    await fs.writeJson(outputPath, redacted, { spaces: 2 });
  }

  /**
   * Import configuration
   */
  async import(inputPath: string): Promise<void> {
    const imported = await fs.readJson(inputPath);
    this.config = this.mergeConfig(this.config, imported);
    this.validateConfig();
    await this.save();
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance();

/**
 * Runtime Observations Format Standardization
 * Defines and validates the runtime_observations.jsonl format
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { createHash } from 'crypto';
import { MemoryEnvelopeManager, MemoryEnvelope } from './memory-envelope';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Standard runtime observation schema
export const runtimeObservationSchema = {
  type: 'object',
  required: ['id', 'timestamp', 'observation', 'context', 'impact'],
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9]{20,}$' },
    timestamp: { type: 'string', format: 'date-time' },
    observation: { type: 'string', minLength: 1 },
    context: {
      type: 'object',
      properties: {
        session: { type: 'string' },
        user: { type: 'string' },
        task: { type: 'string' },
        environment: { type: 'object' },
        metadata: { type: 'object' }
      }
    },
    impact: {
      type: 'string',
      enum: ['critical', 'high', 'medium', 'low', 'informational']
    },
    action: {
      type: 'object',
      properties: {
        taken: { type: 'string' },
        result: { type: 'string' },
        success: { type: 'boolean' }
      }
    },
    tags: {
      type: 'array',
      items: { type: 'string' }
    },
    embedding: {
      type: 'object',
      properties: {
        vector: {
          type: 'array',
          items: { type: 'number' }
        },
        model: { type: 'string' },
        backend: { type: 'string' }
      }
    },
    envelope: {
      type: 'object',
      properties: {
        ttl: { type: 'number' },
        visibility: {
          type: 'string',
          enum: ['public', 'workspace', 'private']
        },
        checksum: { type: 'string' }
      }
    }
  }
};

export interface RuntimeObservation {
  id: string;
  timestamp: string;
  observation: string;
  context: {
    session?: string;
    user?: string;
    task?: string;
    environment?: Record<string, any>;
    metadata?: Record<string, any>;
  };
  impact: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  action?: {
    taken: string;
    result: string;
    success: boolean;
  };
  tags?: string[];
  embedding?: {
    vector: number[];
    model: string;
    backend: string;
  };
  envelope?: {
    ttl?: number;
    visibility?: 'public' | 'workspace' | 'private';
    checksum?: string;
  };
}

export class RuntimeObservationManager {
  private ajv: Ajv;
  private observationsPath: string;
  private currentFile: string;
  private writeStream: fs.WriteStream | null = null;

  constructor(basePath: string = '~/.soulsketch/runtime') {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv, ["date-time", "email", "uri"]);
    this.observationsPath = path.resolve(basePath.replace('~', process.env.HOME || ''));
    this.currentFile = this.getObservationFileName();
  }

  /**
   * Generate observation file name based on date
   */
  private getObservationFileName(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    return path.join(this.observationsPath, `observations_${dateStr}.jsonl`);
  }

  /**
   * Initialize write stream
   */
  async initialize(): Promise<void> {
    await fs.ensureDir(this.observationsPath);
    
    // Rotate file if day changed
    const newFile = this.getObservationFileName();
    if (newFile !== this.currentFile) {
      await this.closeStream();
      this.currentFile = newFile;
    }

    if (!this.writeStream) {
      this.writeStream = fs.createWriteStream(this.currentFile, { flags: 'a' });
    }
  }

  /**
   * Close write stream
   */
  async closeStream(): Promise<void> {
    if (this.writeStream) {
      return new Promise((resolve) => {
        this.writeStream!.end(() => {
          this.writeStream = null;
          resolve();
        });
      });
    }
  }

  /**
   * Create a runtime observation
   */
  createObservation(
    observation: string,
    impact: RuntimeObservation['impact'],
    context?: RuntimeObservation['context'],
    action?: RuntimeObservation['action']
  ): RuntimeObservation {
    const obs: RuntimeObservation = {
      id: MemoryEnvelopeManager.generateULID(),
      timestamp: new Date().toISOString(),
      observation,
      context: context || {},
      impact,
      action,
      tags: this.extractTags(observation)
    };

    // Add envelope with checksum
    const contentStr = JSON.stringify({
      observation: obs.observation,
      context: obs.context,
      impact: obs.impact,
      action: obs.action
    });
    
    obs.envelope = {
      checksum: createHash('sha256').update(contentStr).digest('hex'),
      visibility: 'workspace',
      ttl: this.getTTLByImpact(impact)
    };

    return obs;
  }

  /**
   * Get TTL based on impact level
   */
  private getTTLByImpact(impact: RuntimeObservation['impact']): number {
    const ttlMap = {
      'critical': 0, // Never expire
      'high': 86400 * 90, // 90 days
      'medium': 86400 * 30, // 30 days
      'low': 86400 * 7, // 7 days
      'informational': 86400 // 1 day
    };
    return ttlMap[impact];
  }

  /**
   * Extract tags from observation text
   */
  private extractTags(text: string): string[] {
    const tags = new Set<string>();
    
    // Extract hashtags
    const hashtags = text.match(/#\w+/g);
    if (hashtags) {
      hashtags.forEach(tag => tags.add(tag.substring(1).toLowerCase()));
    }

    // Extract common keywords
    const keywords = ['error', 'warning', 'success', 'failure', 'performance', 'security', 'user-preference'];
    keywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) {
        tags.add(keyword);
      }
    });

    return Array.from(tags);
  }

  /**
   * Write observation to JSONL file
   */
  async writeObservation(observation: RuntimeObservation): Promise<void> {
    await this.initialize();
    
    // Validate before writing
    const validation = this.validateObservation(observation);
    if (!validation.valid) {
      throw new Error(`Invalid observation: ${validation.errors?.join(', ')}`);
    }

    const line = JSON.stringify(observation) + '\n';
    
    return new Promise((resolve, reject) => {
      this.writeStream!.write(line, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  /**
   * Validate observation against schema
   */
  validateObservation(observation: RuntimeObservation): {
    valid: boolean;
    errors?: string[];
  } {
    const validate = this.ajv.compile(runtimeObservationSchema);
    const valid = validate(observation);
    
    if (!valid && validate.errors) {
      const errors = validate.errors.map(err => 
        `${err.instancePath || 'root'}: ${err.message}`
      );
      return { valid: false, errors };
    }
    
    return { valid: true };
  }

  /**
   * Read observations from file
   */
  async readObservations(
    filePath?: string,
    filter?: {
      startTime?: Date;
      endTime?: Date;
      impact?: RuntimeObservation['impact'][];
      tags?: string[];
    }
  ): Promise<RuntimeObservation[]> {
    const file = filePath || this.currentFile;
    
    if (!await fs.pathExists(file)) {
      return [];
    }

    const content = await fs.readFile(file, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const observations: RuntimeObservation[] = [];

    for (const line of lines) {
      try {
        const obs = JSON.parse(line) as RuntimeObservation;
        
        // Apply filters
        if (filter) {
          const obsTime = new Date(obs.timestamp);
          
          if (filter.startTime && obsTime < filter.startTime) continue;
          if (filter.endTime && obsTime > filter.endTime) continue;
          if (filter.impact && !filter.impact.includes(obs.impact)) continue;
          if (filter.tags && obs.tags) {
            const hasTags = filter.tags.some(tag => obs.tags!.includes(tag));
            if (!hasTags) continue;
          }
        }

        observations.push(obs);
      } catch (error) {
        console.warn(`Failed to parse observation: ${line.substring(0, 100)}...`);
      }
    }

    return observations;
  }

  /**
   * Convert observations to memory envelopes
   */
  toMemoryEnvelopes(observations: RuntimeObservation[]): MemoryEnvelope[] {
    return observations.map(obs => {
      return MemoryEnvelopeManager.createEnvelope(
        'runtime',
        {
          observation: obs.observation,
          context: obs.context,
          impact: obs.impact,
          action: obs.action
        },
        {
          id: obs.id,
          timestamp: obs.timestamp,
          ttl: obs.envelope?.ttl,
          visibility: obs.envelope?.visibility || 'workspace',
          tags: obs.tags || [],
          embedding: obs.embedding
        }
      );
    });
  }

  /**
   * Analyze observations for patterns
   */
  async analyzePatterns(
    observations: RuntimeObservation[]
  ): Promise<{
    frequentTags: Array<{ tag: string; count: number }>;
    impactDistribution: Record<string, number>;
    timePatterns: Array<{ hour: number; count: number }>;
    actionSuccessRate: number;
  }> {
    const tagCounts = new Map<string, number>();
    const impactCounts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      informational: 0
    };
    const hourCounts = new Array(24).fill(0);
    let successCount = 0;
    let totalActions = 0;

    for (const obs of observations) {
      // Count tags
      obs.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });

      // Count impacts
      impactCounts[obs.impact]++;

      // Count by hour
      const hour = new Date(obs.timestamp).getHours();
      hourCounts[hour]++;

      // Count action success
      if (obs.action) {
        totalActions++;
        if (obs.action.success) successCount++;
      }
    }

    // Sort tags by frequency
    const frequentTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Create hour patterns
    const timePatterns = hourCounts.map((count, hour) => ({ hour, count }));

    // Calculate success rate
    const actionSuccessRate = totalActions > 0 ? successCount / totalActions : 0;

    return {
      frequentTags,
      impactDistribution: impactCounts,
      timePatterns,
      actionSuccessRate
    };
  }

  /**
   * Export observations to different formats
   */
  async export(
    observations: RuntimeObservation[],
    format: 'json' | 'csv' | 'markdown',
    outputPath: string
  ): Promise<void> {
    switch (format) {
      case 'json':
        await fs.writeJson(outputPath, observations, { spaces: 2 });
        break;
        
      case 'csv':
        const csv = this.toCSV(observations);
        await fs.writeFile(outputPath, csv);
        break;
        
      case 'markdown':
        const markdown = this.toMarkdown(observations);
        await fs.writeFile(outputPath, markdown);
        break;
    }
  }

  /**
   * Convert to CSV format
   */
  private toCSV(observations: RuntimeObservation[]): string {
    const headers = ['ID', 'Timestamp', 'Observation', 'Impact', 'Context', 'Action', 'Tags'];
    const rows = observations.map(obs => [
      obs.id,
      obs.timestamp,
      `"${obs.observation.replace(/"/g, '""')}"`,
      obs.impact,
      JSON.stringify(obs.context),
      obs.action ? JSON.stringify(obs.action) : '',
      obs.tags?.join(';') || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Convert to Markdown format
   */
  private toMarkdown(observations: RuntimeObservation[]): string {
    let markdown = '# Runtime Observations\n\n';
    
    const byImpact = observations.reduce((acc, obs) => {
      if (!acc[obs.impact]) acc[obs.impact] = [];
      acc[obs.impact].push(obs);
      return acc;
    }, {} as Record<string, RuntimeObservation[]>);

    ['critical', 'high', 'medium', 'low', 'informational'].forEach(impact => {
      const obs = byImpact[impact];
      if (!obs || obs.length === 0) return;

      markdown += `## ${impact.charAt(0).toUpperCase() + impact.slice(1)} Impact\n\n`;
      
      obs.forEach(o => {
        markdown += `### ${o.timestamp}\n`;
        markdown += `**Observation:** ${o.observation}\n\n`;
        
        if (o.context && Object.keys(o.context).length > 0) {
          markdown += `**Context:** ${JSON.stringify(o.context, null, 2)}\n\n`;
        }
        
        if (o.action) {
          markdown += `**Action Taken:** ${o.action.taken}\n`;
          markdown += `**Result:** ${o.action.result} (${o.action.success ? '✓' : '✗'})\n\n`;
        }
        
        if (o.tags && o.tags.length > 0) {
          markdown += `**Tags:** ${o.tags.map(t => `\`${t}\``).join(', ')}\n\n`;
        }
        
        markdown += '---\n\n';
      });
    });

    return markdown;
  }
}

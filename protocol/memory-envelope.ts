/**
 * Typed Memory Envelope System
 * Provides consistent metadata wrapping for all memory types
 */

import { createHash } from 'crypto';

export type MemoryType = 'persona' | 'runtime' | 'relationship' | 'technical' | 'stylistic';
export type MemorySource = 'user' | 'tool' | 'llm' | 'system';
export type MemoryVisibility = 'public' | 'workspace' | 'private';

export interface MemoryEnvelope {
  id: string;
  type: MemoryType;
  timestamp: string;
  source: MemorySource;
  content: any;
  ttl?: number;
  visibility: MemoryVisibility;
  tags: string[];
  checksum: string;
  embedding?: {
    vector: number[];
    model: string;
    backend: string;
    dimensions: number;
  };
  metadata?: {
    parentId?: string;
    resonanceScore?: number;
    harmonics?: string[];
    version?: string;
  };
}

export class MemoryEnvelopeManager {
  /**
   * Generate ULID for chronological sorting
   */
  static generateULID(): string {
    const timestamp = Date.now();
    const timestampStr = timestamp.toString(36).padStart(10, '0');
    const randomStr = Array(16)
      .fill(0)
      .map(() => Math.floor(Math.random() * 36).toString(36))
      .join('');
    return `${timestampStr}${randomStr}`;
  }

  /**
   * Create a memory envelope with all required metadata
   */
  static createEnvelope(
    type: MemoryType,
    content: any,
    options: Partial<MemoryEnvelope> = {}
  ): MemoryEnvelope {
    const contentStr = JSON.stringify(content);
    const checksum = createHash('sha256').update(contentStr).digest('hex');
    const now = new Date().toISOString();

    return {
      id: options.id || this.generateULID(),
      type,
      timestamp: options.timestamp || now,
      source: options.source || 'user',
      content,
      ttl: options.ttl,
      visibility: options.visibility || 'workspace',
      tags: options.tags || [],
      checksum,
      embedding: options.embedding,
      metadata: options.metadata
    };
  }

  /**
   * Validate envelope integrity
   */
  static validateEnvelope(envelope: MemoryEnvelope): boolean {
    const contentStr = JSON.stringify(envelope.content);
    const expectedChecksum = createHash('sha256').update(contentStr).digest('hex');
    return envelope.checksum === expectedChecksum;
  }

  /**
   * Check if memory has expired based on TTL
   */
  static isExpired(envelope: MemoryEnvelope): boolean {
    if (!envelope.ttl) return false;
    
    const createdAt = new Date(envelope.timestamp).getTime();
    const now = Date.now();
    const ageInSeconds = (now - createdAt) / 1000;
    
    return ageInSeconds > envelope.ttl;
  }

  /**
   * Filter memories by visibility level
   */
  static filterByVisibility(
    memories: MemoryEnvelope[],
    requiredVisibility: MemoryVisibility
  ): MemoryEnvelope[] {
    const visibilityLevels: Record<MemoryVisibility, number> = {
      'public': 0,
      'workspace': 1,
      'private': 2
    };

    const requiredLevel = visibilityLevels[requiredVisibility];
    
    return memories.filter(mem => {
      const memLevel = visibilityLevels[mem.visibility];
      return memLevel <= requiredLevel;
    });
  }

  /**
   * Prune expired memories
   */
  static pruneExpired(memories: MemoryEnvelope[]): MemoryEnvelope[] {
    return memories.filter(mem => !this.isExpired(mem));
  }

  /**
   * Update envelope checksum after content modification
   */
  static updateChecksum(envelope: MemoryEnvelope): MemoryEnvelope {
    const contentStr = JSON.stringify(envelope.content);
    envelope.checksum = createHash('sha256').update(contentStr).digest('hex');
    return envelope;
  }

  /**
   * Clone envelope with new ID and timestamp
   */
  static cloneEnvelope(
    envelope: MemoryEnvelope,
    overrides: Partial<MemoryEnvelope> = {}
  ): MemoryEnvelope {
    return {
      ...envelope,
      id: this.generateULID(),
      timestamp: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Extract tags from content using simple heuristics
   */
  static extractTags(content: any): string[] {
    const tags = new Set<string>();
    const text = JSON.stringify(content).toLowerCase();

    // Extract common programming languages
    const languages = ['javascript', 'typescript', 'python', 'rust', 'go', 'java', 'c++'];
    languages.forEach(lang => {
      if (text.includes(lang)) tags.add(lang);
    });

    // Extract tools and frameworks
    const tools = ['react', 'vue', 'angular', 'node', 'docker', 'kubernetes', 'git'];
    tools.forEach(tool => {
      if (text.includes(tool)) tags.add(tool);
    });

    // Extract action words
    const actions = ['debug', 'optimize', 'refactor', 'deploy', 'test', 'build'];
    actions.forEach(action => {
      if (text.includes(action)) tags.add(action);
    });

    return Array.from(tags);
  }

  /**
   * Calculate memory age in human-readable format
   */
  static getAge(envelope: MemoryEnvelope): string {
    const created = new Date(envelope.timestamp).getTime();
    const now = Date.now();
    const ageMs = now - created;
    
    const seconds = Math.floor(ageMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  }

  /**
   * Batch validate multiple envelopes
   */
  static batchValidate(envelopes: MemoryEnvelope[]): {
    valid: MemoryEnvelope[];
    invalid: Array<{ envelope: MemoryEnvelope; reason: string }>;
  } {
    const valid: MemoryEnvelope[] = [];
    const invalid: Array<{ envelope: MemoryEnvelope; reason: string }> = [];

    for (const envelope of envelopes) {
      if (!envelope.id) {
        invalid.push({ envelope, reason: 'Missing ID' });
      } else if (!envelope.type) {
        invalid.push({ envelope, reason: 'Missing type' });
      } else if (!envelope.timestamp) {
        invalid.push({ envelope, reason: 'Missing timestamp' });
      } else if (!this.validateEnvelope(envelope)) {
        invalid.push({ envelope, reason: 'Checksum mismatch' });
      } else if (this.isExpired(envelope)) {
        invalid.push({ envelope, reason: 'Expired (TTL exceeded)' });
      } else {
        valid.push(envelope);
      }
    }

    return { valid, invalid };
  }
}

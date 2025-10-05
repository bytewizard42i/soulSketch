/**
 * @soulsketch/core - Memory Module
 * Memory drivers and utilities for SoulSketch
 */

import { MemoryDriver, MemoryEntry } from './index.js';

/**
 * In-memory driver for testing and development
 */
export class InMemoryDriver implements MemoryDriver {
  private entries: Map<string, MemoryEntry> = new Map();
  private idCounter = 0;

  async write(entry: MemoryEntry): Promise<void> {
    const id = entry.id || `mem_${++this.idCounter}`;
    this.entries.set(id, { ...entry, id });
  }

  async search(query: string, limit: number = 10): Promise<MemoryEntry[]> {
    // Simple substring search - production would use embeddings
    const results: MemoryEntry[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const entry of this.entries.values()) {
      const contentStr = JSON.stringify(entry.content).toLowerCase();
      if (contentStr.includes(lowerQuery)) {
        results.push(entry);
        if (results.length >= limit) break;
      }
    }
    
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  async delete(id: string): Promise<void> {
    this.entries.delete(id);
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }

  async getAll(): Promise<MemoryEntry[]> {
    return Array.from(this.entries.values());
  }
}

/**
 * SQLite driver (stub - requires implementation)
 */
export class SQLiteDriver implements MemoryDriver {
  constructor(private _dbPath: string) {}

  async write(_entry: MemoryEntry): Promise<void> {
    throw new Error('SQLite driver not yet implemented');
  }

  async search(_query: string, _limit?: number): Promise<MemoryEntry[]> {
    throw new Error('SQLite driver not yet implemented');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('SQLite driver not yet implemented');
  }
}

/**
 * Create a memory driver based on configuration
 */
export function createMemoryDriver(type: 'sqlite' | 'postgres' | 'qdrant' | 'memory', config?: { path?: string }): MemoryDriver {
  switch (type) {
    case 'memory':
      return new InMemoryDriver();
    case 'sqlite':
      if (!config?.path) throw new Error('SQLite driver requires path configuration');
      return new SQLiteDriver(config.path);
    default:
      throw new Error(`Unsupported memory driver: ${type}`);
  }
}

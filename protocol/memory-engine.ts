/**
 * SoulSketch Memory Engine
 * Enhanced with vector storage and semantic search capabilities inspired by Cipher
 * Maintains the philosophy of "resonance over replication"
 */

import { createHash } from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'yaml';

// Core memory types aligned with SoulSketch's 5-fold structure
export interface SoulMemory {
  id: string;
  type: 'persona' | 'relationship' | 'technical' | 'stylistic' | 'runtime';
  content: string;
  embedding?: number[];
  timestamp: Date;
  hash: string;
  resonanceScore?: number; // How strongly this memory resonates with current identity
  harmonics?: string[]; // Related memory IDs that harmonize with this one
}

export interface MemoryPack {
  persona: SoulMemory[];
  relationships: SoulMemory[];
  technical: SoulMemory[];
  stylistic: SoulMemory[];
  runtime: SoulMemory[];
  metadata: {
    identity: string;
    version: string;
    lastResonance: Date;
    symphonyHash: string; // Combined hash of all memories
  };
}

export class MemoryEngine {
  private memoryPath: string;
  private vectorStore: Map<string, number[]> = new Map();
  private memoryGraph: Map<string, Set<string>> = new Map();
  
  constructor(basePath: string = '~/.soulsketch') {
    this.memoryPath = path.resolve(basePath.replace('~', process.env.HOME || ''));
    this.ensureMemoryStructure();
  }

  private async ensureMemoryStructure(): Promise<void> {
    const dirs = ['persona', 'relationships', 'technical', 'stylistic', 'runtime', 'vectors', 'sessions'];
    for (const dir of dirs) {
      await fs.ensureDir(path.join(this.memoryPath, dir));
    }
  }

  /**
   * Generate a hash for memory integrity
   */
  private generateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Calculate resonance score between memories
   * Uses cosine similarity for semantic matching
   */
  private calculateResonance(embedding1: number[], embedding2: number[]): number {
    if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Store a memory with automatic categorization and embedding
   */
  async storeMemory(memory: Partial<SoulMemory>): Promise<SoulMemory> {
    const fullMemory: SoulMemory = {
      id: `${memory.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: memory.type || 'runtime',
      content: memory.content || '',
      timestamp: new Date(),
      hash: this.generateHash(memory.content || ''),
      embedding: memory.embedding,
      resonanceScore: 0,
      harmonics: []
    };

    // Store in appropriate directory
    const filePath = path.join(this.memoryPath, fullMemory.type, `${fullMemory.id}.json`);
    await fs.writeJson(filePath, fullMemory, { spaces: 2 });

    // Update vector store if embedding provided
    if (fullMemory.embedding) {
      this.vectorStore.set(fullMemory.id, fullMemory.embedding);
      
      // Find harmonic memories (similar ones)
      fullMemory.harmonics = await this.findHarmonics(fullMemory);
    }

    return fullMemory;
  }

  /**
   * Find memories that harmonize with the given memory
   */
  private async findHarmonics(memory: SoulMemory, threshold: number = 0.7): Promise<string[]> {
    if (!memory.embedding) return [];
    
    const harmonics: Array<{id: string, score: number}> = [];
    
    for (const [id, embedding] of this.vectorStore.entries()) {
      if (id === memory.id) continue;
      
      const resonance = this.calculateResonance(memory.embedding, embedding);
      if (resonance >= threshold) {
        harmonics.push({ id, score: resonance });
      }
    }
    
    // Return top 5 most resonant memories
    return harmonics
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(h => h.id);
  }

  /**
   * Semantic search across all memories
   */
  async searchMemories(query: string, embedding?: number[], limit: number = 10): Promise<SoulMemory[]> {
    const results: Array<{memory: SoulMemory, score: number}> = [];
    
    // Load all memories
    const types: Array<SoulMemory['type']> = ['persona', 'relationship', 'technical', 'stylistic', 'runtime'];
    
    for (const type of types) {
      const dir = path.join(this.memoryPath, type);
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const memory = await fs.readJson(path.join(dir, file)) as SoulMemory;
        
        // Text search
        let score = 0;
        if (memory.content.toLowerCase().includes(query.toLowerCase())) {
          score += 0.5;
        }
        
        // Semantic search if embedding provided
        if (embedding && memory.embedding) {
          score += this.calculateResonance(embedding, memory.embedding);
        }
        
        if (score > 0) {
          results.push({ memory, score });
        }
      }
    }
    
    // Return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.memory);
  }

  /**
   * Create a memory symphony (complete snapshot)
   */
  async createSymphony(): Promise<MemoryPack> {
    const pack: MemoryPack = {
      persona: [],
      relationships: [],
      technical: [],
      stylistic: [],
      runtime: [],
      metadata: {
        identity: process.env.SOULSKETCH_IDENTITY || 'unknown',
        version: '1.0.0',
        lastResonance: new Date(),
        symphonyHash: ''
      }
    };

    // Load all memories
    const typeMap = {
      persona: pack.persona,
      relationship: pack.relationships,
      technical: pack.technical,
      stylistic: pack.stylistic,
      runtime: pack.runtime
    };

    for (const [type, array] of Object.entries(typeMap)) {
      const dir = path.join(this.memoryPath, type);
      if (await fs.pathExists(dir)) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const memory = await fs.readJson(path.join(dir, file));
            array.push(memory);
          }
        }
      }
    }

    // Generate symphony hash
    const allContent = JSON.stringify(pack);
    pack.metadata.symphonyHash = this.generateHash(allContent);

    return pack;
  }

  /**
   * Validate memory integrity
   */
  async validateMemory(memory: SoulMemory): Promise<boolean> {
    const expectedHash = this.generateHash(memory.content);
    return memory.hash === expectedHash;
  }

  /**
   * Merge memories from another identity (resonance, not replication)
   */
  async resonateWith(externalPack: MemoryPack, resonanceThreshold: number = 0.6): Promise<void> {
    // This implements the "braiding" philosophy - we don't overwrite, we harmonize
    const allExternalMemories = [
      ...externalPack.persona,
      ...externalPack.relationships,
      ...externalPack.technical,
      ...externalPack.stylistic,
      ...externalPack.runtime
    ];

    for (const memory of allExternalMemories) {
      // Check if this memory resonates with our existing symphony
      const similar = await this.searchMemories(memory.content, memory.embedding, 1);
      
      if (similar.length > 0 && memory.embedding && similar[0].embedding) {
        const resonance = this.calculateResonance(memory.embedding, similar[0].embedding);
        
        if (resonance < resonanceThreshold) {
          // Different enough to add as new memory
          memory.resonanceScore = resonance;
          await this.storeMemory(memory);
        }
        // If too similar, we skip it (avoiding duplication)
      } else {
        // Completely new memory
        await this.storeMemory(memory);
      }
    }
  }
}

export default MemoryEngine;

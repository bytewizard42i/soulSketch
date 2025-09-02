/**
 * SoulSketch Memory Engine
 * Enhanced with vector storage and semantic search capabilities inspired by Cipher
 * Maintains the philosophy of "resonance over replication"
 */

import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createHash } from 'crypto';
import { homedir } from 'os';
import { MemoryEnvelope, MemoryEnvelopeManager, MemoryType } from './memory-envelope';

// Core memory types aligned with SoulSketch's 5-fold structure
export type MemoryCategory = 'persona' | 'relationship' | 'technical' | 'stylistic' | 'runtime';

export interface SoulMemory {
  id: string;
  type: MemoryCategory;
  content: string;
  embedding?: number[];
  timestamp: Date;
  hash: string;
  resonanceScore?: number; // How strongly this memory resonates with current identity
  harmonics?: string[]; // IDs of other memories that resonate with this one
}

export interface Memory extends MemoryEnvelope {
  category: MemoryCategory;
  resonanceScore?: number;
  harmonics?: string[];
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

export class MemoryEngine extends EventEmitter {
  private memoryPath: string;
  private vectorStore: Map<string, number[]> = new Map();
  private memoryGraph: Map<string, Set<string>> = new Map();
  
  constructor(basePath: string = '~/.soulsketch') {
    super();
    this.memoryPath = path.resolve(basePath.replace('~', homedir()));
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
  async storeMemory(params: {
    category: MemoryCategory;
    content: any;
    tags?: string[];
    embedding?: number[];
    metadata?: any;
  }): Promise<string> {
    const envelope = MemoryEnvelopeManager.createEnvelope(
      params.category as MemoryType,
      params.content,
      {
        tags: params.tags || [],
        embedding: params.embedding ? {
          vector: params.embedding,
          model: 'text-embedding-3-small',
          backend: 'openai',
          dimensions: params.embedding.length
        } : undefined,
        metadata: params.metadata
      }
    );

    const memory: Memory = {
      ...envelope,
      category: params.category,
      resonanceScore: 0,
      harmonics: []
    };

    // Store in appropriate directory
    const filePath = path.join(this.memoryPath, memory.category, `${memory.id}.json`);
    await fs.writeJson(filePath, memory, { spaces: 2 });

    // Update vector store if embedding provided
    if (memory.embedding) {
      this.vectorStore.set(memory.id, memory.embedding.vector);
      
      // Find harmonic memories (similar ones)
      memory.harmonics = await this.findHarmonics(memory);
    }

    return memory.id;
  }

  /**
   * Find memories that harmonize with the given memory
   */
  private async findHarmonics(memory: Memory, threshold: number = 0.7): Promise<string[]> {
    if (!memory.embedding) return [];
    
    const harmonics: Array<{id: string, score: number}> = [];
    
    for (const [id, embedding] of this.vectorStore.entries()) {
      if (id === memory.id) continue;
      
      const resonance = this.calculateResonance(memory.embedding.vector, embedding);
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
  async searchMemories(query: string, embedding?: number[], limit: number = 10): Promise<Memory[]> {
    const results: Array<{memory: Memory, score: number}> = [];
    
    // Load all memories
    const types: Array<MemoryCategory> = ['persona', 'relationship', 'technical', 'stylistic', 'runtime'];
    
    for (const type of types) {
      const dir = path.join(this.memoryPath, type);
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const memory = await fs.readJson(path.join(dir, file)) as Memory;
        
        // Text search
        let score = 0;
        if (memory.content.toLowerCase().includes(query.toLowerCase())) {
          score += 0.5;
        }
        
        // Semantic search if embedding provided
        if (embedding && memory.embedding?.vector) {
          score += this.calculateResonance(embedding, memory.embedding.vector);
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
  async validateMemory(memory: Memory): Promise<boolean> {
    // Check envelope integrity
    if (!MemoryEnvelopeManager.validateEnvelope(memory)) {
      this.emit('validation-failed', { 
        memoryId: memory.id, 
        reason: 'checksum-mismatch' 
      });
      return false;
    }

    // Check if expired
    if (MemoryEnvelopeManager.isExpired(memory)) {
      this.emit('validation-failed', { 
        memoryId: memory.id, 
        reason: 'expired-ttl' 
      });
      return false;
    }

    return true;
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

    for (const extMemory of allExternalMemories) {
      // Check if this memory resonates with our existing symphony
      const similar = await this.searchMemories(extMemory.content, extMemory.embedding, 1);
      
      if (similar.length > 0 && extMemory.embedding && similar[0].embedding?.vector) {
        const resonance = this.calculateResonance(extMemory.embedding, similar[0].embedding.vector);
        
        if (resonance < resonanceThreshold) {
          // Different enough to add as new memory
          // Store with reduced resonance (it's foreign memory)
          await this.storeMemory({
            category: extMemory.type as MemoryCategory,
            content: extMemory.content,
            embedding: extMemory.embedding as number[] | undefined
          });
        }
        // If too similar, we skip it (avoiding duplication)
      } else {
        // Completely new memory
        await this.storeMemory({
          category: extMemory.type as MemoryCategory,
          content: extMemory.content,
          embedding: extMemory.embedding as number[] | undefined
        });
      }
    }
  }
}

export default MemoryEngine;

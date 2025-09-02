/**
 * Deterministic Embedding Pipeline
 * Ensures consistent vector representations across upgrades
 */

import { createHash } from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface EmbeddingMetadata {
  model: string;
  backend: string;
  dimensions: number;
  version: string;
  normalization: 'l2' | 'none';
  preprocessor: string;
  hash: string;
  timestamp: string;
}

export interface EmbeddingResult {
  vector: number[];
  metadata: EmbeddingMetadata;
  cacheKey: string;
}

export class DeterministicEmbeddingPipeline {
  private cache: Map<string, EmbeddingResult> = new Map();
  private cachePath: string;
  private metadata: EmbeddingMetadata;

  constructor(
    backend: string = 'openai',
    model: string = 'text-embedding-3-small',
    dimensions: number = 1536,
    cachePath: string = '~/.soulsketch/embeddings/cache'
  ) {
    this.cachePath = path.resolve(cachePath.replace('~', process.env.HOME || ''));
    this.metadata = {
      backend,
      model,
      dimensions,
      version: '1.0.0',
      normalization: 'l2',
      preprocessor: 'standard',
      hash: '',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Initialize pipeline and load cache
   */
  async initialize(): Promise<void> {
    await fs.ensureDir(this.cachePath);
    await this.loadCache();
  }

  /**
   * Generate deterministic cache key for content
   */
  private generateCacheKey(content: string): string {
    const normalized = this.normalizeContent(content);
    const metaString = `${this.metadata.backend}:${this.metadata.model}:${this.metadata.dimensions}:${this.metadata.version}`;
    return createHash('sha256')
      .update(`${metaString}:${normalized}`)
      .digest('hex');
  }

  /**
   * Normalize content for consistent hashing
   */
  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }

  /**
   * Preprocess text before embedding
   */
  private preprocessText(text: string): string {
    // Remove excessive whitespace
    let processed = text.replace(/\s+/g, ' ').trim();
    
    // Truncate to model's max length (8191 tokens for OpenAI)
    // Rough approximation: 4 chars per token
    const maxChars = 8191 * 4;
    if (processed.length > maxChars) {
      processed = processed.substring(0, maxChars);
    }

    // Remove special tokens that might affect embedding
    processed = processed
      .replace(/<\|[^|]+\|>/g, '') // Remove special tokens
      .replace(/\[CLS\]|\[SEP\]|\[PAD\]/g, ''); // Remove BERT tokens

    return processed;
  }

  /**
   * Apply L2 normalization to vector
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map(val => val / magnitude);
  }

  /**
   * Generate embedding with caching and metadata
   */
  async embed(content: string, forceRegenerate: boolean = false): Promise<EmbeddingResult> {
    const cacheKey = this.generateCacheKey(content);
    
    // Check cache first
    if (!forceRegenerate) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Check disk cache
      const diskCached = await this.loadFromDisk(cacheKey);
      if (diskCached) {
        this.cache.set(cacheKey, diskCached);
        return diskCached;
      }
    }

    // Preprocess text
    const processedText = this.preprocessText(content);
    
    // Generate embedding (mock for now - would call actual API)
    const vector = await this.callEmbeddingAPI(processedText);
    
    // Apply normalization
    const normalizedVector = this.metadata.normalization === 'l2' 
      ? this.normalizeVector(vector)
      : vector;

    // Create metadata
    const metadata: EmbeddingMetadata = {
      ...this.metadata,
      hash: createHash('sha256').update(JSON.stringify(normalizedVector)).digest('hex'),
      timestamp: new Date().toISOString()
    };

    const result: EmbeddingResult = {
      vector: normalizedVector,
      metadata,
      cacheKey
    };

    // Cache result
    this.cache.set(cacheKey, result);
    await this.saveToDisk(cacheKey, result);

    return result;
  }

  /**
   * Mock embedding API call
   */
  private async callEmbeddingAPI(text: string): Promise<number[]> {
    // In production, this would call the actual embedding API
    // For now, generate deterministic pseudo-random vectors based on text
    const hash = createHash('sha256').update(text).digest();
    const vector = new Array(this.metadata.dimensions);
    
    for (let i = 0; i < this.metadata.dimensions; i++) {
      // Use hash bytes to generate deterministic float values
      const byte1 = hash[i % hash.length];
      const byte2 = hash[(i + 1) % hash.length];
      const value = ((byte1 << 8) | byte2) / 65535.0 * 2 - 1; // Range [-1, 1]
      vector[i] = value;
    }

    return vector;
  }

  /**
   * Batch embed multiple texts
   */
  async batchEmbed(
    texts: string[],
    batchSize: number = 100
  ): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(text => this.embed(text))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Verify embedding consistency
   */
  async verifyConsistency(
    content: string,
    expectedVector: number[],
    tolerance: number = 1e-6
  ): Promise<{
    consistent: boolean;
    similarity: number;
    maxDifference: number;
  }> {
    const result = await this.embed(content);
    
    if (result.vector.length !== expectedVector.length) {
      return {
        consistent: false,
        similarity: 0,
        maxDifference: Infinity
      };
    }

    let dotProduct = 0;
    let maxDiff = 0;
    
    for (let i = 0; i < result.vector.length; i++) {
      const diff = Math.abs(result.vector[i] - expectedVector[i]);
      maxDiff = Math.max(maxDiff, diff);
      dotProduct += result.vector[i] * expectedVector[i];
    }

    const similarity = dotProduct; // Assumes normalized vectors
    const consistent = maxDiff <= tolerance;

    return {
      consistent,
      similarity,
      maxDifference: maxDiff
    };
  }

  /**
   * Load cache from disk
   */
  private async loadCache(): Promise<void> {
    const cacheFile = path.join(this.cachePath, 'index.json');
    
    if (await fs.pathExists(cacheFile)) {
      try {
        const index = await fs.readJson(cacheFile);
        
        for (const [key, fileName] of Object.entries(index)) {
          const filePath = path.join(this.cachePath, fileName as string);
          if (await fs.pathExists(filePath)) {
            const data = await fs.readJson(filePath);
            this.cache.set(key, data);
          }
        }
      } catch (error) {
        console.warn('Failed to load embedding cache:', error);
      }
    }
  }

  /**
   * Load single embedding from disk
   */
  private async loadFromDisk(cacheKey: string): Promise<EmbeddingResult | null> {
    const fileName = `${cacheKey.substring(0, 8)}.json`;
    const filePath = path.join(this.cachePath, fileName);
    
    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        if (data.cacheKey === cacheKey) {
          return data;
        }
      } catch (error) {
        console.warn(`Failed to load embedding ${cacheKey}:`, error);
      }
    }
    
    return null;
  }

  /**
   * Save embedding to disk
   */
  private async saveToDisk(cacheKey: string, result: EmbeddingResult): Promise<void> {
    const fileName = `${cacheKey.substring(0, 8)}.json`;
    const filePath = path.join(this.cachePath, fileName);
    
    await fs.writeJson(filePath, result, { spaces: 2 });
    
    // Update index
    const indexFile = path.join(this.cachePath, 'index.json');
    let index: Record<string, string> = {};
    
    if (await fs.pathExists(indexFile)) {
      index = await fs.readJson(indexFile);
    }
    
    index[cacheKey] = fileName;
    await fs.writeJson(indexFile, index, { spaces: 2 });
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    await fs.emptyDir(this.cachePath);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memoryEntries: number;
    memorySizeBytes: number;
    metadata: EmbeddingMetadata;
  } {
    let sizeBytes = 0;
    
    for (const [_, result] of this.cache) {
      // Rough estimation: 8 bytes per float + overhead
      sizeBytes += result.vector.length * 8 + JSON.stringify(result.metadata).length;
    }

    return {
      memoryEntries: this.cache.size,
      memorySizeBytes: sizeBytes,
      metadata: this.metadata
    };
  }

  /**
   * Update pipeline configuration
   */
  updateConfig(updates: Partial<EmbeddingMetadata>): void {
    this.metadata = {
      ...this.metadata,
      ...updates,
      timestamp: new Date().toISOString()
    };
    
    // Clear cache on config change to ensure consistency
    this.cache.clear();
  }

  /**
   * Export embeddings for migration
   */
  async exportEmbeddings(outputPath: string): Promise<void> {
    const exportData = {
      metadata: this.metadata,
      embeddings: Array.from(this.cache.entries()).map(([key, result]) => ({
        key,
        ...result
      }))
    };

    await fs.writeJson(outputPath, exportData, { spaces: 2 });
  }

  /**
   * Import embeddings from export
   */
  async importEmbeddings(inputPath: string): Promise<void> {
    const data = await fs.readJson(inputPath);
    
    // Verify compatibility
    if (data.metadata.model !== this.metadata.model ||
        data.metadata.backend !== this.metadata.backend ||
        data.metadata.dimensions !== this.metadata.dimensions) {
      throw new Error('Incompatible embedding metadata');
    }

    // Load embeddings
    for (const item of data.embeddings) {
      const { key, ...result } = item;
      this.cache.set(key, result);
      await this.saveToDisk(key, result);
    }
  }
}

export default DeterministicEmbeddingPipeline;

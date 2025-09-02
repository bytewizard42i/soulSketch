/**
 * SoulSketch Memory Validator
 * Ensures memory integrity and authenticity
 * Inspired by Cipher's validation patterns
 */

import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SoulMemory, MemoryPack } from './memory-engine.js';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  integrity: {
    totalMemories: number;
    validMemories: number;
    corruptedMemories: number;
    missingMemories: number;
  };
}

export interface ValidationError {
  memoryId: string;
  type: 'hash_mismatch' | 'missing_required' | 'invalid_format' | 'corrupted_data';
  message: string;
  severity: 'critical' | 'high' | 'medium';
}

export interface ValidationWarning {
  memoryId?: string;
  type: 'outdated' | 'orphaned_harmonic' | 'low_resonance' | 'duplicate_content';
  message: string;
}

export interface ValidatorConfig {
  strictMode?: boolean;
  checkHarmonics?: boolean;
  maxMemoryAge?: number; // days
  minResonanceScore?: number;
  allowDuplicates?: boolean;
}

export class MemoryValidator {
  private config: Required<ValidatorConfig>;
  private validationCache: Map<string, ValidationResult> = new Map();

  constructor(config: ValidatorConfig = {}) {
    this.config = {
      strictMode: config.strictMode ?? true,
      checkHarmonics: config.checkHarmonics ?? true,
      maxMemoryAge: config.maxMemoryAge ?? 365,
      minResonanceScore: config.minResonanceScore ?? 0.3,
      allowDuplicates: config.allowDuplicates ?? false
    };
  }

  /**
   * Validate a single memory
   */
  async validateMemory(memory: SoulMemory): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      integrity: {
        totalMemories: 1,
        validMemories: 1,
        corruptedMemories: 0,
        missingMemories: 0
      }
    };

    // Check hash integrity
    const expectedHash = this.generateHash(memory.content);
    if (memory.hash !== expectedHash) {
      result.errors.push({
        memoryId: memory.id,
        type: 'hash_mismatch',
        message: `Hash mismatch detected. Expected: ${expectedHash}, Got: ${memory.hash}`,
        severity: 'critical'
      });
      result.valid = false;
      result.integrity.corruptedMemories = 1;
      result.integrity.validMemories = 0;
    }

    // Check required fields
    const requiredFields = ['id', 'type', 'content', 'timestamp', 'hash'];
    for (const field of requiredFields) {
      if (!(field in memory) || memory[field as keyof SoulMemory] === null || memory[field as keyof SoulMemory] === undefined) {
        result.errors.push({
          memoryId: memory.id,
          type: 'missing_required',
          message: `Required field '${field}' is missing or null`,
          severity: 'high'
        });
        result.valid = false;
      }
    }

    // Check memory age
    const ageInDays = (Date.now() - new Date(memory.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > this.config.maxMemoryAge) {
      result.warnings.push({
        memoryId: memory.id,
        type: 'outdated',
        message: `Memory is ${Math.floor(ageInDays)} days old (max: ${this.config.maxMemoryAge})`
      });
    }

    // Check resonance score if present
    if (memory.resonanceScore !== undefined && memory.resonanceScore < this.config.minResonanceScore) {
      result.warnings.push({
        memoryId: memory.id,
        type: 'low_resonance',
        message: `Low resonance score: ${memory.resonanceScore} (min: ${this.config.minResonanceScore})`
      });
    }

    // Validate harmonics references
    if (this.config.checkHarmonics && memory.harmonics && memory.harmonics.length > 0) {
      for (const harmonicId of memory.harmonics) {
        // Check if harmonic memory exists (would need access to memory store)
        if (!await this.harmonicExists(harmonicId)) {
          result.warnings.push({
            memoryId: memory.id,
            type: 'orphaned_harmonic',
            message: `Harmonic reference '${harmonicId}' does not exist`
          });
        }
      }
    }

    return result;
  }

  /**
   * Validate an entire memory pack
   */
  async validateMemoryPack(pack: MemoryPack): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      integrity: {
        totalMemories: 0,
        validMemories: 0,
        corruptedMemories: 0,
        missingMemories: 0
      }
    };

    // Collect all memories
    const allMemories = [
      ...pack.persona,
      ...pack.relationships,
      ...pack.technical,
      ...pack.stylistic,
      ...pack.runtime
    ];

    result.integrity.totalMemories = allMemories.length;

    // Check for duplicates
    const contentHashes = new Set<string>();
    const idSet = new Set<string>();

    for (const memory of allMemories) {
      // Validate individual memory
      const memoryResult = await this.validateMemory(memory);
      
      if (!memoryResult.valid) {
        result.valid = false;
        result.integrity.corruptedMemories++;
      } else {
        result.integrity.validMemories++;
      }

      result.errors.push(...memoryResult.errors);
      result.warnings.push(...memoryResult.warnings);

      // Check for duplicate IDs
      if (idSet.has(memory.id)) {
        result.errors.push({
          memoryId: memory.id,
          type: 'invalid_format',
          message: `Duplicate memory ID detected: ${memory.id}`,
          severity: 'high'
        });
        result.valid = false;
      }
      idSet.add(memory.id);

      // Check for duplicate content
      const contentHash = this.generateHash(memory.content);
      if (!this.config.allowDuplicates && contentHashes.has(contentHash)) {
        result.warnings.push({
          memoryId: memory.id,
          type: 'duplicate_content',
          message: `Duplicate content detected (hash: ${contentHash})`
        });
      }
      contentHashes.add(contentHash);
    }

    // Validate metadata
    if (!pack.metadata) {
      result.errors.push({
        memoryId: 'metadata',
        type: 'missing_required',
        message: 'Memory pack metadata is missing',
        severity: 'critical'
      });
      result.valid = false;
    } else {
      // Verify symphony hash
      const expectedSymphonyHash = this.generatePackHash(pack);
      if (pack.metadata.symphonyHash !== expectedSymphonyHash) {
        result.errors.push({
          memoryId: 'metadata',
          type: 'hash_mismatch',
          message: `Symphony hash mismatch. Pack may have been tampered with.`,
          severity: 'critical'
        });
        result.valid = false;
      }
    }

    // Check memory distribution
    const distribution = this.checkMemoryDistribution(pack);
    if (distribution.warnings.length > 0) {
      result.warnings.push(...distribution.warnings);
    }

    return result;
  }

  /**
   * Check if memories are well-distributed across categories
   */
  private checkMemoryDistribution(pack: MemoryPack): { warnings: ValidationWarning[] } {
    const warnings: ValidationWarning[] = [];
    const categories = {
      persona: pack.persona.length,
      relationships: pack.relationships.length,
      technical: pack.technical.length,
      stylistic: pack.stylistic.length,
      runtime: pack.runtime.length
    };

    const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) {
      warnings.push({
        type: 'low_resonance',
        message: 'Memory pack is empty'
      });
      return { warnings };
    }

    // Check for imbalanced categories
    for (const [category, count] of Object.entries(categories)) {
      const percentage = (count / total) * 100;
      
      if (category === 'persona' && percentage < 5) {
        warnings.push({
          type: 'low_resonance',
          message: `Low persona memory count (${percentage.toFixed(1)}%). Identity may be weak.`
        });
      }
      
      if (percentage > 50) {
        warnings.push({
          type: 'low_resonance',
          message: `Category '${category}' dominates pack (${percentage.toFixed(1)}%). Consider rebalancing.`
        });
      }
    }

    return { warnings };
  }

  /**
   * Repair corrupted memories where possible
   */
  async repairMemory(memory: SoulMemory): Promise<SoulMemory> {
    const repaired = { ...memory };

    // Regenerate hash
    repaired.hash = this.generateHash(repaired.content);

    // Fix missing timestamp
    if (!repaired.timestamp) {
      repaired.timestamp = new Date();
    }

    // Fix missing ID
    if (!repaired.id) {
      repaired.id = `repaired_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Clean orphaned harmonics
    if (repaired.harmonics) {
      const validHarmonics = [];
      for (const harmonicId of repaired.harmonics) {
        if (await this.harmonicExists(harmonicId)) {
          validHarmonics.push(harmonicId);
        }
      }
      repaired.harmonics = validHarmonics;
    }

    return repaired;
  }

  /**
   * Batch repair memories in a pack
   */
  async repairMemoryPack(pack: MemoryPack): Promise<MemoryPack> {
    const repaired: MemoryPack = {
      persona: [],
      relationships: [],
      technical: [],
      stylistic: [],
      runtime: [],
      metadata: { ...pack.metadata }
    };

    // Repair each category
    for (const memory of pack.persona) {
      repaired.persona.push(await this.repairMemory(memory));
    }
    for (const memory of pack.relationships) {
      repaired.relationships.push(await this.repairMemory(memory));
    }
    for (const memory of pack.technical) {
      repaired.technical.push(await this.repairMemory(memory));
    }
    for (const memory of pack.stylistic) {
      repaired.stylistic.push(await this.repairMemory(memory));
    }
    for (const memory of pack.runtime) {
      repaired.runtime.push(await this.repairMemory(memory));
    }

    // Regenerate symphony hash
    repaired.metadata.symphonyHash = this.generatePackHash(repaired);
    repaired.metadata.lastResonance = new Date();

    return repaired;
  }

  /**
   * Generate hash for content
   */
  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate hash for entire pack
   */
  private generatePackHash(pack: MemoryPack): string {
    const packCopy = { ...pack };
    // Remove the hash itself before calculating
    if (packCopy.metadata) {
      delete packCopy.metadata.symphonyHash;
    }
    const content = JSON.stringify(packCopy, null, 0);
    return this.generateHash(content);
  }

  /**
   * Check if a harmonic memory reference exists
   * This would need to be connected to the memory storage system
   */
  private async harmonicExists(harmonicId: string): Promise<boolean> {
    // Placeholder - would check actual storage
    // For now, assume transition harmonics always exist
    if (harmonicId.startsWith('transition:')) {
      return true;
    }
    
    // Would need to check memory storage
    return true; // Optimistic for now
  }

  /**
   * Generate a validation report
   */
  generateReport(result: ValidationResult): string {
    const lines: string[] = [];
    
    lines.push('=== SoulSketch Memory Validation Report ===');
    lines.push(`Status: ${result.valid ? 'VALID' : 'INVALID'}`);
    lines.push('');
    
    lines.push('Integrity Summary:');
    lines.push(`  Total Memories: ${result.integrity.totalMemories}`);
    lines.push(`  Valid Memories: ${result.integrity.validMemories}`);
    lines.push(`  Corrupted: ${result.integrity.corruptedMemories}`);
    lines.push(`  Missing: ${result.integrity.missingMemories}`);
    lines.push('');

    if (result.errors.length > 0) {
      lines.push(`Errors (${result.errors.length}):`);
      for (const error of result.errors) {
        lines.push(`  [${error.severity}] ${error.type}: ${error.message}`);
      }
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push(`Warnings (${result.warnings.length}):`);
      for (const warning of result.warnings) {
        lines.push(`  ${warning.type}: ${warning.message}`);
      }
      lines.push('');
    }

    lines.push('===========================================');
    
    return lines.join('\n');
  }
}

export default MemoryValidator;

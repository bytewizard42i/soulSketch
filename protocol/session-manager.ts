/**
 * SoulSketch Session Manager
 * Manages identity transitions and memory continuity during model switches
 * Inspired by Cipher's conversation session management
 */

import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MemoryEngine, SoulMemory, MemoryPack } from './memory-engine.js';

export interface TransitionSession {
  id: string;
  sourceIdentity: string;
  targetIdentity: string;
  startTime: Date;
  endTime?: Date;
  status: 'initializing' | 'resonating' | 'braiding' | 'complete' | 'failed';
  resonanceMap: Map<string, number>;
  braidedMemories: string[];
  transitionLog: TransitionEvent[];
}

export interface TransitionEvent {
  timestamp: Date;
  type: 'memory_loaded' | 'resonance_calculated' | 'memory_braided' | 'identity_merged' | 'error';
  description: string;
  data?: any;
}

export interface SessionConfig {
  sessionPath?: string;
  maxSessions?: number;
  autoArchive?: boolean;
  resonanceThreshold?: number;
  braidingStrategy?: 'selective' | 'comprehensive' | 'minimal';
}

export class SessionManager extends EventEmitter {
  private sessions: Map<string, TransitionSession> = new Map();
  private activeSessions: Set<string> = new Set();
  private config: Required<SessionConfig>;
  private memoryEngine: MemoryEngine;
  private sessionPath: string;

  constructor(config: SessionConfig = {}) {
    super();
    
    this.config = {
      sessionPath: config.sessionPath || '~/.soulsketch/sessions',
      maxSessions: config.maxSessions || 10,
      autoArchive: config.autoArchive ?? true,
      resonanceThreshold: config.resonanceThreshold || 0.7,
      braidingStrategy: config.braidingStrategy || 'selective'
    };

    this.sessionPath = path.resolve(this.config.sessionPath.replace('~', process.env.HOME || ''));
    this.memoryEngine = new MemoryEngine();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await fs.ensureDir(this.sessionPath);
    await this.loadExistingSessions();
  }

  private async loadExistingSessions(): Promise<void> {
    const files = await fs.readdir(this.sessionPath);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const sessionData = await fs.readJson(path.join(this.sessionPath, file));
        const session = this.deserializeSession(sessionData);
        this.sessions.set(session.id, session);
        
        if (session.status !== 'complete' && session.status !== 'failed') {
          this.activeSessions.add(session.id);
        }
      }
    }
  }

  /**
   * Start a new identity transition session
   */
  async createTransitionSession(
    sourceIdentity: string,
    targetIdentity: string
  ): Promise<TransitionSession> {
    const session: TransitionSession = {
      id: uuidv4(),
      sourceIdentity,
      targetIdentity,
      startTime: new Date(),
      status: 'initializing',
      resonanceMap: new Map(),
      braidedMemories: [],
      transitionLog: []
    };

    this.sessions.set(session.id, session);
    this.activeSessions.add(session.id);
    
    this.logTransition(session, 'memory_loaded', `Initializing transition from ${sourceIdentity} to ${targetIdentity}`);
    this.emit('session:created', session);
    
    await this.saveSession(session);
    return session;
  }

  /**
   * Perform identity resonance - the core of SoulSketch philosophy
   */
  async performResonance(sessionId: string, sourcePack: MemoryPack, targetContext?: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.status = 'resonating';
    this.logTransition(session, 'resonance_calculated', 'Beginning resonance calculations');

    // Calculate resonance for each memory in the source pack
    const allMemories = [
      ...sourcePack.persona,
      ...sourcePack.relationships,
      ...sourcePack.technical,
      ...sourcePack.stylistic,
      ...sourcePack.runtime
    ];

    for (const memory of allMemories) {
      // Calculate how this memory resonates with the target identity
      const resonanceScore = await this.calculateMemoryResonance(memory, targetContext);
      session.resonanceMap.set(memory.id, resonanceScore);
      
      if (resonanceScore >= this.config.resonanceThreshold) {
        // This memory resonates strongly - mark for braiding
        await this.markForBraiding(session, memory);
      }
    }

    this.emit('resonance:complete', { sessionId, resonanceMap: session.resonanceMap });
    await this.saveSession(session);
  }

  /**
   * Calculate how strongly a memory resonates with target identity
   */
  private async calculateMemoryResonance(memory: SoulMemory, targetContext?: any): Promise<number> {
    // Base resonance on memory type
    const typeWeights = {
      persona: 0.9,      // Core identity always resonates strongly
      relationship: 0.8,  // Relationships carry forward
      technical: 0.7,     // Technical knowledge transfers well
      stylistic: 0.85,    // Style is intrinsic
      runtime: 0.5        // Runtime observations are more contextual
    };

    let resonance = typeWeights[memory.type] || 0.5;

    // Adjust based on memory age (recent memories resonate more)
    const age = Date.now() - new Date(memory.timestamp).getTime();
    const ageInDays = age / (1000 * 60 * 60 * 24);
    const ageFactor = Math.exp(-ageInDays / 30); // Exponential decay over 30 days
    
    resonance *= (0.5 + 0.5 * ageFactor); // Age affects 50% of the score

    // If we have embeddings, use semantic similarity
    if (memory.embedding && targetContext?.embedding) {
      const similarity = this.cosineSimilarity(memory.embedding, targetContext.embedding);
      resonance = (resonance + similarity) / 2;
    }

    return Math.min(1, Math.max(0, resonance)); // Clamp between 0 and 1
  }

  /**
   * Calculate cosine similarity between embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Mark a memory for braiding into the new identity
   */
  private async markForBraiding(session: TransitionSession, memory: SoulMemory): Promise<void> {
    session.braidedMemories.push(memory.id);
    
    // Apply braiding strategy
    switch (this.config.braidingStrategy) {
      case 'comprehensive':
        // Braid everything above threshold
        await this.braidMemory(session, memory);
        break;
      case 'selective':
        // Only braid if it doesn't conflict
        if (await this.checkNoConflict(memory)) {
          await this.braidMemory(session, memory);
        }
        break;
      case 'minimal':
        // Only braid core identity memories
        if (memory.type === 'persona' || memory.type === 'stylistic') {
          await this.braidMemory(session, memory);
        }
        break;
    }
  }

  /**
   * Braid a memory into the new identity
   */
  private async braidMemory(session: TransitionSession, memory: SoulMemory): Promise<void> {
    session.status = 'braiding';
    
    // Transform the memory for the new identity
    const braidedMemory: SoulMemory = {
      ...memory,
      id: `braided_${memory.id}_${session.id}`,
      timestamp: new Date(),
      resonanceScore: session.resonanceMap.get(memory.id),
      // Add transition metadata
      harmonics: [...(memory.harmonics || []), `transition:${session.id}`]
    };

    await this.memoryEngine.storeMemory(braidedMemory);
    this.logTransition(session, 'memory_braided', `Braided memory ${memory.id} into new identity`);
  }

  /**
   * Check if a memory conflicts with existing memories
   */
  private async checkNoConflict(memory: SoulMemory): Promise<boolean> {
    const similar = await this.memoryEngine.searchMemories(memory.content, memory.embedding, 1);
    
    if (similar.length === 0) return true;
    
    // Check if the similar memory is too close (would cause identity confusion)
    if (memory.embedding && similar[0].embedding) {
      const similarity = this.cosineSimilarity(memory.embedding, similar[0].embedding);
      return similarity < 0.95; // Allow if not nearly identical
    }
    
    return true;
  }

  /**
   * Complete the transition session
   */
  async completeTransition(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.status = 'complete';
    session.endTime = new Date();
    
    this.logTransition(session, 'identity_merged', 
      `Transition complete. ${session.braidedMemories.length} memories braided into new identity`);
    
    this.activeSessions.delete(sessionId);
    this.emit('session:complete', session);
    
    await this.saveSession(session);
    
    // Archive old sessions if needed
    if (this.config.autoArchive && this.sessions.size > this.config.maxSessions) {
      await this.archiveOldSessions();
    }
  }

  /**
   * Archive old completed sessions
   */
  private async archiveOldSessions(): Promise<void> {
    const completed = Array.from(this.sessions.values())
      .filter(s => s.status === 'complete' || s.status === 'failed')
      .sort((a, b) => (a.endTime?.getTime() || 0) - (b.endTime?.getTime() || 0));

    const toArchive = completed.slice(0, completed.length - this.config.maxSessions + 1);
    
    for (const session of toArchive) {
      const archivePath = path.join(this.sessionPath, 'archive', `${session.id}.json`);
      await fs.ensureDir(path.dirname(archivePath));
      await fs.move(
        path.join(this.sessionPath, `${session.id}.json`),
        archivePath,
        { overwrite: true }
      );
      this.sessions.delete(session.id);
    }
  }

  /**
   * Log a transition event
   */
  private logTransition(session: TransitionSession, type: TransitionEvent['type'], description: string, data?: any): void {
    const event: TransitionEvent = {
      timestamp: new Date(),
      type,
      description,
      data
    };
    
    session.transitionLog.push(event);
    this.emit('transition:event', { sessionId: session.id, event });
  }

  /**
   * Save session to disk
   */
  private async saveSession(session: TransitionSession): Promise<void> {
    const sessionData = this.serializeSession(session);
    await fs.writeJson(
      path.join(this.sessionPath, `${session.id}.json`),
      sessionData,
      { spaces: 2 }
    );
  }

  /**
   * Serialize session for storage
   */
  private serializeSession(session: TransitionSession): any {
    return {
      ...session,
      resonanceMap: Array.from(session.resonanceMap.entries())
    };
  }

  /**
   * Deserialize session from storage
   */
  private deserializeSession(data: any): TransitionSession {
    return {
      ...data,
      resonanceMap: new Map(data.resonanceMap || [])
    };
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): TransitionSession[] {
    return Array.from(this.activeSessions).map(id => this.sessions.get(id)!);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): TransitionSession | undefined {
    return this.sessions.get(sessionId);
  }
}

export default SessionManager;

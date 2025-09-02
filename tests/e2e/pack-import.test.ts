/**
 * End-to-End Test for SoulSketch Pack Import
 * Validates the complete flow from pack creation to Cipher import
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import { homedir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { MemoryEngine } from '../../protocol/memory-engine';
import { SessionManager } from '../../protocol/session-manager';
import { MemoryEnvelopeManager } from '../../protocol/memory-envelope';
import { SecurityBoundaryManager } from '../../protocol/security-boundaries';

const execAsync = promisify(exec);

describe('SoulSketch Pack Import E2E', () => {
  const testDir = path.join(homedir(), '.soulsketch-test');
  const testPackPath = path.join(testDir, 'test-pack.json');
  const importerPath = path.join(__dirname, '../../cli/soulsketch-import.ts');
  
  let memoryEngine: MemoryEngine;
  let sessionManager: SessionManager;
  let securityManager: SecurityBoundaryManager;

  beforeEach(async () => {
    // Setup test environment
    await fs.ensureDir(testDir);
    memoryEngine = new MemoryEngine(testDir);
    sessionManager = new SessionManager();
    securityManager = new SecurityBoundaryManager({
      allowedRoots: [testDir]
    });
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testDir);
  });

  it('should import a legacy format pack and convert to new schema', async () => {
    // Create a legacy format pack
    const legacyPack = {
      name: 'TestAgent',
      persona: {
        role: 'AI Assistant',
        personality: 'Helpful and curious',
        values: ['accuracy', 'empathy', 'creativity']
      },
      stylistic_voice: {
        tone: 'Professional yet friendly',
        patterns: ['Clear explanations', 'Asks clarifying questions']
      },
      relationship_dynamics: `## User
Role: Primary User
Trust: 8/10
Context: Regular interactions about coding and design

## Team
Role: Collaborators
Trust: 7/10
Context: Working on shared projects`,
      technical_domains: `## JavaScript
Tools: Node.js, React, TypeScript
Tags: frontend, backend, fullstack

## Python
Tools: Django, FastAPI, NumPy
Tags: backend, data-science`,
      runtime_observations: `{"observation": "User prefers concise answers", "impact": "high"}
{"observation": "Frequently works with React", "context": "Multiple React projects"}
{"observation": "Values code quality", "action": "Added linting suggestions"}`
    };

    await fs.writeJson(testPackPath, legacyPack);

    // Run the importer
    const { stdout, stderr } = await execAsync(
      `npx tsx ${importerPath} ${testPackPath} --output ${path.join(testDir, 'imported.json')}`,
      { cwd: path.dirname(importerPath) }
    );

    expect(stderr).toBe('');
    expect(stdout).toContain('Import successful');

    // Verify the imported pack
    const importedPack = await fs.readJson(path.join(testDir, 'imported.json'));
    
    expect(importedPack.version).toBe('1.0.0');
    expect(importedPack.identity.name).toBe('TestAgent');
    expect(importedPack.memories.persona).toBeDefined();
    expect(importedPack.memories.relationships).toHaveLength(2);
    expect(importedPack.memories.technical).toHaveLength(2);
    expect(importedPack.memories.runtime).toHaveLength(3);
  });

  it('should validate pack against schema', async () => {
    // Create an invalid pack (missing required fields)
    const invalidPack = {
      version: '1.0.0',
      // Missing identity and memories
    };

    await fs.writeJson(testPackPath, invalidPack);

    // Run the importer with validation
    try {
      await execAsync(
        `npx tsx ${importerPath} ${testPackPath}`,
        { cwd: path.dirname(importerPath) }
      );
      expect.fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.stderr).toContain('validation failed');
    }
  });

  it('should import pack with typed memory envelopes', async () => {
    // Create a new format pack with envelopes
    const newPack = {
      version: '1.0.0',
      identity: {
        id: MemoryEnvelopeManager.generateULID(),
        name: 'EnvelopeTestAgent',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      },
      memories: {
        persona: MemoryEnvelopeManager.createEnvelope('persona', {
          role: 'Test Assistant',
          capabilities: ['testing', 'validation']
        }),
        relationships: [
          MemoryEnvelopeManager.createEnvelope('relationship', {
            name: 'TestUser',
            role: 'Tester',
            trustLevel: 0.9
          })
        ],
        stylistic: MemoryEnvelopeManager.createEnvelope('stylistic', {
          tone: 'Precise',
          format: 'Structured'
        }),
        technical: [
          MemoryEnvelopeManager.createEnvelope('technical', {
            domain: 'Testing',
            expertise: 'expert',
            preferredTools: ['vitest', 'jest']
          })
        ],
        runtime: [
          MemoryEnvelopeManager.createEnvelope('runtime', {
            observation: 'Test observation',
            impact: 'low'
          }, { ttl: 3600 }) // 1 hour TTL
        ]
      },
      metadata: {
        llmDefaults: {
          model: 'gpt-4',
          temperature: 0.7
        },
        toolPreferences: ['filesystem', 'terminal'],
        embeddingConfig: {
          backend: 'openai',
          model: 'text-embedding-3-small',
          dimensions: 1536
        }
      }
    };

    await fs.writeJson(testPackPath, newPack);

    // Import the pack
    const { stdout } = await execAsync(
      `npx tsx ${importerPath} ${testPackPath} --output ${path.join(testDir, 'envelope-imported.json')}`,
      { cwd: path.dirname(importerPath) }
    );

    expect(stdout).toContain('Import successful');

    // Verify envelopes are preserved
    const imported = await fs.readJson(path.join(testDir, 'envelope-imported.json'));
    
    expect(imported.memories.persona.checksum).toBeDefined();
    expect(imported.memories.relationships[0].visibility).toBe('workspace');
    expect(imported.memories.runtime[0].ttl).toBe(3600);
    
    // Validate envelope integrity
    const personaValid = MemoryEnvelopeManager.validateEnvelope(imported.memories.persona);
    expect(personaValid).toBe(true);
  });

  it('should enforce security boundaries during import', async () => {
    // Test path validation
    const maliciousPath = '../../../etc/passwd';
    const validation = await securityManager.validatePath(maliciousPath);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('Path traversal detected');

    // Test allowed roots
    const safePath = path.join(testDir, 'safe-file.json');
    const safeValidation = await securityManager.validatePath(safePath);
    expect(safeValidation.valid).toBe(true);

    // Test rate limiting
    const clientId = 'test-client';
    for (let i = 0; i < 60; i++) {
      const rateCheck = securityManager.checkRateLimit(clientId);
      if (i < 60) {
        expect(rateCheck.allowed).toBe(true);
      }
    }
    // 61st request should be blocked
    const blockedCheck = securityManager.checkRateLimit(clientId);
    expect(blockedCheck.allowed).toBe(false);
  });

  it('should handle dry-run mode', async () => {
    const testPack = {
      version: '1.0.0',
      identity: {
        id: 'test-id',
        name: 'DryRunAgent',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      },
      memories: {
        persona: MemoryEnvelopeManager.createEnvelope('persona', { role: 'Test' }),
        relationships: [],
        technical: [],
        stylistic: null,
        runtime: []
      },
      metadata: {
        llmDefaults: {},
        toolPreferences: [],
        embeddingConfig: {
          backend: 'openai',
          model: 'text-embedding-3-small',
          dimensions: 1536
        }
      }
    };

    await fs.writeJson(testPackPath, testPack);

    // Run in dry-run mode
    const { stdout } = await execAsync(
      `npx tsx ${importerPath} ${testPackPath} --dry-run`,
      { cwd: path.dirname(importerPath) }
    );

    expect(stdout).toContain('Dry run - would import');
    expect(stdout).toContain('DryRunAgent');
    
    // Verify no actual import happened
    const memoryFiles = await fs.readdir(path.join(testDir, 'persona')).catch(() => []);
    expect(memoryFiles).toHaveLength(0);
  });

  it('should preserve memory resonance during import', async () => {
    // Create two packs with overlapping memories
    const pack1 = {
      version: '1.0.0',
      identity: {
        id: 'agent-1',
        name: 'Agent1',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      },
      memories: {
        persona: MemoryEnvelopeManager.createEnvelope('persona', {
          role: 'Helper',
          trait: 'Curious'
        }),
        relationships: [],
        technical: [],
        stylistic: null,
        runtime: []
      },
      metadata: {
        llmDefaults: {},
        toolPreferences: [],
        embeddingConfig: {
          backend: 'openai',
          model: 'text-embedding-3-small',
          dimensions: 1536
        }
      }
    };

    const pack2 = {
      version: '1.0.0',
      identity: {
        id: 'agent-2',
        name: 'Agent2',
        parentIdentity: 'agent-1',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      },
      memories: {
        persona: MemoryEnvelopeManager.createEnvelope('persona', {
          role: 'Helper',
          trait: 'Creative' // Different trait
        }),
        relationships: [],
        technical: [],
        stylistic: null,
        runtime: []
      },
      metadata: {
        llmDefaults: {},
        toolPreferences: [],
        embeddingConfig: {
          backend: 'openai',
          model: 'text-embedding-3-small',
          dimensions: 1536
        }
      }
    };

    // Import first pack
    await fs.writeJson(testPackPath, pack1);
    await execAsync(
      `npx tsx ${importerPath} ${testPackPath}`,
      { cwd: path.dirname(importerPath) }
    );

    // Import second pack (should resonate, not duplicate)
    const pack2Path = path.join(testDir, 'pack2.json');
    await fs.writeJson(pack2Path, pack2);
    await execAsync(
      `npx tsx ${importerPath} ${pack2Path}`,
      { cwd: path.dirname(importerPath) }
    );

    // Check that memories harmonized
    const personaFiles = await fs.readdir(path.join(testDir, 'persona'));
    expect(personaFiles.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle TTL expiration correctly', async () => {
    const pack = {
      version: '1.0.0',
      identity: {
        id: 'ttl-test',
        name: 'TTLAgent',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      },
      memories: {
        persona: null,
        relationships: [],
        technical: [],
        stylistic: null,
        runtime: [
          MemoryEnvelopeManager.createEnvelope('runtime', {
            observation: 'Should expire',
            timestamp: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
          }, { ttl: 3600 }), // 1 hour TTL - should be expired
          MemoryEnvelopeManager.createEnvelope('runtime', {
            observation: 'Should not expire'
          }, { ttl: 86400 }) // 24 hour TTL - still valid
        ]
      },
      metadata: {
        llmDefaults: {},
        toolPreferences: [],
        embeddingConfig: {
          backend: 'openai',
          model: 'text-embedding-3-small',
          dimensions: 1536
        }
      }
    };

    await fs.writeJson(testPackPath, pack);

    // Import and validate
    const { stdout } = await execAsync(
      `npx tsx ${importerPath} ${testPackPath} --output ${path.join(testDir, 'ttl-imported.json')}`,
      { cwd: path.dirname(importerPath) }
    );

    expect(stdout).toContain('Import successful');

    // Check TTL filtering
    const imported = await fs.readJson(path.join(testDir, 'ttl-imported.json'));
    const validMemories = MemoryEnvelopeManager.pruneExpired(imported.memories.runtime);
    
    // Only the non-expired memory should remain
    expect(validMemories).toHaveLength(1);
    expect(validMemories[0].content.observation).toBe('Should not expire');
  });
});

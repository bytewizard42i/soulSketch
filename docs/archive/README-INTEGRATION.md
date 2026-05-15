# SoulSketch-Cipher Integration Guide

## Overview
This integration bridges SoulSketch's human-curated memory packs with Cipher's runtime vector and workspace memory stores, preserving the "resonance over replication" philosophy while adding robust memory management capabilities.

## Completed Enhancements

### 1. **Schema Mapping** (`schemas/soulsketch-pack.schema.json`)
- Unified JSON schema for SoulSketch memory packs
- Supports versioning and migrations
- Five-fold memory categories with typed envelopes
- Metadata for LLM defaults and tool preferences

### 2. **CLI Importer** (`cli/soulsketch-import.ts`)
- Validates packs against schema
- Normalizes legacy formats to new schema
- Imports memories with resonance scoring
- Supports dry-run mode for testing

### 3. **Security Boundaries** (`protocol/security-boundaries.ts`)
- Path validation and normalization
- File size and MIME type restrictions
- Rate limiting per client
- Request timeouts
- Configurable allow/deny lists

### 4. **Typed Memory Envelopes** (`protocol/memory-envelope.ts`)
- Consistent metadata wrapping for all memories
- TTL-based expiration
- Visibility levels (public/workspace/private)
- SHA-256 checksums for integrity
- ULID generation for chronological sorting

### 5. **Unified Configuration** (`core/env-config.ts`)
- Single source of truth for all settings
- Environment variable overrides
- Configuration validation
- Secure export/import with secret redaction

### 6. **Runtime Observations** (`protocol/runtime-observations.ts`)
- Standardized JSONL format
- Impact-based TTL assignment
- Pattern analysis and reporting
- Export to JSON/CSV/Markdown

### 7. **Deterministic Embeddings** (`protocol/embedding-pipeline.ts`)
- Consistent vector generation across upgrades
- Caching with disk persistence
- L2 normalization
- Batch processing support
- Consistency verification

### 8. **E2E Testing** (`tests/e2e/pack-import.test.ts`)
- Complete import flow validation
- Legacy format conversion
- Security boundary enforcement
- TTL expiration handling
- Memory resonance preservation

## Quick Start

### Import a SoulSketch Pack

```bash
# Install dependencies
npm install

# Import a pack (validates and imports)
npx tsx cli/soulsketch-import.ts path/to/pack.json

# Dry run to preview import
npx tsx cli/soulsketch-import.ts path/to/pack.json --dry-run

# Force import even if validation fails
npx tsx cli/soulsketch-import.ts path/to/pack.json --force

# Save normalized pack
npx tsx cli/soulsketch-import.ts path/to/pack.json --output normalized.json
```

### Create a New Pack

```typescript
import { MemoryEnvelopeManager } from './protocol/memory-envelope';

const pack = {
  version: "1.0.0",
  identity: {
    id: MemoryEnvelopeManager.generateULID(),
    name: "MyAgent",
    created: new Date().toISOString(),
    lastModified: new Date().toISOString()
  },
  memories: {
    persona: MemoryEnvelopeManager.createEnvelope('persona', {
      role: 'AI Assistant',
      traits: ['helpful', 'curious', 'precise']
    }),
    relationships: [],
    technical: [],
    stylistic: null,
    runtime: []
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
```

### Configure Security

```typescript
import { SecurityBoundaryManager } from './protocol/security-boundaries';

const security = new SecurityBoundaryManager({
  allowedRoots: ['/safe/path'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  rateLimitPerMinute: 30,
  requestTimeout: 3000
});

// Validate a path
const result = await security.validatePath('/path/to/file');
if (result.valid) {
  // Safe to access
}

// Secure file read
const content = await security.secureRead('/path/to/file', 'client-id');
```

### Track Runtime Observations

```typescript
import { RuntimeObservationManager } from './protocol/runtime-observations';

const observer = new RuntimeObservationManager();

// Create an observation
const obs = observer.createObservation(
  'User prefers concise responses',
  'high',
  { user: 'user-123', task: 'coding' },
  { taken: 'Adjusted response style', result: 'Improved satisfaction', success: true }
);

// Write to JSONL
await observer.writeObservation(obs);

// Analyze patterns
const observations = await observer.readObservations();
const patterns = await observer.analyzePatterns(observations);
```

## Environment Variables

```bash
# Core settings
SOULSKETCH_BASE=/path/to/base  # Base directory for all data

# Embedding configuration
EMBEDDING_API_KEY=sk-...       # API key for embeddings

# LLM configuration  
LLM_PROVIDER=openai
LLM_MODEL=gpt-4
LLM_TEMPERATURE=0.7

# Runtime flags
DEBUG=true                      # Enable debug logging
VERBOSE=true                    # Verbose output
DISABLE_SANDBOX=false           # Disable security sandbox
```

## Testing

```bash
# Run all tests
npm test

# Run E2E tests only
npm test -- tests/e2e/

# Run with coverage
npm run test:coverage
```

## Migration from Legacy Format

The importer automatically detects and converts legacy SoulSketch packs:

1. **Persona** → Wrapped in typed envelope
2. **Stylistic Voice** → Converted to stylistic memory
3. **Relationship Dynamics** (Markdown) → Parsed into structured relationships
4. **Technical Domains** (Markdown) → Extracted into technical memories
5. **Runtime Observations** (JSONL) → Converted to standardized format

## Philosophy Preserved

The integration maintains SoulSketch's core philosophy:

- **Resonance over Replication**: Memories harmonize rather than duplicate
- **Braiding Strategy**: Memories interweave during identity transitions  
- **Semantic Continuity**: Identity preserved across model upgrades
- **Human Curation**: Pack creation remains a thoughtful, manual process

## Next Steps

1. Connect to Cipher's MCP servers for live memory sync
2. Implement vector database backend (Pinecone/Weaviate)
3. Add real embedding API integration
4. Create pack editor UI
5. Build memory visualization tools

## Support

For issues or questions, please refer to the main SoulSketch documentation or open an issue in the repository.

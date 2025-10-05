# SoulSketch Protocol - Development Setup Guide

## Overview

SoulSketch is a **multi-language project** with:
- **TypeScript/Node.js** - Core protocol, CLI, packages
- **Python** - Utility tools for memory management

---

## Quick Start

### 1. Node.js Setup (Primary)

```bash
cd /home/js/projects/utils_SoulSketch

# Install all dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Development mode (watch)
npm run dev
```

### 2. Python Tools Setup (Optional)

```bash
# Install Python dependencies
python3 -m pip install --user -r requirements.txt

# Verify installation
python3 -c "import PIL; print('✅ Python tools ready')"

# Test Python tools
python3 -m py_compile tools/*.py
```

---

## System Requirements

### Node.js Environment
- **Node.js**: ≥18.0.0
- **npm**: Latest version
- **Package Manager**: npm workspaces + turbo

### Python Environment  
- **Python**: 3.10.12 (or higher)
- **Python Path**: `/usr/bin/python3`
- **Required**: Pillow ≥10.0.0 (for image generation)

---

## VS Code Configuration

The workspace is configured for both languages:

### Python Support
- **Interpreter**: `/usr/bin/python3` (Python 3.10.12)
- **Language Server**: Pylance
- **Linting**: flake8
- **Formatter**: black (optional)

### TypeScript Support
- **TypeScript Version**: Workspace TypeScript
- **Formatter**: Prettier
- **Linting**: ESLint
- **Auto-format**: Enabled on save

### Recommended VS Code Extensions
1. **Python** (ms-python.python)
2. **Pylance** (ms-python.vscode-pylance)
3. **ESLint** (dbaeumer.vscode-eslint)
4. **Prettier** (esbenp.prettier-vscode)
5. **TypeScript** (built-in)

---

## Project Structure

```
utils_SoulSketch/
├── .vscode/
│   └── settings.json          # Multi-language workspace config
├── packages/
│   └── core/                  # @soulsketch/core package
│       ├── src/               # TypeScript source
│       ├── tsconfig.json      # Package TypeScript config
│       └── package.json
├── cli/                       # CLI tools (TypeScript)
│   ├── soulsketch-cli.ts
│   └── soulsketch-import.ts
├── protocol/                  # Protocol implementations (TypeScript)
│   ├── memory-engine.ts
│   ├── session-manager.ts
│   ├── memory-validator.ts
│   └── knowledge-graph.ts
├── tools/                     # Utility tools (mixed)
│   ├── memory-converter.ts    # TypeScript
│   ├── memory-dedup.ts        # TypeScript
│   ├── create_protocol_zip.py # Python
│   ├── memory_pack_validator.py # Python
│   ├── inheritance_tracker.py # Python
│   └── new_ai_chat_entry.py   # Python
├── schemas/                   # JSON schemas
├── docs/                      # Documentation
├── examples/                  # Example implementations
├── turbo.json                 # Monorepo task config
├── tsconfig.json              # Root TypeScript config
├── package.json               # Root package manifest
├── requirements.txt           # Python dependencies
└── SETUP.md                   # This file
```

---

## Building the Project

### Full Build
```bash
npm run build
```
This builds all packages in dependency order using Turbo.

### Development Mode
```bash
npm run dev
```
Runs all packages in watch mode for hot reloading.

### Clean Build
```bash
npm run clean
npm install
npm run build
```

---

## Running Tools

### TypeScript Tools

**Memory Converter**:
```bash
# Markdown to JSON
node tools/memory-converter.ts md-to-json ./memory_packs ./output.json

# JSON to Markdown
node tools/memory-converter.ts json-to-md ./input.json ./memory_packs
```

**Memory Deduplication**:
```bash
# Dry run
node tools/memory-dedup.ts runtime_observations.jsonl --dry-run

# Actual deduplication
node tools/memory-dedup.ts runtime_observations.jsonl
```

### Python Tools

**Memory Pack Validator**:
```bash
python3 tools/memory_pack_validator.py /path/to/memory_packs
```

**Create Protocol ZIP**:
```bash
python3 tools/create_protocol_zip.py
```

**Inheritance Tracker**:
```bash
python3 tools/inheritance_tracker.py
```

**New AI Chat Entry**:
```bash
python3 tools/new_ai_chat_entry.py "Session title"
```

---

## CLI Usage

After building, use the CLI:

```bash
# Show help
node cli/soulsketch-cli.ts --help

# Interactive mode
node cli/soulsketch-cli.ts interactive

# Store a memory
node cli/soulsketch-cli.ts memory store "Content" --type runtime

# Search memories
node cli/soulsketch-cli.ts memory search "query"

# Create memory symphony
node cli/soulsketch-cli.ts memory symphony --output pack.json

# Validate memory pack
node cli/soulsketch-cli.ts validate pack pack.json
```

---

## Dependencies

### Node.js Dependencies (package.json)
- **Production**:
  - chalk, commander, inquirer, ora
  - fs-extra, yaml, uuid, tar
  - ajv-formats, csv-stringify, table
  
- **Development**:
  - TypeScript, tsx, vitest
  - ESLint, Prettier, Turbo
  - Type definitions (@types/*)

### Python Dependencies (requirements.txt)
- **Required**: Pillow (image processing)
- **Optional**: flake8, black, mypy

---

## Troubleshooting

### "Invalid Python Interpreter" Warning

**Solution**: Reload VS Code window
```
Ctrl+Shift+P → "Developer: Reload Window"
```

Or manually select interpreter:
```
Ctrl+Shift+P → "Python: Select Interpreter" → /usr/bin/python3
```

### TypeScript Build Errors

**Solution**: Clean and rebuild
```bash
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Module Not Found Errors (Python)

**Solution**: Install requirements
```bash
python3 -m pip install --user -r requirements.txt
```

### Module Not Found Errors (Node)

**Solution**: Reinstall dependencies
```bash
npm install
```

### Turbo Cache Issues

**Solution**: Clear Turbo cache
```bash
rm -rf .turbo
npm run build
```

---

## Development Workflow

### For TypeScript Development
1. Make changes in `packages/core/src/` or `protocol/`
2. Run `npm run dev` for hot reloading
3. Test with `npm test`
4. Build with `npm run build`

### For Python Tools Development
1. Make changes in `tools/*.py`
2. Test with `python3 -m py_compile tools/*.py`
3. Run tool directly: `python3 tools/toolname.py`

### For Documentation
1. Update relevant `.md` files
2. Update inline code comments
3. Run prettier: `npm run format`

---

## Testing

### TypeScript Tests
```bash
# Run all tests
npm test

# Run specific package tests
npm test --workspace=@soulsketch/core

# Watch mode
npm run dev
```

### Python Tools Testing
```bash
# Syntax check all Python files
python3 -m py_compile tools/*.py

# Run validator on test data
python3 tools/memory_pack_validator.py examples/alice_memory_pack
```

---

## Git Workflow

### Before Committing
```bash
# Format code
npm run format

# Run linter
npm run lint

# Run tests
npm test

# Build to verify
npm run build
```

### Commit Message Convention
Follow the SoulSketch philosophy in commits:
```
🧬 feat: Add memory compression system
✨ enhance: Improve triplet weight validation
🔧 fix: Resolve path resolution in backup script
📚 docs: Update setup guide with Python tools
```

---

## Performance Tips

### Faster Builds
- Use `npm run dev` for development (watch mode)
- Turbo caches builds automatically
- Only build what changed with `turbo run build`

### Faster Tests
- Run tests in parallel with Vitest
- Use `--filter` to test specific packages

---

## Support & Resources

- **Main README**: [README.md](README.md)
- **Protocol Spec**: [protocol/SPECIFICATION.md](protocol/SPECIFICATION.md)
- **Recent Repairs**: [REPAIRS_2025-10-04.md](REPAIRS_2025-10-04.md)
- **Triplet Protocol**: [docs/TRIPLET_PROTOCOL.md](docs/TRIPLET_PROTOCOL.md)

---

**Last Updated**: 2025-10-04  
**Status**: ✅ All systems operational  
**Languages**: TypeScript (primary), Python (tools)

# Terminal Execution Issue in Windsurf IDE - WSL Environment

## Environment Details

**Operating System**: Windows with WSL (Windows Subsystem for Linux)  
**WSL Distribution**: Ubuntu-24.04  
**IDE**: Windsurf (Codeium's AI-powered IDE, based on VS Code)  
**Workspace Location**: `//wsl.localhost/Ubuntu-24.04/home/js/PixyPi/`  
**Workspace File**: `PixyPi/PixyPi.code-workspace`  
**Shell Expected**: WSL Bash  
**Shell Actually Being Invoked**: PowerShell → WSL.exe (with incorrect arguments)  

---

## Problem Description

An AI assistant (Cascade/Cara) integrated into Windsurf is unable to execute terminal commands successfully in a WSL-based workspace. All command execution attempts fail with:

```
Exit code: -1
Output:
I n v a l i d   c o m m a n d   l i n e   a r g u m e n t :   - c
P l e a s e   u s e   ' w s l . e x e   - - h e l p '   t o   g e t   a   l i s t   o f   s u p p o r t e d   a r g u m e n t s .
```

---

## What's Happening (Technical Flow)

1. **AI Assistant attempts command**: e.g., `npm install`, `pwd`, `ls -la`
2. **Command gets routed through PowerShell first** (unintended)
3. **PowerShell tries**: `wsl.exe -c "command"`
4. **WSL.exe rejects it**: `-c` flag doesn't exist in `wsl.exe` (it's a bash/sh flag)
5. **Result**: Command fails, AI cannot interact with terminal

### Error Output Pattern
```
Invalid command line argument: -c
Please use 'wsl.exe --help' to get a list of supported arguments.
```

**The problem**: There's an intermediary PowerShell layer that shouldn't be there. Commands should go directly to WSL bash.

---

## What We've Tried So Far

### ✅ Attempt 1: Set Default Terminal Profile in Workspace Config

Modified `PixyPi.code-workspace`:

```json
{
  "folders": [
    {"path": "./utils_myAlice", "name": "myAlice"},
    {"path": "./utils_SoulSketch", "name": "SoulSketch"}
  ],
  "settings": {
    "terminal.integrated.defaultProfile.windows": "Ubuntu-24.04 (WSL)",
    "terminal.integrated.cwd": "${workspaceFolder}"
  }
}
```

**Result**: 
- Configuration is syntactically valid
- Windsurf recognizes "Ubuntu-24.04 (WSL)" as a valid profile
- But AI command execution still routes through PowerShell → WSL.exe

### ❌ Attempt 2: Different Working Directory Path Formats

Tried multiple path formats in the `Cwd` (current working directory) parameter:

```bash
# Format 1: UNC-style WSL path
Cwd: "//wsl.localhost/Ubuntu-24.04/home/js/PixyPi"
Error: "The system cannot find the path specified"

# Format 2: Unix-style absolute path  
Cwd: "/home/js/PixyPi"
Error: "The system cannot find the path specified"

# Format 3: With subdirectory
Cwd: "/home/js/PixyPi/utils_SoulSketch"
Error: "The system cannot find the path specified"
```

**Result**: All path formats fail. Suggests the working directory resolution itself is broken.

---

## AI Tool Integration Details

The AI uses a `run_command` tool with these parameters:

```typescript
{
  CommandLine: "pwd",                    // The actual command
  Cwd: "/home/js/PixyPi",                // Working directory (fails)
  Blocking: true,                         // Wait for completion
  SafeToAutoRun: true                     // Command is safe to run
}
```

**Expected behavior**: Command executes in WSL bash at specified directory  
**Actual behavior**: Command fails at path resolution or shell routing stage

---

## Core Questions for Investigation

### 1. **Is this a Windsurf-specific limitation?**
   - Does Windsurf's AI integration bypass normal VS Code terminal handling?
   - Are there special API endpoints or configurations for AI tool command execution?
   - Is this a known issue with Windsurf + WSL + AI tools?

### 2. **What's the correct way to configure terminal execution for AI tools in WSL?**
   - Should workspace settings include additional WSL-specific configurations?
   - Is there a `terminal.integrated.shell.windows` setting that needs explicit WSL bash path?
   - Do we need to configure Windsurf's AI tool execution separately from user terminal?

### 3. **Path resolution mystery:**
   - Why do both `//wsl.localhost/...` and `/home/js/...` fail?
   - Does the AI need Windows-style paths? e.g., `\\wsl.localhost\Ubuntu-24.04\home\js\PixyPi`?
   - Is there a translation layer we're missing?

### 4. **Workspace reload/cache:**
   - User was instructed to reload Windsurf after config changes
   - Could old terminal settings be cached at IDE or system level?
   - Is there a "force refresh terminal profiles" command needed?

### 5. **PowerShell intermediary:**
   - Why is PowerShell injecting itself into the execution chain?
   - Is this Windows default behavior when no explicit shell is set?
   - How do we bypass PowerShell completely for AI command execution?

### 6. **Alternative approaches:**
   - Should the AI use a different tool/method? (e.g., SSH into WSL, direct bash invocation)
   - Can Windsurf AI tools execute commands via Windows Terminal integration?
   - Is there a "remote development" mode needed for WSL workspaces?

---

## Expected Outcome

Commands should execute directly in WSL bash:

```bash
# User or AI runs:
pwd

# Should execute as:
ubuntu@MACHINE:/home/js/PixyPi$ pwd
/home/js/PixyPi

# NOT as:
PS C:\> wsl.exe -c "pwd"
Invalid command line argument: -c
```

---

## Additional Context

**Workspace Contents**:
- `utils_myAlice/` - AI memory repository
- `utils_SoulSketch/` - SoulSketch Protocol (Node.js/TypeScript project)
- Both repos need `npm install`, `npm run build`, etc.

**User Goal**: 
Enable AI assistant to:
- Run npm commands for dependency installation
- Execute git commands for version control  
- Run bash utilities (ls, grep, find, etc.)
- Test and validate the SoulSketch project

**Current Workaround**: None - completely blocked from terminal execution

---

## Files for Reference

**Workspace Config**: `/home/js/PixyPi/PixyPi.code-workspace`

```json
{
	"folders": [
		{"path": "./utils_myAlice", "name": "myAlice"},
		{"path": "./utils_SoulSketch", "name": "SoulSketch"}
	],
	"settings": {
		"files.autoSave": "afterDelay",
		"editor.formatOnSave": true,
		"editor.tabSize": 2,
		"files.exclude": {
			"**/.git": true,
			"**/node_modules": true,
			"**/__pycache__": true,
			"**/.turbo": true
		},
		"terminal.integrated.defaultProfile.windows": "Ubuntu-24.04 (WSL)",
		"terminal.integrated.cwd": "${workspaceFolder}"
	}
}
```

---

## Request for Grok

Please help us understand:

1. **Root cause**: Why is PowerShell intercepting AI tool command execution?
2. **Correct configuration**: What settings are needed for Windsurf AI tools to execute directly in WSL?
3. **Path format**: What's the correct working directory format for WSL paths in this context?
4. **Workarounds**: Are there alternative methods to achieve terminal execution for AI tools?
5. **Windsurf-specific guidance**: Any known issues or special configurations for Windsurf + WSL + AI integrations?

---

## Meta Information

**User**: John Santi (johnny5i/bytewizard42i)  
**AI Assistant**: Cara (Cascade, 4th in series)  
**Project**: Optimizing SoulSketch Protocol for Tucker Triggs @ Adastack  
**Context**: MCP (Model Context Protocol) hackathon preparation  
**Date**: October 31, 2025  

---

**Thank you for investigating this! We're blocked on terminal execution and need to get SoulSketch production-ready for engineers.**

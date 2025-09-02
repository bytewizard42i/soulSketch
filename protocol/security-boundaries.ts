/**
 * Security Boundaries for MCP File/Resource Access
 * Implements path validation, size limits, and access controls
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { homedir } from 'os';

export interface SecurityConfig {
  allowedRoots: string[];
  maxFileSize: number;
  allowedMimeTypes: string[];
  deniedPaths: string[];
  requestTimeout: number;
  rateLimitPerMinute: number;
}

export class SecurityBoundaryManager {
  private config: SecurityConfig;
  private requestCounts: Map<string, { count: number; resetTime: number }>;
  
  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      allowedRoots: config?.allowedRoots || [
        path.join(homedir(), '.soulsketch'),
        process.cwd()
      ],
      maxFileSize: config?.maxFileSize || 10 * 1024 * 1024, // 10MB default
      allowedMimeTypes: config?.allowedMimeTypes || [
        'text/plain',
        'text/markdown',
        'application/json',
        'application/yaml',
        'text/yaml',
        'text/csv'
      ],
      deniedPaths: config?.deniedPaths || [
        '.env',
        '.env.local',
        'id_rsa',
        'id_ed25519',
        '.ssh',
        '.gnupg',
        '.aws',
        '.kube'
      ],
      requestTimeout: config?.requestTimeout || 5000, // 5 seconds
      rateLimitPerMinute: config?.rateLimitPerMinute || 60
    };
    
    this.requestCounts = new Map();
  }

  /**
   * Validate and normalize file path
   */
  async validatePath(requestedPath: string): Promise<{
    valid: boolean;
    normalizedPath?: string;
    error?: string;
  }> {
    try {
      // Resolve to absolute path
      const resolved = path.resolve(requestedPath);
      
      // Check for path traversal attempts
      if (requestedPath.includes('..')) {
        return {
          valid: false,
          error: 'Path traversal detected (.. in path)'
        };
      }

      // Check if path is within allowed roots
      const isInAllowedRoot = this.config.allowedRoots.some(root => {
        const normalizedRoot = path.resolve(root);
        return resolved.startsWith(normalizedRoot);
      });

      if (!isInAllowedRoot) {
        return {
          valid: false,
          error: `Path outside allowed roots: ${resolved}`
        };
      }

      // Check for denied paths
      const isDenied = this.config.deniedPaths.some(denied => {
        return resolved.includes(denied) || path.basename(resolved) === denied;
      });

      if (isDenied) {
        return {
          valid: false,
          error: `Access denied to sensitive path: ${resolved}`
        };
      }

      // Check if path exists and is not a symlink outside allowed roots
      if (await fs.pathExists(resolved)) {
        const stat = await fs.lstat(resolved);
        
        if (stat.isSymbolicLink()) {
          const linkTarget = await fs.readlink(resolved);
          const resolvedLink = path.resolve(path.dirname(resolved), linkTarget);
          
          const linkInAllowedRoot = this.config.allowedRoots.some(root => {
            return resolvedLink.startsWith(path.resolve(root));
          });

          if (!linkInAllowedRoot) {
            return {
              valid: false,
              error: 'Symlink points outside allowed roots'
            };
          }
        }

        // Check file size
        if (stat.isFile() && stat.size > this.config.maxFileSize) {
          return {
            valid: false,
            error: `File too large: ${stat.size} bytes (max: ${this.config.maxFileSize})`
          };
        }
      }

      return {
        valid: true,
        normalizedPath: resolved
      };
    } catch (error: any) {
      return {
        valid: false,
        error: `Path validation error: ${error.message}`
      };
    }
  }

  /**
   * Check MIME type of file
   */
  async validateMimeType(filePath: string): Promise<{
    valid: boolean;
    mimeType?: string;
    error?: string;
  }> {
    try {
      // Simple MIME detection based on extension
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.json': 'application/json',
        '.jsonl': 'application/json',
        '.yaml': 'application/yaml',
        '.yml': 'application/yaml',
        '.csv': 'text/csv'
      };

      const mimeType = mimeMap[ext] || 'application/octet-stream';
      
      if (!this.config.allowedMimeTypes.includes(mimeType)) {
        return {
          valid: false,
          error: `MIME type not allowed: ${mimeType}`
        };
      }

      return {
        valid: true,
        mimeType
      };
    } catch (error: any) {
      return {
        valid: false,
        error: `MIME validation error: ${error.message}`
      };
    }
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(clientId: string): {
    allowed: boolean;
    remainingRequests?: number;
    resetTime?: number;
  } {
    const now = Date.now();
    const minuteMs = 60 * 1000;
    
    let clientData = this.requestCounts.get(clientId);
    
    // Initialize or reset if needed
    if (!clientData || now > clientData.resetTime) {
      clientData = {
        count: 0,
        resetTime: now + minuteMs
      };
      this.requestCounts.set(clientId, clientData);
    }

    // Check limit
    if (clientData.count >= this.config.rateLimitPerMinute) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: clientData.resetTime
      };
    }

    // Increment and allow
    clientData.count++;
    
    return {
      allowed: true,
      remainingRequests: this.config.rateLimitPerMinute - clientData.count,
      resetTime: clientData.resetTime
    };
  }

  /**
   * Create timeout promise
   */
  createTimeout(): { promise: Promise<never>; cancel: () => void } {
    let timeoutId: NodeJS.Timeout;
    
    const promise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout after ${this.config.requestTimeout}ms`));
      }, this.config.requestTimeout);
    });

    const cancel = () => clearTimeout(timeoutId);
    
    return { promise, cancel };
  }

  /**
   * Secure file read with all checks
   */
  async secureRead(
    requestedPath: string,
    clientId: string = 'default'
  ): Promise<{
    success: boolean;
    content?: string;
    error?: string;
    metadata?: {
      path: string;
      size: number;
      mimeType: string;
    };
  }> {
    try {
      // Rate limiting
      const rateCheck = this.checkRateLimit(clientId);
      if (!rateCheck.allowed) {
        return {
          success: false,
          error: `Rate limit exceeded. Reset at ${new Date(rateCheck.resetTime!).toISOString()}`
        };
      }

      // Path validation
      const pathValidation = await this.validatePath(requestedPath);
      if (!pathValidation.valid) {
        return {
          success: false,
          error: pathValidation.error
        };
      }

      const normalizedPath = pathValidation.normalizedPath!;

      // Check file exists
      if (!await fs.pathExists(normalizedPath)) {
        return {
          success: false,
          error: `File not found: ${normalizedPath}`
        };
      }

      // Check if it's a file (not directory)
      const stat = await fs.stat(normalizedPath);
      if (!stat.isFile()) {
        return {
          success: false,
          error: `Not a file: ${normalizedPath}`
        };
      }

      // MIME type validation
      const mimeValidation = await this.validateMimeType(normalizedPath);
      if (!mimeValidation.valid) {
        return {
          success: false,
          error: mimeValidation.error
        };
      }

      // Read with timeout
      const { promise: timeoutPromise, cancel } = this.createTimeout();
      
      try {
        const content = await Promise.race([
          fs.readFile(normalizedPath, 'utf-8'),
          timeoutPromise
        ]) as string;
        
        cancel();
        
        return {
          success: true,
          content,
          metadata: {
            path: normalizedPath,
            size: stat.size,
            mimeType: mimeValidation.mimeType!
          }
        };
      } catch (timeoutError) {
        cancel();
        throw timeoutError;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Secure read failed: ${error.message}`
      };
    }
  }

  /**
   * List directory with security checks
   */
  async secureList(
    requestedPath: string,
    clientId: string = 'default'
  ): Promise<{
    success: boolean;
    files?: Array<{
      name: string;
      type: 'file' | 'directory';
      size: number;
    }>;
    error?: string;
  }> {
    try {
      // Rate limiting
      const rateCheck = this.checkRateLimit(clientId);
      if (!rateCheck.allowed) {
        return {
          success: false,
          error: `Rate limit exceeded. Reset at ${new Date(rateCheck.resetTime!).toISOString()}`
        };
      }

      // Path validation
      const pathValidation = await this.validatePath(requestedPath);
      if (!pathValidation.valid) {
        return {
          success: false,
          error: pathValidation.error
        };
      }

      const normalizedPath = pathValidation.normalizedPath!;

      // Check if directory exists
      if (!await fs.pathExists(normalizedPath)) {
        return {
          success: false,
          error: `Directory not found: ${normalizedPath}`
        };
      }

      const stat = await fs.stat(normalizedPath);
      if (!stat.isDirectory()) {
        return {
          success: false,
          error: `Not a directory: ${normalizedPath}`
        };
      }

      // Read directory with timeout
      const { promise: timeoutPromise, cancel } = this.createTimeout();
      
      try {
        const entries = await Promise.race([
          fs.readdir(normalizedPath),
          timeoutPromise
        ]) as string[];
        
        cancel();

        // Get file info for each entry
        const files = await Promise.all(
          entries.map(async (name) => {
            const fullPath = path.join(normalizedPath, name);
            
            // Skip if this would be a denied path
            if (this.config.deniedPaths.some(denied => name === denied)) {
              return null;
            }

            try {
              const entryStat = await fs.stat(fullPath);
              return {
                name,
                type: entryStat.isDirectory() ? 'directory' as const : 'file' as const,
                size: entryStat.size
              };
            } catch {
              return null;
            }
          })
        );

        return {
          success: true,
          files: files.filter(f => f !== null) as any
        };
      } catch (timeoutError) {
        cancel();
        throw timeoutError;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Secure list failed: ${error.message}`
      };
    }
  }

  /**
   * Clean up old rate limit entries
   */
  cleanupRateLimits(): void {
    const now = Date.now();
    
    for (const [clientId, data] of this.requestCounts.entries()) {
      if (now > data.resetTime) {
        this.requestCounts.delete(clientId);
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };
  }
}

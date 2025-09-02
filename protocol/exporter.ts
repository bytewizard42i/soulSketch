/**
 * SoulSketch Multi-Format Exporter
 * Export memory packs in various formats for compatibility
 * Inspired by Cipher's export capabilities
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'yaml';
import * as csv from 'csv-stringify';
import { MemoryPack, SoulMemory } from './memory-engine.js';

export type ExportFormat = 'json' | 'yaml' | 'csv' | 'markdown' | 'html' | 'archive';

export interface ExportOptions {
  format: ExportFormat;
  outputPath: string;
  includeEmbeddings?: boolean;
  prettyPrint?: boolean;
  compression?: boolean;
  metadata?: Record<string, any>;
}

export class MemoryExporter {
  /**
   * Export a memory pack in the specified format
   */
  async export(pack: MemoryPack, options: ExportOptions): Promise<void> {
    const exporters: Record<ExportFormat, (pack: MemoryPack, options: ExportOptions) => Promise<string | Buffer>> = {
      json: this.exportJSON,
      yaml: this.exportYAML,
      csv: this.exportCSV,
      markdown: this.exportMarkdown,
      html: this.exportHTML,
      archive: this.exportArchive
    };

    const exporter = exporters[options.format];
    if (!exporter) {
      throw new Error(`Unsupported export format: ${options.format}`);
    }

    const output = await exporter.call(this, pack, options);
    
    if (Buffer.isBuffer(output)) {
      await fs.writeFile(options.outputPath, output);
    } else {
      await fs.writeFile(options.outputPath, output, 'utf8');
    }
  }

  /**
   * Export as JSON
   */
  private async exportJSON(pack: MemoryPack, options: ExportOptions): Promise<string> {
    const data = this.preparePackData(pack, options);
    return JSON.stringify(data, null, options.prettyPrint ? 2 : 0);
  }

  /**
   * Export as YAML
   */
  private async exportYAML(pack: MemoryPack, options: ExportOptions): Promise<string> {
    const data = this.preparePackData(pack, options);
    return yaml.stringify(data);
  }

  /**
   * Export as CSV (flattened structure)
   */
  private async exportCSV(pack: MemoryPack, options: ExportOptions): Promise<string> {
    const allMemories = this.flattenMemories(pack);
    
    const records = allMemories.map(m => ({
      id: m.id,
      type: m.type,
      content: m.content,
      timestamp: m.timestamp,
      hash: m.hash,
      resonanceScore: m.resonanceScore || '',
      harmonics: (m.harmonics || []).join(';')
    }));

    return new Promise((resolve, reject) => {
      csv.stringify(records, {
        header: true,
        columns: ['id', 'type', 'content', 'timestamp', 'hash', 'resonanceScore', 'harmonics']
      }, (err, output) => {
        if (err) reject(err);
        else resolve(output);
      });
    });
  }

  /**
   * Export as Markdown documentation
   */
  private async exportMarkdown(pack: MemoryPack, options: ExportOptions): Promise<string> {
    const lines: string[] = [];
    
    lines.push('# SoulSketch Memory Pack');
    lines.push('');
    lines.push(`**Identity:** ${pack.metadata.identity}`);
    lines.push(`**Version:** ${pack.metadata.version}`);
    lines.push(`**Last Resonance:** ${pack.metadata.lastResonance}`);
    lines.push(`**Symphony Hash:** \`${pack.metadata.symphonyHash}\``);
    lines.push('');

    // Add table of contents
    lines.push('## Table of Contents');
    lines.push('');
    lines.push('- [Persona Memories](#persona-memories)');
    lines.push('- [Relationship Memories](#relationship-memories)');
    lines.push('- [Technical Memories](#technical-memories)');
    lines.push('- [Stylistic Memories](#stylistic-memories)');
    lines.push('- [Runtime Memories](#runtime-memories)');
    lines.push('');

    // Export each category
    const categories = [
      { name: 'Persona', memories: pack.persona },
      { name: 'Relationship', memories: pack.relationships },
      { name: 'Technical', memories: pack.technical },
      { name: 'Stylistic', memories: pack.stylistic },
      { name: 'Runtime', memories: pack.runtime }
    ];

    for (const category of categories) {
      lines.push(`## ${category.name} Memories`);
      lines.push('');
      
      if (category.memories.length === 0) {
        lines.push('*No memories in this category*');
        lines.push('');
        continue;
      }

      for (const memory of category.memories) {
        lines.push(`### ${memory.id}`);
        lines.push('');
        lines.push(`**Type:** ${memory.type}`);
        lines.push(`**Timestamp:** ${memory.timestamp}`);
        lines.push(`**Hash:** \`${memory.hash}\``);
        
        if (memory.resonanceScore !== undefined) {
          lines.push(`**Resonance Score:** ${memory.resonanceScore}`);
        }
        
        if (memory.harmonics && memory.harmonics.length > 0) {
          lines.push(`**Harmonics:** ${memory.harmonics.join(', ')}`);
        }
        
        lines.push('');
        lines.push('**Content:**');
        lines.push('```');
        lines.push(memory.content);
        lines.push('```');
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Export as HTML report
   */
  private async exportHTML(pack: MemoryPack, options: ExportOptions): Promise<string> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SoulSketch Memory Pack - ${pack.metadata.identity}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #667eea;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        h2 {
            color: #764ba2;
            margin-top: 30px;
        }
        .metadata {
            background: #f7f7f7;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .metadata dt {
            font-weight: bold;
            display: inline-block;
            width: 150px;
        }
        .metadata dd {
            display: inline;
            margin: 0;
        }
        .memory-category {
            margin-top: 30px;
        }
        .memory {
            background: #f9f9f9;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 15px 0;
            border-radius: 0 5px 5px 0;
        }
        .memory-header {
            font-weight: bold;
            color: #555;
            margin-bottom: 10px;
        }
        .memory-content {
            background: white;
            padding: 10px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .memory-meta {
            font-size: 0.9em;
            color: #666;
            margin-top: 10px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
        }
        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎭 SoulSketch Memory Pack</h1>
        
        <div class="metadata">
            <dl>
                <dt>Identity:</dt>
                <dd>${pack.metadata.identity}</dd><br>
                <dt>Version:</dt>
                <dd>${pack.metadata.version}</dd><br>
                <dt>Last Resonance:</dt>
                <dd>${new Date(pack.metadata.lastResonance).toLocaleString()}</dd><br>
                <dt>Symphony Hash:</dt>
                <dd><code>${pack.metadata.symphonyHash}</code></dd>
            </dl>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${pack.persona.length}</div>
                <div class="stat-label">Persona Memories</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${pack.relationships.length}</div>
                <div class="stat-label">Relationship Memories</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${pack.technical.length}</div>
                <div class="stat-label">Technical Memories</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${pack.stylistic.length}</div>
                <div class="stat-label">Stylistic Memories</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${pack.runtime.length}</div>
                <div class="stat-label">Runtime Memories</div>
            </div>
        </div>

        ${this.generateHTMLMemorySection('Persona', pack.persona)}
        ${this.generateHTMLMemorySection('Relationships', pack.relationships)}
        ${this.generateHTMLMemorySection('Technical', pack.technical)}
        ${this.generateHTMLMemorySection('Stylistic', pack.stylistic)}
        ${this.generateHTMLMemorySection('Runtime', pack.runtime)}
    </div>
</body>
</html>`;
    
    return html;
  }

  /**
   * Generate HTML section for a memory category
   */
  private generateHTMLMemorySection(title: string, memories: SoulMemory[]): string {
    if (memories.length === 0) {
      return `
        <div class="memory-category">
            <h2>${title} Memories</h2>
            <p><em>No memories in this category</em></p>
        </div>`;
    }

    const memoriesHTML = memories.map(m => `
        <div class="memory">
            <div class="memory-header">${m.id}</div>
            <div class="memory-content">${this.escapeHTML(m.content)}</div>
            <div class="memory-meta">
                Hash: ${m.hash.substring(0, 16)}... | 
                ${m.resonanceScore ? `Resonance: ${m.resonanceScore.toFixed(2)} | ` : ''}
                ${m.harmonics && m.harmonics.length > 0 ? `Harmonics: ${m.harmonics.length} | ` : ''}
                ${new Date(m.timestamp).toLocaleString()}
            </div>
        </div>
    `).join('');

    return `
        <div class="memory-category">
            <h2>${title} Memories</h2>
            ${memoriesHTML}
        </div>`;
  }

  /**
   * Export as compressed archive
   */
  private async exportArchive(pack: MemoryPack, options: ExportOptions): Promise<Buffer> {
    const tar = await import('tar');
    const zlib = await import('zlib');
    const { promisify } = await import('util');
    const gzip = promisify(zlib.gzip);

    // Create temporary directory
    const tempDir = path.join('/tmp', `soulsketch_export_${Date.now()}`);
    await fs.ensureDir(tempDir);

    try {
      // Export in multiple formats
      await this.export(pack, {
        ...options,
        format: 'json',
        outputPath: path.join(tempDir, 'pack.json')
      });

      await this.export(pack, {
        ...options,
        format: 'yaml',
        outputPath: path.join(tempDir, 'pack.yaml')
      });

      await this.export(pack, {
        ...options,
        format: 'markdown',
        outputPath: path.join(tempDir, 'README.md')
      });

      await this.export(pack, {
        ...options,
        format: 'html',
        outputPath: path.join(tempDir, 'report.html')
      });

      // Create tar archive
      const tarContent = await tar.create({
        gzip: false,
        cwd: tempDir
      }, ['.']);

      // Compress
      if (options.compression) {
        return await gzip(tarContent);
      }

      return tarContent as unknown as Buffer;
    } finally {
      // Cleanup temp directory
      await fs.remove(tempDir);
    }
  }

  /**
   * Prepare pack data for export
   */
  private preparePackData(pack: MemoryPack, options: ExportOptions): any {
    const data = { ...pack };
    
    // Remove embeddings if not requested
    if (!options.includeEmbeddings) {
      const removeEmbeddings = (memories: SoulMemory[]) => {
        return memories.map(m => {
          const copy = { ...m };
          delete copy.embedding;
          return copy;
        });
      };

      data.persona = removeEmbeddings(data.persona);
      data.relationships = removeEmbeddings(data.relationships);
      data.technical = removeEmbeddings(data.technical);
      data.stylistic = removeEmbeddings(data.stylistic);
      data.runtime = removeEmbeddings(data.runtime);
    }

    // Add custom metadata
    if (options.metadata) {
      data.metadata = {
        ...data.metadata,
        ...options.metadata,
        exportDate: new Date().toISOString(),
        exportFormat: options.format
      };
    }

    return data;
  }

  /**
   * Flatten all memories into a single array
   */
  private flattenMemories(pack: MemoryPack): SoulMemory[] {
    return [
      ...pack.persona,
      ...pack.relationships,
      ...pack.technical,
      ...pack.stylistic,
      ...pack.runtime
    ];
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    
    return text.replace(/[&<>"']/g, char => escapeMap[char]);
  }

  /**
   * Import a memory pack from various formats
   */
  async import(filePath: string, format?: ExportFormat): Promise<MemoryPack> {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Auto-detect format if not specified
    if (!format) {
      if (filePath.endsWith('.json')) format = 'json';
      else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) format = 'yaml';
      else if (filePath.endsWith('.csv')) format = 'csv';
      else throw new Error('Cannot auto-detect format. Please specify format explicitly.');
    }

    switch (format) {
      case 'json':
        return JSON.parse(content);
      
      case 'yaml':
        return yaml.parse(content);
      
      case 'csv':
        // CSV import would need special handling to reconstruct the pack structure
        throw new Error('CSV import not yet implemented');
      
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
  }
}

export default MemoryExporter;

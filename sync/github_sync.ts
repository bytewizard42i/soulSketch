/**
 * GitHub Sync Layer - Canonical Storage
 * All memory packets are stored as Markdown files with YAML frontmatter
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { MemoryPacket, ListFilter } from "../api/types.js";
import meta from "../config/.soulmeta.json" assert { type: "json" };

const MEMORY_DIR = path.join(meta.paths.repo_root, meta.paths.memory_dir);

/**
 * Convert memory packet to markdown with YAML frontmatter
 */
export function packetToMarkdown(packet: MemoryPacket): string {
  const frontmatter = {
    id: packet.id,
    title: packet.title,
    project: packet.project ?? "",
    tags: packet.tags ?? [],
    visibility: packet.visibility,
    created_at: packet.created_at,
    updated_at: packet.updated_at ?? packet.created_at,
    authors: packet.authors,
    links: packet.links ?? [],
  };

  const yamlLines = Object.entries(frontmatter).map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}: ${JSON.stringify(value)}`;
    }
    return `${key}: ${value}`;
  });

  const sections = [
    `---`,
    ...yamlLines,
    `---`,
    ``,
    `# ${packet.title}`,
    ``,
  ];

  if (packet.summary) {
    sections.push(`## Summary`, ``, packet.summary, ``);
  }

  sections.push(`## Content`, ``, packet.content, ``);

  if (packet.secrets && Object.keys(packet.secrets).length > 0) {
    sections.push(
      `## Secrets (Owner Only)`,
      ``,
      "```json",
      JSON.stringify(packet.secrets, null, 2),
      "```",
      ``
    );
  }

  if (packet.entities && packet.entities.length > 0) {
    sections.push(
      `## Entities`,
      ``,
      ...packet.entities.map((e) => `- **${e.name}** (${e.type})${e.did ? ` - \`${e.did}\`` : ""}`),
      ``
    );
  }

  if (packet.links && packet.links.length > 0) {
    sections.push(
      `## Links`,
      ``,
      ...packet.links.map((link) => `- ${link}`),
      ``
    );
  }

  return sections.join("\n");
}

/**
 * Parse markdown with YAML frontmatter to memory packet
 */
export function markdownToPacket(markdown: string): MemoryPacket {
  const lines = markdown.split("\n");
  
  // Extract frontmatter
  let frontmatterEnd = -1;
  let frontmatterStart = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      if (frontmatterStart === -1) {
        frontmatterStart = i;
      } else {
        frontmatterEnd = i;
        break;
      }
    }
  }

  if (frontmatterStart === -1 || frontmatterEnd === -1) {
    throw new Error("Invalid markdown: no frontmatter found");
  }

  const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
  const frontmatter: any = {};

  for (const line of frontmatterLines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    try {
      frontmatter[key] = JSON.parse(value);
    } catch {
      frontmatter[key] = value;
    }
  }

  // Extract content sections
  const contentLines = lines.slice(frontmatterEnd + 1);
  const fullContent = contentLines.join("\n");

  // Parse sections
  const summaryMatch = fullContent.match(/## Summary\s*([\s\S]*?)(?=\n##|$)/);
  const contentMatch = fullContent.match(/## Content\s*([\s\S]*?)(?=\n##|$)/);
  const secretsMatch = fullContent.match(/## Secrets[\s\S]*?```json\s*([\s\S]*?)```/);
  const entitiesMatch = fullContent.match(/## Entities\s*([\s\S]*?)(?=\n##|$)/);

  const packet: MemoryPacket = {
    id: frontmatter.id,
    title: frontmatter.title,
    project: frontmatter.project,
    tags: frontmatter.tags,
    visibility: frontmatter.visibility,
    created_at: frontmatter.created_at,
    updated_at: frontmatter.updated_at,
    authors: frontmatter.authors,
    links: frontmatter.links,
    content: contentMatch ? contentMatch[1].trim() : "",
    summary: summaryMatch ? summaryMatch[1].trim() : undefined,
  };

  if (secretsMatch) {
    try {
      packet.secrets = JSON.parse(secretsMatch[1]);
    } catch (e) {
      console.warn("Failed to parse secrets:", e);
    }
  }

  if (entitiesMatch) {
    const entityLines = entitiesMatch[1].trim().split("\n");
    packet.entities = entityLines
      .filter((line) => line.trim().startsWith("-"))
      .map((line) => {
        const match = line.match(/\*\*(.+?)\*\*\s*\((.+?)\)(?:\s*-\s*`(.+?)`)?/);
        if (match) {
          return {
            name: match[1],
            type: match[2],
            did: match[3],
          };
        }
        return null;
      })
      .filter(Boolean) as any[];
  }

  return packet;
}

/**
 * Generate filename from packet
 */
function getFilename(packet: MemoryPacket): string {
  const date = new Date(packet.created_at).toISOString().slice(0, 10);
  return `${date}_${packet.id}.md`;
}

/**
 * Write memory packet to GitHub repository
 */
export async function upsertToGit(packet: MemoryPacket): Promise<string> {
  await fs.mkdir(MEMORY_DIR, { recursive: true });

  const filename = getFilename(packet);
  const filepath = path.join(MEMORY_DIR, filename);

  const markdown = packetToMarkdown(packet);
  await fs.writeFile(filepath, markdown, "utf8");

  // Update metadata
  if (packet.metadata) {
    packet.metadata.github_path = filepath;
  } else {
    packet.metadata = { github_path: filepath };
  }

  return filepath;
}

/**
 * Read memory packet from GitHub repository
 */
export async function readFromGit(id: string): Promise<MemoryPacket | null> {
  try {
    const files = await fs.readdir(MEMORY_DIR);
    const matchingFile = files.find((f) => f.includes(id));

    if (!matchingFile) return null;

    const filepath = path.join(MEMORY_DIR, matchingFile);
    const markdown = await fs.readFile(filepath, "utf8");

    return markdownToPacket(markdown);
  } catch (error) {
    console.error("Error reading from Git:", error);
    return null;
  }
}

/**
 * List memory packets from GitHub repository
 */
export async function listFromGit(filter: ListFilter = {}): Promise<MemoryPacket[]> {
  try {
    await fs.mkdir(MEMORY_DIR, { recursive: true });
    const files = await fs.readdir(MEMORY_DIR);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    const packets = await Promise.all(
      mdFiles.map(async (file) => {
        try {
          const filepath = path.join(MEMORY_DIR, file);
          const markdown = await fs.readFile(filepath, "utf8");
          return markdownToPacket(markdown);
        } catch (error) {
          console.error(`Error parsing ${file}:`, error);
          return null;
        }
      })
    );

    let results = packets.filter((p): p is MemoryPacket => p !== null);

    // Apply filters
    if (filter.project) {
      results = results.filter((p) => p.project === filter.project);
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter((p) =>
        filter.tags!.some((tag) => p.tags?.includes(tag))
      );
    }

    if (filter.visibility) {
      results = results.filter((p) => p.visibility === filter.visibility);
    }

    if (filter.authors && filter.authors.length > 0) {
      results = results.filter((p) =>
        filter.authors!.some((author) => p.authors.includes(author))
      );
    }

    if (filter.since) {
      const sinceDate = new Date(filter.since);
      results = results.filter((p) => new Date(p.created_at) >= sinceDate);
    }

    if (filter.until) {
      const untilDate = new Date(filter.until);
      results = results.filter((p) => new Date(p.created_at) <= untilDate);
    }

    return results;
  } catch (error) {
    console.error("Error listing from Git:", error);
    return [];
  }
}

/**
 * Delete memory packet from GitHub repository
 */
export async function deleteFromGit(id: string): Promise<boolean> {
  try {
    const files = await fs.readdir(MEMORY_DIR);
    const matchingFile = files.find((f) => f.includes(id));

    if (!matchingFile) return false;

    const filepath = path.join(MEMORY_DIR, matchingFile);
    await fs.unlink(filepath);

    return true;
  } catch (error) {
    console.error("Error deleting from Git:", error);
    return false;
  }
}

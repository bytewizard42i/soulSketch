/**
 * Markdown to Notion Blocks Transformer
 * Converts memory packet markdown to Notion block structure
 * TODO: Phase 2 implementation
 */

import type { MemoryPacket } from "../../api/types.js";

/**
 * Convert memory packet markdown to Notion blocks
 * Placeholder for Phase 2
 */
export function toNotionBlocks(packet: MemoryPacket): any[] {
  // Phase 1: Simple placeholder that creates a single paragraph
  // Phase 2: Full markdown parser with proper block mapping

  const blocks: any[] = [];

  // Add title as heading
  blocks.push({
    object: "block",
    type: "heading_1",
    heading_1: {
      rich_text: [
        {
          type: "text",
          text: { content: packet.title },
        },
      ],
    },
  });

  // Add summary if present
  if (packet.summary) {
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: packet.summary },
            annotations: { italic: true },
          },
        ],
      },
    });
  }

  // Add content as paragraphs
  // TODO: Parse markdown properly (headings, lists, code blocks, etc.)
  const contentParagraphs = packet.content.split("\n\n");
  for (const para of contentParagraphs) {
    if (para.trim()) {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: para.trim() },
            },
          ],
        },
      });
    }
  }

  return blocks;
}

/**
 * Convert memory packet to Notion database properties
 */
export function toNotionProperties(packet: MemoryPacket): any {
  return {
    // Title property (required in Notion databases)
    Name: {
      title: [
        {
          type: "text",
          text: { content: packet.title },
        },
      ],
    },

    // Rich text properties
    Summary: packet.summary
      ? {
          rich_text: [
            {
              type: "text",
              text: { content: packet.summary },
            },
          ],
        }
      : undefined,

    // Select/Multi-select properties
    Project: packet.project
      ? {
          select: { name: packet.project },
        }
      : undefined,

    Tags: packet.tags
      ? {
          multi_select: packet.tags.map((tag) => ({ name: tag })),
        }
      : undefined,

    Visibility: {
      select: { name: packet.visibility },
    },

    // Multi-select for authors
    Authors: {
      multi_select: packet.authors.map((author) => ({ name: author })),
    },

    // Date properties
    "Created At": {
      date: { start: packet.created_at },
    },

    "Updated At": packet.updated_at
      ? {
          date: { start: packet.updated_at },
        }
      : undefined,

    // URL properties for links
    Links: packet.links?.length
      ? {
          rich_text: [
            {
              type: "text",
              text: { content: packet.links.join(", ") },
            },
          ],
        }
      : undefined,

    // External ID for syncing
    "External ID": {
      rich_text: [
        {
          type: "text",
          text: { content: packet.id },
        },
      ],
    },

    // Hash for deduplication
    Hash: packet.hash
      ? {
          rich_text: [
            {
              type: "text",
              text: { content: packet.hash },
            },
          ],
        }
      : undefined,
  };
}

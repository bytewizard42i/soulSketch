/**
 * Notion Blocks to Markdown Transformer
 * Converts Notion page structure back to memory packet markdown
 * TODO: Phase 2 implementation
 */

import type { MemoryPacket } from "../../api/types.js";

/**
 * Convert Notion blocks to markdown string
 * Placeholder for Phase 2
 */
export function fromNotionBlocks(blocks: any[]): string {
  // Phase 1: Simple placeholder
  // Phase 2: Full Notion block parser

  const lines: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
        lines.push(extractRichText(block.paragraph.rich_text));
        lines.push("");
        break;

      case "heading_1":
        lines.push(`# ${extractRichText(block.heading_1.rich_text)}`);
        lines.push("");
        break;

      case "heading_2":
        lines.push(`## ${extractRichText(block.heading_2.rich_text)}`);
        lines.push("");
        break;

      case "heading_3":
        lines.push(`### ${extractRichText(block.heading_3.rich_text)}`);
        lines.push("");
        break;

      case "bulleted_list_item":
        lines.push(`- ${extractRichText(block.bulleted_list_item.rich_text)}`);
        break;

      case "numbered_list_item":
        lines.push(`1. ${extractRichText(block.numbered_list_item.rich_text)}`);
        break;

      case "code":
        lines.push("```" + (block.code.language || ""));
        lines.push(extractRichText(block.code.rich_text));
        lines.push("```");
        lines.push("");
        break;

      default:
        console.warn(`Unknown block type: ${block.type}`);
    }
  }

  return lines.join("\n");
}

/**
 * Extract plain text from Notion rich text array
 */
function extractRichText(richText: any[]): string {
  if (!Array.isArray(richText)) return "";

  return richText
    .map((rt) => {
      let text = rt.text?.content || rt.plain_text || "";

      // Apply annotations
      if (rt.annotations) {
        if (rt.annotations.bold) text = `**${text}**`;
        if (rt.annotations.italic) text = `*${text}*`;
        if (rt.annotations.code) text = `\`${text}\``;
        if (rt.annotations.strikethrough) text = `~~${text}~~`;
      }

      return text;
    })
    .join("");
}

/**
 * Convert Notion database properties to memory packet fields
 */
export function fromNotionProperties(properties: any): Partial<MemoryPacket> {
  return {
    title:
      properties.Name?.title?.[0]?.text?.content ||
      properties.Title?.title?.[0]?.text?.content ||
      "Untitled",

    summary: properties.Summary?.rich_text?.[0]?.text?.content,

    project: properties.Project?.select?.name,

    tags: properties.Tags?.multi_select?.map((t: any) => t.name) || [],

    visibility: properties.Visibility?.select?.name || "owner",

    authors:
      properties.Authors?.multi_select?.map((a: any) => a.name) ||
      properties.Authors?.people?.map((p: any) => p.name) ||
      [],

    created_at:
      properties["Created At"]?.date?.start ||
      properties["Created"]?.created_time,

    updated_at:
      properties["Updated At"]?.date?.start ||
      properties["Last Edited"]?.last_edited_time,

    id: properties["External ID"]?.rich_text?.[0]?.text?.content,

    hash: properties.Hash?.rich_text?.[0]?.text?.content,
  };
}

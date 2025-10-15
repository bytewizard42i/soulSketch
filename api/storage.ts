/**
 * Storage utilities for memory packet processing
 * Handles hashing, sanitization, and role-based projections
 */

import crypto from "node:crypto";
import type { MemoryPacket, Role } from "./types.js";
import policies from "../config/policies.myalice.json" assert { type: "json" };

/**
 * Compute SHA-256 hash of memory packet content
 * Used for deduplication and integrity checking
 */
export function computeHash(packet: MemoryPacket): string {
  // Normalize packet for consistent hashing
  const normalized = {
    title: packet.title,
    content: packet.content,
    created_at: packet.created_at,
  };

  const json = JSON.stringify(normalized, Object.keys(normalized).sort());
  return crypto.createHash("sha256").update(json, "utf8").digest("hex");
}

/**
 * Apply role-based field projection
 * Returns only fields the role is allowed to see
 */
export function applyRoleProjection(
  packet: MemoryPacket,
  role: Role
): MemoryPacket {
  const roleConfig = policies.roles[role];
  if (!roleConfig) {
    throw new Error(`Unknown role: ${role}`);
  }

  // Owner gets everything
  if (role === "owner" || roleConfig.fields.includes("*")) {
    return packet;
  }

  // Build projected packet with allowed fields only
  const projected: Partial<MemoryPacket> = {};
  const allowedFields = new Set(roleConfig.fields);

  for (const [key, value] of Object.entries(packet)) {
    if (allowedFields.has(key)) {
      (projected as any)[key] = value;
    }
  }

  // Ensure required fields
  projected.id = packet.id;
  projected.title = packet.title;
  projected.created_at = packet.created_at;
  projected.authors = packet.authors;
  projected.visibility = packet.visibility;

  // Use sanitized content for non-owners
  if (allowedFields.has("sanitized_content")) {
    projected.sanitized_content = sanitizeContent(packet, roleConfig.redactions);
  }

  return projected as MemoryPacket;
}

/**
 * Sanitize content by removing redacted sections
 */
export function sanitizeContent(
  packet: MemoryPacket,
  redactions: string[]
): string {
  let content = packet.content;

  // Remove sections marked with redaction patterns
  for (const pattern of redactions) {
    const sectionPatterns = policies.redaction_patterns[pattern] || [];

    for (const sectionHeader of sectionPatterns) {
      // Remove markdown sections (e.g., "# Secrets")
      const regex = new RegExp(`${sectionHeader}[\\s\\S]*?(?=\\n#|$)`, "gi");
      content = content.replace(regex, "");

      // Remove HTML comments
      if (sectionHeader.startsWith("<!--")) {
        const commentRegex = new RegExp(
          `${sectionHeader}[\\s\\S]*?-->`,
          "gi"
        );
        content = content.replace(commentRegex, "");
      }
    }
  }

  // Remove key-value patterns (API_KEY, etc.)
  if (redactions.includes("api_keys")) {
    const keyPatterns = policies.redaction_patterns.api_keys || [];
    for (const keyPattern of keyPatterns) {
      const regex = new RegExp(`${keyPattern}\\s*[:=]\\s*[^\\s\\n]+`, "gi");
      content = content.replace(regex, `${keyPattern}: [REDACTED]`);
    }
  }

  return content.trim();
}

/**
 * Validate memory packet structure
 */
export function validatePacket(packet: MemoryPacket): boolean {
  // Basic validation
  if (!packet.id || !packet.title || !packet.created_at || !packet.authors) {
    return false;
  }

  if (!Array.isArray(packet.authors) || packet.authors.length === 0) {
    return false;
  }

  // Validate ID format
  if (!/^[a-z0-9-]{8,}$/.test(packet.id)) {
    return false;
  }

  // Validate visibility
  const validVisibility = ["owner", "collaborator", "public"];
  if (packet.visibility && !validVisibility.includes(packet.visibility)) {
    return false;
  }

  return true;
}

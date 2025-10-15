/**
 * SoulSketch Memory API Gateway
 * Unified interface for memory packet operations across GitHub and Notion
 */

import type {
  MemoryPacket,
  MemoryAPI,
  ListFilter,
  Role,
  UpsertResult,
} from "./types.js";
import { upsertToGit, readFromGit, listFromGit, deleteFromGit } from "../sync/github_sync.js";
import { upsertToNotion } from "../sync/notion_sync.js";
import { applyRoleProjection, computeHash } from "./storage.js";
import meta from "../config/.soulmeta.json" assert { type: "json" };

export * from "./types.js";

/**
 * Main memory API implementation
 * GitHub is always the source of truth; Notion is optional mirror
 */
export class SoulSketchMemoryAPI implements MemoryAPI {
  constructor(private config = meta) {}

  async getPacket(id: string, role: Role): Promise<MemoryPacket | null> {
    // Always read from GitHub (canonical source)
    const packet = await readFromGit(id);
    if (!packet) return null;

    // Apply role-based projection
    return applyRoleProjection(packet, role);
  }

  async listPackets(filter: ListFilter, role: Role): Promise<MemoryPacket[]> {
    const packets = await listFromGit(filter);

    // Filter by visibility and apply role projection
    return packets
      .filter((p) => this.canAccess(p, role))
      .map((p) => applyRoleProjection(p, role));
  }

  async upsertPacket(packet: MemoryPacket, role: Role): Promise<UpsertResult> {
    // Check write permission
    if (!this.canWrite(role)) {
      throw new Error(`Role '${role}' does not have write permission`);
    }

    // Compute hash for deduplication
    packet.hash = computeHash(packet);
    packet.updated_at = new Date().toISOString();

    // Always write to GitHub first (canonical storage)
    const githubPath = await upsertToGit(packet);

    const result: UpsertResult = {
      id: packet.id,
      hash: packet.hash,
      backends: { github: githubPath },
      timestamp: packet.updated_at,
    };

    // Optionally sync to Notion (if enabled)
    if (this.config.notion?.enabled && this.config.features?.notion_sync) {
      try {
        const notionPageId = await upsertToNotion(packet);
        result.backends.notion = notionPageId;
      } catch (error) {
        console.warn("Notion sync failed (non-fatal):", error);
        // Continue - GitHub is canonical
      }
    }

    return result;
  }

  async deletePacket(id: string, role: Role): Promise<boolean> {
    if (!this.canDelete(role)) {
      throw new Error(`Role '${role}' does not have delete permission`);
    }

    return await deleteFromGit(id);
  }

  async searchPackets(query: string, role: Role): Promise<MemoryPacket[]> {
    // Simple implementation: list all and filter by content
    // TODO: Implement proper full-text search
    const allPackets = await this.listPackets({}, role);
    const lowerQuery = query.toLowerCase();

    return allPackets.filter(
      (p) =>
        p.title.toLowerCase().includes(lowerQuery) ||
        p.summary?.toLowerCase().includes(lowerQuery) ||
        p.content.toLowerCase().includes(lowerQuery)
    );
  }

  private canAccess(packet: MemoryPacket, role: Role): boolean {
    const roleHierarchy: Record<Role, number> = {
      owner: 3,
      collaborator: 2,
      public: 1,
    };

    const packetLevel = roleHierarchy[packet.visibility];
    const roleLevel = roleHierarchy[role];

    return roleLevel >= packetLevel;
  }

  private canWrite(role: Role): boolean {
    return role === "owner" || role === "collaborator";
  }

  private canDelete(role: Role): boolean {
    return role === "owner";
  }
}

// Export singleton instance
export const memoryAPI = new SoulSketchMemoryAPI();

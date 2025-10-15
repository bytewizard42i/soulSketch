/**
 * SoulSketch × MyAlice × Notion Integration
 * Core type definitions for memory packet management
 */

export type Role = "owner" | "collaborator" | "public";

export type Visibility = "owner" | "collaborator" | "public";

export interface Entity {
  name: string;
  type: string;
  did?: string;
}

export interface MemoryMetadata {
  version?: string;
  schema_version?: string;
  source?: string;
  notion_page_id?: string;
  github_path?: string;
}

export interface MemoryPacket {
  id: string;
  title: string;
  summary?: string;
  project?: string;
  tags?: string[];
  created_at: string; // ISO 8601
  updated_at?: string; // ISO 8601
  authors: string[];
  visibility: Visibility;
  links?: string[];
  secrets?: Record<string, unknown>;
  content: string;
  sanitized_content?: string; // computed for non-owner roles
  hash?: string; // sha256 of normalized content
  entities?: Entity[];
  metadata?: MemoryMetadata;
}

export interface UpsertResult {
  id: string;
  hash: string;
  backends: {
    notion?: string;
    github?: string;
  };
  timestamp: string;
}

export interface ListFilter {
  project?: string;
  tags?: string[];
  visibility?: Visibility;
  authors?: string[];
  since?: string; // ISO date
  until?: string; // ISO date
}

export interface MemoryAPI {
  /**
   * Retrieve a single memory packet by ID
   * @param id - Memory packet identifier
   * @param role - Requesting role for access control
   */
  getPacket(id: string, role: Role): Promise<MemoryPacket | null>;

  /**
   * List memory packets with optional filters
   * @param filter - Filter criteria
   * @param role - Requesting role for access control
   */
  listPackets(filter: ListFilter, role: Role): Promise<MemoryPacket[]>;

  /**
   * Create or update a memory packet
   * @param packet - Memory packet to upsert
   * @param role - Requesting role for permission check
   */
  upsertPacket(packet: MemoryPacket, role: Role): Promise<UpsertResult>;

  /**
   * Delete a memory packet
   * @param id - Memory packet identifier
   * @param role - Requesting role for permission check
   */
  deletePacket(id: string, role: Role): Promise<boolean>;

  /**
   * Search memory packets by content
   * @param query - Search query
   * @param role - Requesting role for access control
   */
  searchPackets(query: string, role: Role): Promise<MemoryPacket[]>;
}

export interface SyncConfig {
  notion_enabled: boolean;
  github_enabled: boolean;
  auto_commit: boolean;
  batch_size: number;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

export interface PolicyConfig {
  roles: Record<Role, RolePermissions>;
  redaction_patterns: Record<string, string[]>;
}

export interface RolePermissions {
  description: string;
  fields: string[];
  redactions: string[];
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
    share: boolean;
  };
}

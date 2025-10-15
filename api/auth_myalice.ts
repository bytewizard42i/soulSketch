/**
 * MyAlice Protocol Authentication & Authorization
 * Placeholder for DID/wallet-based auth - currently uses headers
 */

import type { Role } from "./types.js";

/**
 * Extract role from request
 * TODO: Replace with real DID/wallet signature verification
 */
export function getRoleFromRequest(req: any): Role {
  // Phase 1: Simple header-based role
  // In production, this would:
  // 1. Verify DID signature
  // 2. Check wallet ownership
  // 3. Map identity to role via MyAlice policies
  
  const role = (req.headers?.["x-myalice-role"] ?? "public") as string;
  
  const validRoles: Role[] = ["owner", "collaborator", "public"];
  if (validRoles.includes(role as Role)) {
    return role as Role;
  }
  
  return "public";
}

/**
 * Verify DID signature (placeholder)
 * TODO: Implement with MyAlice DID verification
 */
export async function verifyDIDSignature(
  did: string,
  signature: string,
  message: string
): Promise<boolean> {
  // Placeholder - always returns true for now
  console.warn("verifyDIDSignature: Using placeholder implementation");
  return true;
}

/**
 * Get role from DID (placeholder)
 * TODO: Map DIDs to roles via MyAlice policy engine
 */
export async function getRoleFromDID(did: string): Promise<Role> {
  // Placeholder mapping
  // In production, this would query MyAlice policy database
  
  const knownOwners = ["did:alice", "did:john", "did:cassie"];
  const knownCollaborators = ["did:casey", "did:roberto"];
  
  if (knownOwners.includes(did)) {
    return "owner";
  }
  
  if (knownCollaborators.includes(did)) {
    return "collaborator";
  }
  
  return "public";
}

/**
 * Express middleware for MyAlice auth
 */
export function myAliceAuthMiddleware(req: any, res: any, next: any) {
  req.role = getRoleFromRequest(req);
  next();
}

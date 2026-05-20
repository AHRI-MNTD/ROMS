import { Role } from "./types";
import type { DomainAction } from "./types";

/**
 * PERMISSIONS matrix — maps Role → allowed domain:action strings.
 * Used by the API middleware and frontend route guards.
 */
export const PERMISSIONS: Record<Role, DomainAction[]> = {
  [Role.LAB_SCIENTIST]: [
    "biospecimen:read",
    "biospecimen:write",
    "inventory:read",
    "inventory:write",
    "lab-workflow:read",
    "lab-workflow:write",
    "data-management:read",
    "qms:read",
  ],

  [Role.DATA_MANAGER]: [
    "data-management:read",
    "data-management:write",
    "biospecimen:read",
    "inventory:read",
    "qms:read",
    "participant:read",
    "regulatory:read",
  ],

  [Role.RESEARCH_ADMIN]: [
    "hr:read",
    "hr:write",
    "finance:read",
    "finance:write",
    "qms:read",
    "qms:write",
    "regulatory:read",
    "regulatory:write",
    "participant:read",
    "participant:write",
    "inventory:read",
    "inventory:write",
    "biospecimen:read",
    "data-management:read",
    "infrastructure:read",
  ],

  [Role.PRINCIPAL_INVESTIGATOR]: [
    "biospecimen:read",
    "biospecimen:write",
    "inventory:read",
    "qms:read",
    "qms:write",
    "lab-workflow:read",
    "lab-workflow:write",
    "data-management:read",
    "data-management:write",
    "hr:read",
    "finance:read",
    "finance:write",
    "participant:read",
    "participant:write",
    "regulatory:read",
    "regulatory:write",
    "infrastructure:read",
  ],

  [Role.QA_OFFICER]: [
    "qms:read",
    "qms:write",
    "qms:delete",
    "biospecimen:read",
    "lab-workflow:read",
    "data-management:read",
    "regulatory:read",
    "regulatory:write",
    "hr:read",
    "finance:read",
    "participant:read",
    "inventory:read",
    "infrastructure:read",
  ],

  [Role.COMMUNITY_ENGAGEMENT]: [
    "participant:read",
    "participant:write",
    "data-management:read",
    "regulatory:read",
    "hr:read",
  ],

  [Role.ADMIN]: [
    "admin:all",
    "biospecimen:read",
    "biospecimen:write",
    "biospecimen:delete",
    "inventory:read",
    "inventory:write",
    "inventory:delete",
    "qms:read",
    "qms:write",
    "qms:delete",
    "lab-workflow:read",
    "lab-workflow:write",
    "lab-workflow:delete",
    "data-management:read",
    "data-management:write",
    "data-management:delete",
    "infrastructure:read",
    "infrastructure:write",
    "infrastructure:delete",
    "hr:read",
    "hr:write",
    "hr:delete",
    "finance:read",
    "finance:write",
    "finance:delete",
    "participant:read",
    "participant:write",
    "participant:delete",
    "regulatory:read",
    "regulatory:write",
    "regulatory:delete",
  ],
};

/**
 * Check whether a role has a specific permission.
 */
export function hasPermission(role: Role, action: DomainAction): boolean {
  const perms = PERMISSIONS[role];
  return perms.includes("admin:all") || perms.includes(action);
}

/**
 * Check whether any of the user's roles grants the given permission.
 */
export function hasAnyPermission(roles: Role[], action: DomainAction): boolean {
  return roles.some((r) => hasPermission(r, action));
}

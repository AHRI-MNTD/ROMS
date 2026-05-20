// ─── Core domain types ───────────────────────────────────────────────────────

export interface Task {
  readonly text: string;
}

export interface SubFunction {
  readonly name: string;
  readonly tasks: readonly string[];
}

export interface Domain {
  readonly id: number;
  readonly slug: string;
  readonly emoji: string;
  readonly name: string;
  readonly subfunctions: readonly SubFunction[];
}

// ─── Roles & RBAC ────────────────────────────────────────────────────────────

export enum Role {
  LAB_SCIENTIST = "LAB_SCIENTIST",
  DATA_MANAGER = "DATA_MANAGER",
  RESEARCH_ADMIN = "RESEARCH_ADMIN",
  PRINCIPAL_INVESTIGATOR = "PRINCIPAL_INVESTIGATOR",
  QA_OFFICER = "QA_OFFICER",
  COMMUNITY_ENGAGEMENT = "COMMUNITY_ENGAGEMENT",
  ADMIN = "ADMIN",
}

export type DomainAction =
  | "biospecimen:read"
  | "biospecimen:write"
  | "biospecimen:delete"
  | "inventory:read"
  | "inventory:write"
  | "inventory:delete"
  | "qms:read"
  | "qms:write"
  | "qms:delete"
  | "lab-workflow:read"
  | "lab-workflow:write"
  | "lab-workflow:delete"
  | "data-management:read"
  | "data-management:write"
  | "data-management:delete"
  | "infrastructure:read"
  | "infrastructure:write"
  | "infrastructure:delete"
  | "hr:read"
  | "hr:write"
  | "hr:delete"
  | "finance:read"
  | "finance:write"
  | "finance:delete"
  | "participant:read"
  | "participant:write"
  | "participant:delete"
  | "regulatory:read"
  | "regulatory:write"
  | "regulatory:delete"
  | "admin:all";

// ─── C4 Model Types ───────────────────────────────────────────────────────────

export interface C4User {
  icon: string;
  name: string;
  desc: string;
}

export interface C4External {
  icon: string;
  name: string;
  desc: string;
  tech: string;
}

export interface C4System {
  name: string;
  fullName: string;
  desc: string;
  tech: string;
  users: C4User[];
  externals: C4External[];
}

export interface C4Container {
  id: string;
  icon: string;
  name: string;
  kind: string;
  tech: string;
  color: string;
  desc: string;
  responsibilities: string[];
  drillTo: number | null;
}

export interface C4Component {
  icon: string;
  name: string;
  kind: string;
  tech: string;
  color: string;
  desc: string;
}

export interface C4Model {
  system: C4System;
  containers: C4Container[];
  components: Record<string, C4Component[]>;
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

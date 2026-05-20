import { z } from "zod";

// ─── Biospecimen ──────────────────────────────────────────────────────────────

export const SampleStatusSchema = z.enum([
  "REGISTERED",
  "IN_PROCESSING",
  "STORED",
  "DISPATCHED",
  "DEPLETED",
  "DESTROYED",
]);

export const CreateSampleSchema = z.object({
  accessionId: z.string().min(3).max(64),
  participantId: z.string().cuid(),
  collectedAt: z.coerce.date(),
  storageLocationId: z.string().cuid().optional(),
  status: SampleStatusSchema.default("REGISTERED"),
  studyCode: z.string().optional(),
  collectorId: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateSampleInput = z.infer<typeof CreateSampleSchema>;

// ─── QMS / SOP ────────────────────────────────────────────────────────────────

export const SOPStatusSchema = z.enum(["DRAFT", "REVIEW", "APPROVED", "RETIRED"]);

export const CreateSOPSchema = z.object({
  code: z.string().min(2).max(32),
  title: z.string().min(3).max(255),
  version: z.string().default("1.0"),
  ownerId: z.string().cuid(),
  status: SOPStatusSchema.default("DRAFT"),
  description: z.string().max(5000).optional(),
});

export type CreateSOPInput = z.infer<typeof CreateSOPSchema>;

export const CreateCAPASchema = z.object({
  finding: z.string().min(10).max(2000),
  ownerId: z.string().cuid(),
  dueDate: z.coerce.date(),
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "OVERDUE"]).default("OPEN"),
  sopId: z.string().cuid().optional(),
});

export type CreateCAPAInput = z.infer<typeof CreateCAPASchema>;

// ─── Finance / Grant ──────────────────────────────────────────────────────────

export const GrantStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "AWARDED",
  "ACTIVE",
  "CLOSED",
  "REJECTED",
]);

export const CreateGrantSchema = z.object({
  code: z.string().min(2).max(32),
  title: z.string().min(3).max(255),
  funder: z.string().min(2).max(255),
  awardedAmount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: GrantStatusSchema.default("DRAFT"),
});

export type CreateGrantInput = z.infer<typeof CreateGrantSchema>;

// ─── Participant ──────────────────────────────────────────────────────────────

export const ParticipantStatusSchema = z.enum([
  "SCREENED",
  "ENROLLED",
  "ACTIVE",
  "COMPLETED",
  "WITHDRAWN",
  "LOST_TO_FOLLOWUP",
]);

export const CreateParticipantSchema = z.object({
  pseudonymId: z.string().min(3).max(64),
  studyId: z.string().cuid(),
  status: ParticipantStatusSchema.default("SCREENED"),
  enrolledAt: z.coerce.date().optional(),
});

export type CreateParticipantInput = z.infer<typeof CreateParticipantSchema>;

export const CreateConsentSchema = z.object({
  participantId: z.string().cuid(),
  version: z.string().default("1.0"),
  signedAt: z.coerce.date(),
  witnessId: z.string().optional(),
});

export type CreateConsentInput = z.infer<typeof CreateConsentSchema>;

// ─── Regulatory ───────────────────────────────────────────────────────────────

export const EthicsStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "PENDING_REVIEW",
  "APPROVED",
  "CONDITIONALLY_APPROVED",
  "REJECTED",
  "EXPIRED",
]);

export const CreateEthicsSubmissionSchema = z.object({
  studyId: z.string().cuid(),
  committee: z.string().min(3).max(255),
  status: EthicsStatusSchema.default("DRAFT"),
  submittedAt: z.coerce.date().optional(),
});

export type CreateEthicsSubmissionInput = z.infer<typeof CreateEthicsSubmissionSchema>;

export const AdverseEventSeveritySchema = z.enum([
  "MILD",
  "MODERATE",
  "SEVERE",
  "LIFE_THREATENING",
  "FATAL",
]);

export const CreateAdverseEventSchema = z.object({
  studyId: z.string().cuid(),
  participantId: z.string().cuid(),
  severity: AdverseEventSeveritySchema,
  description: z.string().min(10).max(5000),
  reportedAt: z.coerce.date(),
  seriousness: z.enum(["SERIOUS", "NON_SERIOUS"]),
});

export type CreateAdverseEventInput = z.infer<typeof CreateAdverseEventSchema>;

// ─── Inventory ────────────────────────────────────────────────────────────────

export const CreateStockItemSchema = z.object({
  sku: z.string().min(2).max(64),
  name: z.string().min(2).max(255),
  lotNumber: z.string().max(64).optional(),
  expiryDate: z.coerce.date().optional(),
  quantity: z.number().int().nonnegative(),
  minThreshold: z.number().int().nonnegative().default(5),
  unit: z.string().max(32).default("units"),
});

export type CreateStockItemInput = z.infer<typeof CreateStockItemSchema>;

// ─── HR ───────────────────────────────────────────────────────────────────────

export const CreateStaffProfileSchema = z.object({
  userId: z.string().cuid(),
  department: z.string().min(2).max(128),
  jobTitle: z.string().min(2).max(128),
  startDate: z.coerce.date(),
});

export type CreateStaffProfileInput = z.infer<typeof CreateStaffProfileSchema>;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginInput = z.infer<typeof LoginSchema>;

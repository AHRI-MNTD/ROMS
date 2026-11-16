import prisma from "@roms/db";
import { GraphQLError } from "graphql";
import { CreateSampleSchema, hasPermission, UpdateSampleSchema } from "@roms/shared";
import type { DomainAction, Role } from "@roms/shared";

type GraphQLContext = {
  user?: Express.Request["user"];
};

export function requireGraphQLPermission(context: GraphQLContext, action: DomainAction): void {
  const user = context.user;
  if (!user) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  const roleAllowed = user.roles.some((role) => hasPermission(role as Role, action));
  const customPermissionAllowed =
    user.permissions.includes(action) || user.permissions.includes("admin:all");

  if (!roleAllowed && !customPermissionAllowed) {
    throw new GraphQLError("Insufficient permissions", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}

function parsePage(value: number | undefined, fallback: number, max: number): number {
  if (!Number.isInteger(value) || value === undefined) return fallback;
  return Math.min(Math.max(value, 1), max);
}

function parseGraphQLInput<T>(schema: { safeParse: (input: unknown) => { success: boolean; data?: T; error?: unknown } }, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new GraphQLError("Invalid input", {
      extensions: { code: "BAD_USER_INPUT", details: parsed.error },
    });
  }
  return parsed.data as T;
}

export const resolvers = {
  Query: {
    async samples(_: unknown, { page = 1, pageSize = 20 }: { page?: number; pageSize?: number }, context: GraphQLContext) {
      requireGraphQLPermission(context, "biospecimen:read");
      page = parsePage(page, 1, 100);
      pageSize = parsePage(pageSize, 20, 100);
      const [data, total] = await Promise.all([
        prisma.sample.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
        prisma.sample.count(),
      ]);
      return { data, total, page, pageSize };
    },

    async sample(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      requireGraphQLPermission(context, "biospecimen:read");
      return prisma.sample.findUnique({ where: { id } });
    },

    async sops(_: unknown, { page = 1, pageSize = 20 }: { page?: number; pageSize?: number }, context: GraphQLContext) {
      requireGraphQLPermission(context, "qms:read");
      page = parsePage(page, 1, 100);
      pageSize = parsePage(pageSize, 20, 100);
      const [data, total] = await Promise.all([
        prisma.sOP.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { code: "asc" } }),
        prisma.sOP.count(),
      ]);
      return { data, total, page };
    },

    async sop(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      requireGraphQLPermission(context, "qms:read");
      return prisma.sOP.findUnique({ where: { id } });
    },

    async grants(_: unknown, { page = 1, pageSize = 20 }: { page?: number; pageSize?: number }, context: GraphQLContext) {
      requireGraphQLPermission(context, "finance:read");
      page = parsePage(page, 1, 100);
      pageSize = parsePage(pageSize, 20, 100);
      const [data, total] = await Promise.all([
        prisma.grant.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
        prisma.grant.count(),
      ]);
      return { data, total, page };
    },

    async grant(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      requireGraphQLPermission(context, "finance:read");
      return prisma.grant.findUnique({ where: { id } });
    },

    async participants(
      _: unknown,
      { studyId, page = 1, pageSize = 20 }: { studyId?: string; page?: number; pageSize?: number },
      context: GraphQLContext
    ) {
      requireGraphQLPermission(context, "participant:read");
      page = parsePage(page, 1, 100);
      pageSize = parsePage(pageSize, 20, 100);
      const where = studyId ? { studyId } : {};
      const [data, total] = await Promise.all([
        prisma.participant.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
        prisma.participant.count({ where }),
      ]);
      return { data, total, page };
    },

    async participant(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      requireGraphQLPermission(context, "participant:read");
      return prisma.participant.findUnique({ where: { id } });
    },

    async studies(_: unknown, { page = 1, pageSize = 20 }: { page?: number; pageSize?: number }, context: GraphQLContext) {
      requireGraphQLPermission(context, "data-management:read");
      page = parsePage(page, 1, 100);
      pageSize = parsePage(pageSize, 20, 100);
      const [data, total] = await Promise.all([
        prisma.study.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { code: "asc" } }),
        prisma.study.count(),
      ]);
      return { data, total, page };
    },
  },

  Mutation: {
    async createSample(_: unknown, { input }: { input: Record<string, unknown> }, context: GraphQLContext) {
      requireGraphQLPermission(context, "biospecimen:write");
      const validatedInput = parseGraphQLInput(CreateSampleSchema, input);
      return prisma.sample.create({ data: validatedInput });
    },

    async updateSample(_: unknown, { id, input }: { id: string; input: Record<string, unknown> }, context: GraphQLContext) {
      requireGraphQLPermission(context, "biospecimen:write");
      const validatedInput = parseGraphQLInput(UpdateSampleSchema, input);
      return prisma.sample.update({ where: { id }, data: validatedInput });
    },
  },
};

import prisma from "@roms/db";

export const resolvers = {
  Query: {
    async samples(_: unknown, { page = 1, pageSize = 20 }: { page?: number; pageSize?: number }) {
      const [data, total] = await Promise.all([
        prisma.sample.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
        prisma.sample.count(),
      ]);
      return { data, total, page, pageSize };
    },

    async sample(_: unknown, { id }: { id: string }) {
      return prisma.sample.findUnique({ where: { id } });
    },

    async sops(_: unknown, { page = 1, pageSize = 20 }: { page?: number; pageSize?: number }) {
      const [data, total] = await Promise.all([
        prisma.sOP.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { code: "asc" } }),
        prisma.sOP.count(),
      ]);
      return { data, total, page };
    },

    async sop(_: unknown, { id }: { id: string }) {
      return prisma.sOP.findUnique({ where: { id } });
    },

    async grants(_: unknown, { page = 1, pageSize = 20 }: { page?: number; pageSize?: number }) {
      const [data, total] = await Promise.all([
        prisma.grant.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
        prisma.grant.count(),
      ]);
      return { data, total, page };
    },

    async grant(_: unknown, { id }: { id: string }) {
      return prisma.grant.findUnique({ where: { id } });
    },

    async participants(
      _: unknown,
      { studyId, page = 1, pageSize = 20 }: { studyId?: string; page?: number; pageSize?: number }
    ) {
      const where = studyId ? { studyId } : {};
      const [data, total] = await Promise.all([
        prisma.participant.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
        prisma.participant.count({ where }),
      ]);
      return { data, total, page };
    },

    async participant(_: unknown, { id }: { id: string }) {
      return prisma.participant.findUnique({ where: { id } });
    },

    async studies(_: unknown, { page = 1, pageSize = 20 }: { page?: number; pageSize?: number }) {
      const [data, total] = await Promise.all([
        prisma.study.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { code: "asc" } }),
        prisma.study.count(),
      ]);
      return { data, total, page };
    },
  },

  Mutation: {
    async createSample(_: unknown, { input }: { input: Record<string, unknown> }) {
      return prisma.sample.create({ data: input as Parameters<typeof prisma.sample.create>[0]["data"] });
    },

    async updateSample(_: unknown, { id, input }: { id: string; input: Record<string, unknown> }) {
      return prisma.sample.update({ where: { id }, data: input });
    },
  },
};

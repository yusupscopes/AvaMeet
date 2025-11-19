import { database } from "@/database";
import { agent } from "@/database/schema";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { agentInsertSchema } from "../schema";
import { z } from "zod";
import { and, count, desc, eq, getTableColumns, ilike, sql } from "drizzle-orm";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";

export const agentRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(MIN_PAGE_SIZE)
          .max(MAX_PAGE_SIZE)
          .default(DEFAULT_PAGE_SIZE),
        search: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;

      const items = await database
        .select({
          // TODO: Change to actual count
          meetingCount: sql<number>`3`,
          ...getTableColumns(agent),
        })
        .from(agent)
        .where(
          and(
            eq(agent.userId, ctx.auth.user.id),
            search ? ilike(agent.name, `%${search}%`) : undefined
          )
        )
        .orderBy(desc(agent.createdAt), desc(agent.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const [total] = await database
        .select({ count: count() })
        .from(agent)
        .where(
          and(
            eq(agent.userId, ctx.auth.user.id),
            search ? ilike(agent.name, `%${search}%`) : undefined
          )
        );

      const totalPages = Math.ceil(total.count / pageSize);

      return {
        items,
        totalItems: total.count,
        totalPages,
      };
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [selectedAgent] = await database
        .select({
          // TODO: Change to actual count
          meetingCount: sql<number>`5`,
          ...getTableColumns(agent),
        })
        .from(agent)
        .where(eq(agent.id, input.id));

      if (!selectedAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Agent with id ${input.id} not found`,
        });
      }

      return selectedAgent;
    }),

  create: protectedProcedure
    .input(agentInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [createdAgent] = await database
        .insert(agent)
        .values({
          ...input,
          userId: ctx.auth.user.id,
        })
        .returning();

      return createdAgent;
      // const { name, instruction } = input;
      // const { auth } = ctx;
    }),
});

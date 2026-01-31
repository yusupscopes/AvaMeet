import { database } from "@/database";
import { agent, meeting } from "@/database/schema";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, count, desc, eq, getTableColumns, ilike, sql } from "drizzle-orm";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";
import { meetingInsertSchema, meetingUpdateSchema } from "../schema";
import { MeetingStatus } from "../types";

export const meetingRouter = createTRPCRouter({
  create: protectedProcedure
    .input(meetingInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [createdMeeting] = await database
        .insert(meeting)
        .values({
          ...input,
          userId: ctx.auth.user.id,
        })
        .returning();

      //  TODO: Create Stream Call, Upsert Stream Users (Video Call SDK)

      return createdMeeting;
    }),

  update: protectedProcedure
    .input(meetingUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const [updatedMeeting] = await database
        .update(meeting)
        .set({ ...input })
        .where(
          and(eq(meeting.id, input.id), eq(meeting.userId, ctx.auth.user.id))
        )
        .returning();

      if (!updatedMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Meeting with id ${input.id} not found`,
        });
      }

      return updatedMeeting;
    }),

  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(DEFAULT_PAGE).default(DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(MIN_PAGE_SIZE)
          .max(MAX_PAGE_SIZE)
          .default(DEFAULT_PAGE_SIZE),
        search: z.string().nullish(),
        agentId: z.string().nullish(),
        status: z
          .enum([
            MeetingStatus.Upcoming,
            MeetingStatus.Active,
            MeetingStatus.Completed,
            MeetingStatus.Processing,
            MeetingStatus.Canceled,
          ])
          .nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, agentId, status } = input;

      const items = await database
        .select({
          ...getTableColumns(meeting),
          agent: agent,
          duration: sql<
            number | null
          >`EXTRACT(EPOCH FROM (ended_at - started_at))`.as("duration"),
        })
        .from(meeting)
        .innerJoin(agent, eq(meeting.agentId, agent.id))
        .where(
          and(
            eq(meeting.userId, ctx.auth.user.id),
            search ? ilike(meeting.name, `%${search}%`) : undefined,
            status ? eq(meeting.status, status) : undefined,
            agentId ? eq(meeting.agentId, agentId) : undefined
          )
        )
        .orderBy(desc(meeting.createdAt), desc(meeting.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const [total] = await database
        .select({ count: count() })
        .from(meeting)
        .innerJoin(agent, eq(meeting.agentId, agent.id))
        .where(
          and(
            eq(meeting.userId, ctx.auth.user.id),
            search ? ilike(meeting.name, `%${search}%`) : undefined,
            status ? eq(meeting.status, status) : undefined,
            agentId ? eq(meeting.agentId, agentId) : undefined
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
    .query(async ({ input, ctx }) => {
      const [existingMeeting] = await database
        .select({
          ...getTableColumns(meeting),
        })
        .from(meeting)
        .where(
          and(eq(meeting.id, input.id), eq(meeting.userId, ctx.auth.user.id))
        );

      if (!existingMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Meeting with id ${input.id} not found`,
        });
      }

      return existingMeeting;
    }),
});

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
import { streamVideo } from "@/lib/stream-video";
import { generateAvatarUri } from "@/lib/avatar";

export const meetingRouter = createTRPCRouter({
  generateToken: protectedProcedure.mutation(async ({ ctx }) => {
    await streamVideo.upsertUsers([
      {
        id: ctx.auth.user.id,
        name: ctx.auth.user.name,
        role: "admin",
        image: ctx.auth.user.image ?? generateAvatarUri({
          seed: ctx.auth.user.name,
          variant: "initials",
        }),
      }
    ]);

    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const issuedAt = Math.floor(Date.now() / 1000) - 60; // 1 minute ago

    return streamVideo.generateUserToken({
      user_id: ctx.auth.user.id,
      exp: expirationTime,
      validity_in_seconds: issuedAt,
    });
  }),
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
      const call = streamVideo.video.call("default", createdMeeting.id);
      await call.create(
        {
          data: {
            created_by_id: ctx.auth.user.id,
            custom: {
              meetingId: createdMeeting.id,
              meetingName: createdMeeting.name,
            },
            settings_override: {
              transcription: {
                language: "en",
                mode: "auto-on",
                closed_caption_mode: "auto-on",
              },
              recording: {
                mode: "auto-on",
                quality: "1080p",
              }
            }
          }
        }
      );

      const [existingAgent] = await database.select().from(agent).where(eq(agent.id, createdMeeting.agentId));
      if (!existingAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Agent with id ${createdMeeting.agentId} not found`,
        });
      }

      await streamVideo.upsertUsers([
        {
          id: existingAgent.id,
          name: existingAgent.name,
          role: "user",
          image: generateAvatarUri({
            seed: existingAgent.name,
            variant: "botttsNeutral",
          }),
        }
      ]);

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

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [removedMeeting] = await database
        .delete(meeting)
        .where(
          and(eq(meeting.id, input.id), eq(meeting.userId, ctx.auth.user.id))
        )
        .returning();

      if (!removedMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Meeting with id ${input.id} not found`,
        });
      }

      return removedMeeting;
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
          agent: agent,
          duration: sql<
            number | null
          >`EXTRACT(EPOCH FROM (ended_at - started_at))`.as("duration"),
        })
        .from(meeting)
        .innerJoin(agent, eq(meeting.agentId, agent.id))
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

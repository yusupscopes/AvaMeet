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
import { eq } from "drizzle-orm";

export const agentRouter = createTRPCRouter({
  getMany: protectedProcedure.query(async () => {
    // await new Promise((resolve) => setTimeout(resolve, 5000));
    // throw new TRPCError({
    //   code: "BAD_REQUEST",
    // });

    return await database.select().from(agent);
  }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [selectedAgent] = await database
        .select()
        .from(agent)
        .where(eq(agent.id, input.id));

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

import { database } from "@/database";
import { agent } from "@/database/schema";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

export const agentRouter = createTRPCRouter({
  getMany: baseProcedure.query(async () => {
    // await new Promise((resolve) => setTimeout(resolve, 5000));
    // throw new TRPCError({
    //   code: "BAD_REQUEST",
    // });

    return await database.select().from(agent);
  }),
});

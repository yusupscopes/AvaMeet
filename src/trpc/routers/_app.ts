import { agentRouter } from "@/modules/agent/server/procedures";
import { createTRPCRouter } from "../init";
import { meetingRouter } from "@/modules/meeting/server/procedures";

export const appRouter = createTRPCRouter({
  agent: agentRouter,
  meeting: meetingRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

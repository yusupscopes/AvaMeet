import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { database } from "@/database";
import * as schema from "@/database/schema";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  database: drizzleAdapter(database, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),
});

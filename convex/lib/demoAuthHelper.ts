import type { MutationCtx, QueryCtx } from "../_generated/server";

type DemoContext = QueryCtx | MutationCtx;

export async function getDemoUser(ctx: DemoContext, sessionToken: string) {
  const session = await ctx.db
    .query("demoSessions")
    .withIndex("by_token", (q) => q.eq("token", sessionToken))
    .unique();
  if (!session || session.expiresAt <= Date.now()) return null;
  return ctx.db.get(session.userId);
}

export async function requireDemoUser(ctx: DemoContext, sessionToken: string) {
  const user = await getDemoUser(ctx, sessionToken);
  if (!user) throw new Error("Your demo session expired. Sign in again.");
  return user;
}

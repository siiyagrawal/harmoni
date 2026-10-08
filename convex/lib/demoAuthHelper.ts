import type { MutationCtx, QueryCtx } from "../_generated/server";
import { hashSessionToken } from "./session";

type DemoContext = QueryCtx | MutationCtx;

export async function getDemoUser(ctx: DemoContext, sessionToken: string) {
  const tokenHash = await hashSessionToken(sessionToken);
  return getDemoUserByHash(ctx, tokenHash);
}

export async function getDemoUserByHash(ctx: DemoContext, tokenHash: string) {
  const session = await ctx.db
    .query("demoSessions")
    .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!session || session.expiresAt <= Date.now()) return null;
  return ctx.db.get(session.userId);
}

export async function requireDemoUser(ctx: DemoContext, sessionToken: string) {
  const user = await getDemoUser(ctx, sessionToken);
  if (!user) throw new Error("Your demo session expired. Sign in again.");
  return user;
}

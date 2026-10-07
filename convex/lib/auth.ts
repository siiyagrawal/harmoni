import type { MutationCtx, QueryCtx } from "../_generated/server";

type AuthenticatedContext = QueryCtx | MutationCtx;

export async function getCurrentUser(ctx: AuthenticatedContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return ctx.db
    .query("users")
    .withIndex("by_auth_subject", (q) =>
      q.eq("authSubject", identity.tokenIdentifier),
    )
    .unique();
}

export async function requireCurrentUser(ctx: AuthenticatedContext) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Sign in and finish account setup to continue.");
  }
  return user;
}

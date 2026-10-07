import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

export const current = query({
  args: {},
  handler: async (ctx) => getCurrentUser(ctx),
});

/** Create or refresh the app profile after the auth provider signs a user in. */
export const ensureCurrent = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in before creating your profile.");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_auth_subject", (q) =>
        q.eq("authSubject", identity.tokenIdentifier),
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...(identity.email ? { email: identity.email } : {}),
        ...(identity.name ? { fullName: identity.name } : {}),
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("users", {
      authSubject: identity.tokenIdentifier,
      ...(identity.email ? { email: identity.email } : {}),
      ...(identity.name ? { fullName: identity.name } : {}),
      createdAt: now,
      updatedAt: now,
    });
  },
});

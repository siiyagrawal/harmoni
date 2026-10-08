import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getDemoUser, getDemoUserByHash, requireDemoUser } from "./lib/demoAuthHelper";
import { hashSessionToken } from "./lib/session";
import { deleteDemoUserData } from "./lib/accountDeletion";

const DEMO_SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export const current = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => getDemoUser(ctx, sessionToken),
});

export const ensureCurrent = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    return user._id;
  },
});

export const findDemoAccount = internalQuery({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const account = await ctx.db
      .query("demoAccounts")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!account) return null;
    return {
      userId: account.userId,
      passwordSalt: account.passwordSalt,
      passwordHash: account.passwordHash,
    };
  },
});

export const createDemoAccount = internalMutation({
  args: {
    username: v.string(),
    passwordSalt: v.string(),
    passwordHash: v.string(),
    sessionTokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("demoAccounts")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    if (existing) throw new Error("That username is already in use.");

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      demoUsername: args.username,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("demoAccounts", {
      userId,
      username: args.username,
      passwordSalt: args.passwordSalt,
      passwordHash: args.passwordHash,
      createdAt: now,
    });
    await ctx.db.insert("demoSessions", {
      tokenHash: args.sessionTokenHash,
      userId,
      expiresAt: now + DEMO_SESSION_LIFETIME_MS,
      createdAt: now,
    });
    const circleId = await ctx.db.insert("circles", {
      ownerId: userId,
      name: "My Circle",
      createdAt: now,
    });
    await ctx.db.insert("circleMembers", { circleId, userId, joinedAt: now });
    await ctx.db.insert("userProgress", { userId, xp: 0, awardedBadges: [] });
    return { userId, hasCard: false };
  },
});

export const createDemoSession = internalMutation({
  args: { userId: v.id("users"), sessionTokenHash: v.string() },
  handler: async (ctx, { userId, sessionTokenHash }) => {
    const user = await ctx.db.get(userId);
    if (!user?.demoUsername) throw new Error("Demo account not found.");

    const now = Date.now();
    await ctx.db.insert("demoSessions", {
      tokenHash: sessionTokenHash,
      userId,
      expiresAt: now + DEMO_SESSION_LIFETIME_MS,
      createdAt: now,
    });
    const primaryCard = await ctx.db
      .query("cards")
      .withIndex("by_owner_primary", (q) =>
        q.eq("ownerId", userId).eq("isPrimary", true),
      )
      .first();
    return { hasCard: primaryCard?.status === "published" };
  },
});

export const logoutDemo = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const tokenHash = await hashSessionToken(sessionToken);
    const session = await ctx.db
      .query("demoSessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

export const getDemoSession = internalQuery({
  args: { sessionTokenHash: v.string() },
  handler: async (ctx, { sessionTokenHash }) => {
    const session = await ctx.db
      .query("demoSessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", sessionTokenHash))
      .unique();
    if (!session || session.expiresAt <= Date.now()) return null;
    const user = await ctx.db.get(session.userId);
    if (!user) return null;
    const account = await ctx.db
      .query("demoAccounts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const card = await ctx.db
      .query("cards")
      .withIndex("by_owner_primary", (q) => q.eq("ownerId", user._id).eq("isPrimary", true))
      .first();
    return {
      userId: user._id,
      username: account?.username ?? user.demoUsername ?? "",
      fullName: user.fullName ?? "",
      hasCard: card?.status === "published",
    };
  },
});

export const checkDemoLoginAllowed = internalQuery({
  args: { username: v.string(), now: v.number() },
  handler: async (ctx, { username, now }) => {
    const attempt = await ctx.db
      .query("demoLoginAttempts")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    return !attempt?.lockedUntil || attempt.lockedUntil <= now;
  },
});

export const recordDemoLoginAttempt = internalMutation({
  args: { username: v.string(), succeeded: v.boolean(), now: v.number() },
  handler: async (ctx, { username, succeeded, now }) => {
    const attempt = await ctx.db
      .query("demoLoginAttempts")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (succeeded) {
      if (attempt) await ctx.db.delete(attempt._id);
      return;
    }
    const windowMs = 15 * 60 * 1000;
    const expired = !attempt || now - attempt.windowStartedAt >= windowMs;
    const count = expired ? 1 : attempt.count + 1;
    const windowStartedAt = expired ? now : attempt.windowStartedAt;
    const lockedUntil = count >= 8 ? now + windowMs : undefined;
    if (!attempt) {
      await ctx.db.insert("demoLoginAttempts", {
        username,
        count,
        windowStartedAt,
        ...(lockedUntil ? { lockedUntil } : {}),
      });
      return;
    }
    await ctx.db.patch(attempt._id, {
      count,
      windowStartedAt,
      lockedUntil,
    });
  },
});

export const createPasswordReset = internalMutation({
  args: { username: v.string(), codeHash: v.string(), now: v.number() },
  handler: async (ctx, { username, codeHash, now }) => {
    const account = await ctx.db
      .query("demoAccounts")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!account) return false;
    const previous = await ctx.db
      .query("demoPasswordResets")
      .withIndex("by_user", (q) => q.eq("userId", account.userId))
      .collect();
    await Promise.all(previous.map((reset) => ctx.db.delete(reset._id)));
    await ctx.db.insert("demoPasswordResets", {
      userId: account.userId,
      codeHash,
      expiresAt: now + 15 * 60 * 1000,
      createdAt: now,
    });
    return true;
  },
});

export const findPasswordReset = internalQuery({
  args: { codeHash: v.string(), now: v.number() },
  handler: async (ctx, { codeHash, now }) => {
    const reset = await ctx.db
      .query("demoPasswordResets")
      .withIndex("by_code_hash", (q) => q.eq("codeHash", codeHash))
      .unique();
    return reset && reset.expiresAt > now ? { userId: reset.userId } : null;
  },
});

export const consumePasswordReset = internalMutation({
  args: {
    codeHash: v.string(),
    passwordSalt: v.string(),
    passwordHash: v.string(),
    now: v.number(),
  },
  handler: async (ctx, { codeHash, passwordSalt, passwordHash, now }) => {
    const reset = await ctx.db
      .query("demoPasswordResets")
      .withIndex("by_code_hash", (q) => q.eq("codeHash", codeHash))
      .unique();
    if (!reset || reset.expiresAt <= now) throw new Error("That reset code has expired or was already used.");
    const account = await ctx.db
      .query("demoAccounts")
      .withIndex("by_user", (q) => q.eq("userId", reset.userId))
      .unique();
    if (!account) throw new Error("Account not found.");
    const [resets, sessions] = await Promise.all([
      ctx.db.query("demoPasswordResets").withIndex("by_user", (q) => q.eq("userId", reset.userId)).collect(),
      ctx.db.query("demoSessions").withIndex("by_user", (q) => q.eq("userId", reset.userId)).collect(),
    ]);
    await ctx.db.patch(account._id, { passwordSalt, passwordHash });
    await Promise.all([
      ...resets.map((item) => ctx.db.delete(item._id)),
      ...sessions.map((item) => ctx.db.delete(item._id)),
    ]);
  },
});

export const changeDemoPassword = internalMutation({
  args: {
    userId: v.id("users"),
    passwordSalt: v.string(),
    passwordHash: v.string(),
    sessionTokenHash: v.string(),
    now: v.number(),
  },
  handler: async (ctx, { userId, passwordSalt, passwordHash, sessionTokenHash, now }) => {
    const account = await ctx.db
      .query("demoAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!account) throw new Error("Demo account not found.");
    const sessions = await ctx.db
      .query("demoSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    await ctx.db.patch(account._id, { passwordSalt, passwordHash });
    await Promise.all(sessions.map((session) => ctx.db.delete(session._id)));
    await ctx.db.insert("demoSessions", {
      userId,
      tokenHash: sessionTokenHash,
      expiresAt: now + DEMO_SESSION_LIFETIME_MS,
      createdAt: now,
    });
  },
});

export const deleteDemoAccount = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    await deleteDemoUserData(ctx, user, true);
  },
});

export const logoutDemoHashed = internalMutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const session = await ctx.db
      .query("demoSessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

export const deleteDemoAccountByHash = internalMutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const user = await getDemoUserByHash(ctx, tokenHash);
    if (!user) throw new Error("Your demo session expired. Sign in again.");
    await deleteDemoUserData(ctx, user, true);
  },
});

export const startOverDemoByHash = internalMutation({
  args: { tokenHash: v.string(), nextTokenHash: v.string(), now: v.number() },
  handler: async (ctx, { tokenHash, nextTokenHash, now }) => {
    const user = await getDemoUserByHash(ctx, tokenHash);
    if (!user) throw new Error("Your demo session expired. Sign in again.");
    await deleteDemoUserData(ctx, user, false);
    await ctx.db.patch(user._id, { fullName: undefined, updatedAt: now });
    await ctx.db.insert("demoSessions", {
      userId: user._id,
      tokenHash: nextTokenHash,
      expiresAt: now + DEMO_SESSION_LIFETIME_MS,
      createdAt: now,
    });
    const circleId = await ctx.db.insert("circles", {
      ownerId: user._id,
      name: "My Circle",
      createdAt: now,
    });
    await ctx.db.insert("circleMembers", { circleId, userId: user._id, joinedAt: now });
    await ctx.db.insert("userProgress", { userId: user._id, xp: 0, awardedBadges: [] });
  },
});

"use node";

import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const deriveKey = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });

function normalizeUsername(value: string) {
  const username = value.trim().toLowerCase();
  const validUsername = /^[a-z0-9._-]{3,24}$/.test(username);
  const validEmail = username.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
  if (!validUsername && !validEmail) throw new Error("Use a valid username or email address.");
  return username;
}

function validatePassword(password: string) {
  if (password.length < 8 || password.length > 256) {
    throw new Error("Use a password between 8 and 256 characters.");
  }
}

function newSessionToken() {
  return randomBytes(32).toString("hex");
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

type SessionResult = {
  userId: Id<"users">;
  sessionToken: string;
  hasCard: boolean;
};

export const signUp = action({
  args: { username: v.string(), password: v.string() },
  returns: v.object({ userId: v.id("users"), sessionToken: v.string(), hasCard: v.boolean() }),
  handler: async (ctx, args): Promise<SessionResult> => {
    const username = normalizeUsername(args.username);
    validatePassword(args.password);
    const passwordSalt = randomBytes(16).toString("hex");
    const passwordHash = (await deriveKey(args.password, passwordSalt)).toString("hex");
    const token = newSessionToken();
    const created = await ctx.runMutation(internal.users.createDemoAccount, {
      username,
      passwordSalt,
      passwordHash,
      sessionTokenHash: sha256(token),
    });
    return { ...created, sessionToken: token };
  },
});

export const logIn = action({
  args: { username: v.string(), password: v.string() },
  returns: v.object({ userId: v.id("users"), sessionToken: v.string(), hasCard: v.boolean() }),
  handler: async (ctx, args): Promise<SessionResult> => {
    const username = normalizeUsername(args.username);
    validatePassword(args.password);
    const now = Date.now();
    const allowed = await ctx.runQuery(internal.users.checkDemoLoginAllowed, { username, now });
    if (!allowed) throw new Error("Too many attempts. Try again in 15 minutes.");

    const account = await ctx.runQuery(internal.users.findDemoAccount, { username });
    if (!account) {
      await ctx.runMutation(internal.users.recordDemoLoginAttempt, { username, succeeded: false, now });
      throw new Error("Incorrect username or password.");
    }
    const candidate = await deriveKey(args.password, account.passwordSalt);
    const stored = Buffer.from(account.passwordHash, "hex");
    if (stored.length !== candidate.length || !timingSafeEqual(stored, candidate)) {
      await ctx.runMutation(internal.users.recordDemoLoginAttempt, { username, succeeded: false, now });
      throw new Error("Incorrect username or password.");
    }

    await ctx.runMutation(internal.users.recordDemoLoginAttempt, { username, succeeded: true, now });
    const token = newSessionToken();
    const session = await ctx.runMutation(internal.users.createDemoSession, {
      userId: account.userId,
      sessionTokenHash: sha256(token),
    });
    return { userId: account.userId, sessionToken: token, hasCard: session.hasCard };
  },
});

export const me = action({
  args: { sessionToken: v.string() },
  returns: v.union(
    v.object({ userId: v.id("users"), username: v.string(), fullName: v.string(), hasCard: v.boolean() }),
    v.null(),
  ),
  handler: async (ctx, { sessionToken }): Promise<{
    userId: Id<"users">;
    username: string;
    fullName: string;
    hasCard: boolean;
  } | null> => {
    return ctx.runQuery(internal.users.getDemoSession, { sessionTokenHash: sha256(sessionToken) });
  },
});

export const logOut = action({
  args: { sessionToken: v.string() },
  returns: v.null(),
  handler: async (ctx, { sessionToken }) => {
    await ctx.runMutation(internal.users.logoutDemoHashed, { tokenHash: sha256(sessionToken) });
    return null;
  },
});

export const requestReset = action({
  args: { username: v.string() },
  returns: v.object({ resetCode: v.union(v.string(), v.null()) }),
  handler: async (ctx, { username: rawUsername }): Promise<{ resetCode: string | null }> => {
    const username = normalizeUsername(rawUsername);
    const resetCode = randomBytes(4).toString("hex").toUpperCase();
    const found: boolean = await ctx.runMutation(internal.users.createPasswordReset, {
      username,
      codeHash: sha256(resetCode),
      now: Date.now(),
    });
    // DEMO: deliver by email in production
    return { resetCode: found ? resetCode : null };
  },
});

export const resetPassword = action({
  args: { code: v.string(), newPassword: v.string() },
  returns: v.null(),
  handler: async (ctx, { code, newPassword }) => {
    validatePassword(newPassword);
    const codeHash = sha256(code.trim().toUpperCase());
    const reset = await ctx.runQuery(internal.users.findPasswordReset, { codeHash, now: Date.now() });
    if (!reset) throw new Error("That reset code has expired or was already used.");
    const passwordSalt = randomBytes(16).toString("hex");
    const passwordHash = (await deriveKey(newPassword, passwordSalt)).toString("hex");
    await ctx.runMutation(internal.users.consumePasswordReset, {
      codeHash,
      passwordSalt,
      passwordHash,
      now: Date.now(),
    });
    return null;
  },
});

export const changePassword = action({
  args: { sessionToken: v.string(), currentPassword: v.string(), newPassword: v.string() },
  returns: v.object({ sessionToken: v.string() }),
  handler: async (ctx, args) => {
    validatePassword(args.newPassword);
    const session = await ctx.runQuery(internal.users.getDemoSession, {
      sessionTokenHash: sha256(args.sessionToken),
    });
    if (!session) throw new Error("Your demo session expired. Sign in again.");
    const account = await ctx.runQuery(internal.users.findDemoAccount, { username: session.username });
    if (!account) throw new Error("Demo account not found.");
    const candidate = await deriveKey(args.currentPassword, account.passwordSalt);
    const stored = Buffer.from(account.passwordHash, "hex");
    if (stored.length !== candidate.length || !timingSafeEqual(stored, candidate)) {
      throw new Error("Your current password is incorrect.");
    }
    const passwordSalt = randomBytes(16).toString("hex");
    const passwordHash = (await deriveKey(args.newPassword, passwordSalt)).toString("hex");
    const token = newSessionToken();
    await ctx.runMutation(internal.users.changeDemoPassword, {
      userId: session.userId,
      passwordSalt,
      passwordHash,
      sessionTokenHash: sha256(token),
      now: Date.now(),
    });
    return { sessionToken: token };
  },
});

export const deleteAccount = action({
  args: { sessionToken: v.string() },
  returns: v.null(),
  handler: async (ctx, { sessionToken }) => {
    await ctx.runMutation(internal.users.deleteDemoAccountByHash, { tokenHash: sha256(sessionToken) });
    return null;
  },
});

export const startOver = action({
  args: { sessionToken: v.string() },
  returns: v.object({ sessionToken: v.string() }),
  handler: async (ctx, { sessionToken }) => {
    const nextToken = newSessionToken();
    await ctx.runMutation(internal.users.startOverDemoByHash, {
      tokenHash: sha256(sessionToken),
      nextTokenHash: sha256(nextToken),
      now: Date.now(),
    });
    return { sessionToken: nextToken };
  },
});

"use node";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
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
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
    throw new Error("Use 3–24 letters, numbers, dots, underscores, or hyphens.");
  }
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

type DemoAuthResult = {
  userId: Id<"users">;
  sessionToken: string;
  hasCard: boolean;
};

/** Demo-only username/password flow. Replace this with the selected auth provider before launch. */
export const register = action({
  args: { username: v.string(), password: v.string() },
  returns: v.object({
    userId: v.id("users"),
    sessionToken: v.string(),
    hasCard: v.boolean(),
  }),
  handler: async (ctx, args): Promise<DemoAuthResult> => {
    const username = normalizeUsername(args.username);
    validatePassword(args.password);

    const passwordSalt = randomBytes(16).toString("hex");
    const passwordHash = (await deriveKey(args.password, passwordSalt)).toString("hex");
    const sessionToken = newSessionToken();
    const account = await ctx.runMutation(internal.users.createDemoAccount, {
      username,
      passwordSalt,
      passwordHash,
      sessionToken,
    });

    return { ...account, sessionToken };
  },
});

export const signIn = action({
  args: { username: v.string(), password: v.string() },
  returns: v.object({
    userId: v.id("users"),
    sessionToken: v.string(),
    hasCard: v.boolean(),
  }),
  handler: async (ctx, args): Promise<DemoAuthResult> => {
    const username = normalizeUsername(args.username);
    validatePassword(args.password);

    const account = await ctx.runQuery(internal.users.findDemoAccount, { username });
    if (!account) throw new Error("Incorrect username or password.");

    const candidate = await deriveKey(args.password, account.passwordSalt);
    const stored = Buffer.from(account.passwordHash, "hex");
    if (stored.length !== candidate.length || !timingSafeEqual(stored, candidate)) {
      throw new Error("Incorrect username or password.");
    }

    const sessionToken = newSessionToken();
    const session = await ctx.runMutation(internal.users.createDemoSession, {
      userId: account.userId,
      sessionToken,
    });
    return { userId: account.userId, sessionToken, hasCard: session.hasCard };
  },
});

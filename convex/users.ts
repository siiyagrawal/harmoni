import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import { requireDemoUser } from "./lib/demoAuthHelper";
import type { Id } from "./_generated/dataModel";

const DEMO_SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

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
    sessionToken: v.string(),
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
      token: args.sessionToken,
      userId,
      expiresAt: now + DEMO_SESSION_LIFETIME_MS,
      createdAt: now,
    });
    return { userId, hasCard: false };
  },
});

export const createDemoSession = internalMutation({
  args: { userId: v.id("users"), sessionToken: v.string() },
  handler: async (ctx, { userId, sessionToken }) => {
    const user = await ctx.db.get(userId);
    if (!user?.demoUsername) throw new Error("Demo account not found.");

    const now = Date.now();
    await ctx.db.insert("demoSessions", {
      token: sessionToken,
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
    const session = await ctx.db
      .query("demoSessions")
      .withIndex("by_token", (q) => q.eq("token", sessionToken))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

export const deleteDemoAccount = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const [cards, ownedContacts, linkedUserContacts, sessions, accounts] = await Promise.all([
      ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect(),
      ctx.db.query("contacts").withIndex("by_owner_created_at", (q) => q.eq("ownerId", user._id)).collect(),
      ctx.db.query("contacts").withIndex("by_linked_user", (q) => q.eq("linkedUserId", user._id)).collect(),
      ctx.db.query("demoSessions").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("demoAccounts").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
    ]);

    const linkedCardContacts = await Promise.all(
      cards.map((card) =>
        ctx.db.query("contacts").withIndex("by_linked_card", (q) => q.eq("linkedCardId", card._id)).collect(),
      ),
    );
    const externalContacts = new Map<string, (typeof linkedUserContacts)[number]>();
    for (const contact of [...linkedUserContacts, ...linkedCardContacts.flat()]) {
      if (contact.ownerId !== user._id) externalContacts.set(contact._id, contact);
    }
    const now = Date.now();

    await Promise.all([
      ...[...externalContacts.values()].map((contact) =>
        ctx.db.patch(contact._id, { linkedUserId: undefined, linkedCardId: undefined, updatedAt: now }),
      ),
      ...ownedContacts.map((contact) => ctx.db.delete(contact._id)),
      ...cards.map((card) => ctx.db.delete(card._id)),
      ...sessions.map((session) => ctx.db.delete(session._id)),
      ...accounts.map((account) => ctx.db.delete(account._id)),
    ]);

    const storageIds = new Set<Id<"_storage">>([
      user.avatarStorageId,
      ...cards.flatMap((card) => [card.photoStorageId, card.coverStorageId, card.logoStorageId]),
    ].filter((storageId): storageId is Id<"_storage"> => storageId !== undefined));
    await Promise.all([...storageIds].map((storageId) => ctx.storage.delete(storageId)));
    await ctx.db.delete(user._id);
  },
});

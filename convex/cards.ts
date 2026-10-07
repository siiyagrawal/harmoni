import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { normalizeSlug } from "./lib/slugs";

const linkValidator = v.object({
  label: v.string(),
  url: v.string(),
  kind: v.string(),
  visible: v.boolean(),
  order: v.number(),
});

const fieldValidator = v.object({
  label: v.string(),
  value: v.string(),
  kind: v.string(),
  visible: v.boolean(),
  order: v.number(),
});

const themeValidator = v.object({
  style: v.string(),
  accentColor: v.string(),
  backgroundColor: v.string(),
  textColor: v.string(),
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    return ctx.db
      .query("cards")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
  },
});

export const getPrimaryMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    return ctx.db
      .query("cards")
      .withIndex("by_owner_primary", (q) =>
        q.eq("ownerId", user._id).eq("isPrimary", true),
      )
      .first();
  },
});

export const getPublicBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const normalizedSlug = normalizeSlug(slug);
    const card = await ctx.db
      .query("cards")
      .withIndex("by_slug", (q) => q.eq("slug", normalizedSlug))
      .unique();

    if (!card || card.status !== "published") return null;

    const [photoUrl, coverUrl] = await Promise.all([
      card.photoStorageId ? ctx.storage.getUrl(card.photoStorageId) : null,
      card.coverStorageId ? ctx.storage.getUrl(card.coverStorageId) : null,
    ]);

    const { ownerId, photoStorageId, coverStorageId, ...publicCard } = card;
    void ownerId;
    void photoStorageId;
    void coverStorageId;

    return {
      ...publicCard,
      photoUrl,
      coverUrl,
      links: card.links.filter((link) => link.visible),
      fields: card.fields.filter((field) => field.visible),
    };
  },
});

export const create = mutation({
  args: {
    slug: v.string(),
    fullName: v.string(),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    headline: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const slug = normalizeSlug(args.slug);
    if (!slug) throw new Error("Enter a valid public card link.");

    const existingSlug = await ctx.db
      .query("cards")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existingSlug) throw new Error("That card link is already in use.");

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const now = Date.now();

    return ctx.db.insert("cards", {
      ownerId: user._id,
      slug,
      fullName: args.fullName.trim(),
      ...(args.jobTitle ? { jobTitle: args.jobTitle.trim() } : {}),
      ...(args.company ? { company: args.company.trim() } : {}),
      ...(args.headline ? { headline: args.headline.trim() } : {}),
      links: [],
      fields: [],
      theme: {
        style: "classic",
        accentColor: "#1d5647",
        backgroundColor: "#f8f7f2",
        textColor: "#18352e",
      },
      status: "draft",
      isPrimary: cards.length === 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    cardId: v.id("cards"),
    slug: v.optional(v.string()),
    fullName: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    headline: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    coverStorageId: v.optional(v.id("_storage")),
    links: v.optional(v.array(linkValidator)),
    fields: v.optional(v.array(fieldValidator)),
    theme: v.optional(themeValidator),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    ),
  },
  handler: async (ctx, { cardId, ...updates }) => {
    const user = await requireCurrentUser(ctx);
    const card = await ctx.db.get(cardId);
    if (!card || card.ownerId !== user._id) throw new Error("Card not found.");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (updates.slug !== undefined) {
      const slug = normalizeSlug(updates.slug);
      if (!slug) throw new Error("Enter a valid public card link.");
      const existing = await ctx.db
        .query("cards")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (existing && existing._id !== cardId) {
        throw new Error("That card link is already in use.");
      }
      patch.slug = slug;
    }

    for (const key of [
      "fullName",
      "jobTitle",
      "company",
      "headline",
      "email",
      "phone",
      "website",
      "photoStorageId",
      "coverStorageId",
      "links",
      "fields",
      "theme",
      "status",
    ] as const) {
      const value = updates[key];
      if (value !== undefined) patch[key] = value;
    }

    await ctx.db.patch(cardId, patch);
    return cardId;
  },
});

export const setPrimary = mutation({
  args: { cardId: v.id("cards") },
  handler: async (ctx, { cardId }) => {
    const user = await requireCurrentUser(ctx);
    const target = await ctx.db.get(cardId);
    if (!target || target.ownerId !== user._id) throw new Error("Card not found.");

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    for (const card of cards) {
      if (card.isPrimary !== (card._id === cardId)) {
        await ctx.db.patch(card._id, {
          isPrimary: card._id === cardId,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

export const generateImageUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

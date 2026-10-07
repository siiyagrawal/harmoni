import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireCurrentUser } from "./lib/auth";
import { requireDemoUser } from "./lib/demoAuthHelper";
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
  abbreviation: v.optional(v.string()),
  color: v.optional(v.string()),
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

export const getPrimaryDemo = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const card = await ctx.db
      .query("cards")
      .withIndex("by_owner_primary", (q) =>
        q.eq("ownerId", user._id).eq("isPrimary", true),
      )
      .first();
    if (!card) return null;

    const [photoUrl, coverUrl, logoUrl] = await Promise.all([
      card.photoStorageId ? ctx.storage.getUrl(card.photoStorageId) : null,
      card.coverStorageId ? ctx.storage.getUrl(card.coverStorageId) : null,
      card.logoStorageId ? ctx.storage.getUrl(card.logoStorageId) : null,
    ]);

    return { ...card, photoUrl, coverUrl, logoUrl };
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

    const [photoUrl, coverUrl, logoUrl] = await Promise.all([
      card.photoStorageId ? ctx.storage.getUrl(card.photoStorageId) : null,
      card.coverStorageId ? ctx.storage.getUrl(card.coverStorageId) : null,
      card.logoStorageId ? ctx.storage.getUrl(card.logoStorageId) : null,
    ]);

    const { ownerId, photoStorageId, coverStorageId, logoStorageId, ...publicCard } = card;
    void ownerId;
    void photoStorageId;
    void coverStorageId;
    void logoStorageId;

    return {
      ...publicCard,
      photoUrl,
      coverUrl,
      logoUrl,
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

export const saveDemoProfile = mutation({
  args: {
    sessionToken: v.string(),
    fullName: v.string(),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    headline: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    photoStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    coverStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    logoStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    logoMode: v.optional(v.union(v.literal("auto"), v.literal("image"), v.null())),
    squarePhoto: v.optional(v.boolean()),
    circle: v.optional(v.string()),
    wants: v.optional(v.array(v.string())),
    haves: v.optional(v.array(v.string())),
    qrOnBack: v.optional(v.boolean()),
    includeMeetingPlace: v.optional(v.boolean()),
    links: v.optional(v.array(linkValidator)),
    fields: v.optional(v.array(fieldValidator)),
    theme: v.optional(themeValidator),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireDemoUser(ctx, args.sessionToken);
    const fullName = args.fullName.trim();
    if (!fullName) throw new Error("Enter your name before saving your card.");

    const existing = await ctx.db
      .query("cards")
      .withIndex("by_owner_primary", (q) =>
        q.eq("ownerId", user._id).eq("isPrimary", true),
      )
      .first();
    const now = Date.now();
    const photoStorageId = args.photoStorageId === undefined
      ? existing?.photoStorageId
      : args.photoStorageId ?? undefined;
    const coverStorageId = args.coverStorageId === undefined
      ? existing?.coverStorageId
      : args.coverStorageId ?? undefined;
    const logoStorageId = args.logoStorageId === undefined
      ? existing?.logoStorageId
      : args.logoStorageId ?? undefined;
    const logoMode = args.logoMode === undefined
      ? existing?.logoMode
      : args.logoMode ?? undefined;
    const profile = {
      fullName,
      jobTitle: args.jobTitle === undefined ? existing?.jobTitle : args.jobTitle.trim() || undefined,
      company: args.company === undefined ? existing?.company : args.company.trim() || undefined,
      headline: args.headline === undefined ? existing?.headline : args.headline.trim() || undefined,
      email: args.email === undefined ? existing?.email : args.email.trim() || undefined,
      phone: args.phone === undefined ? existing?.phone : args.phone.trim() || undefined,
      website: args.website === undefined ? existing?.website : args.website.trim() || undefined,
      photoStorageId,
      coverStorageId,
      logoStorageId,
      logoMode,
      squarePhoto: args.squarePhoto ?? existing?.squarePhoto ?? false,
      circle: args.circle === undefined ? existing?.circle : args.circle.trim() || undefined,
      wants: args.wants ?? existing?.wants ?? [],
      haves: args.haves ?? existing?.haves ?? [],
      qrOnBack: args.qrOnBack ?? existing?.qrOnBack ?? true,
      includeMeetingPlace: args.includeMeetingPlace ?? existing?.includeMeetingPlace ?? true,
      profileVersion: 1,
      links: args.links ?? existing?.links ?? [],
      fields: args.fields ?? existing?.fields ?? [],
      theme: args.theme ?? existing?.theme ?? {
        style: "0",
        accentColor: "#1d5647",
        backgroundColor: "#f8f7f2",
        textColor: "#18352e",
      },
      status: args.status ?? existing?.status ?? "draft",
      updatedAt: now,
    };

    await ctx.db.patch(user._id, { fullName, updatedAt: now });
    let cardId: Id<"cards">;
    if (existing) {
      await ctx.db.patch(existing._id, profile);
      cardId = existing._id;
    } else {
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect();
      let slug = normalizeSlug(user.demoUsername ?? fullName);
      const slugOwner = await ctx.db
        .query("cards")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (slugOwner && slugOwner.ownerId !== user._id) {
        slug = normalizeSlug(`${slug}-${String(user._id).slice(-6)}`);
      }

      cardId = await ctx.db.insert("cards", {
        ownerId: user._id,
        slug,
        fullName,
        ...(profile.jobTitle ? { jobTitle: profile.jobTitle } : {}),
        ...(profile.company ? { company: profile.company } : {}),
        ...(profile.headline ? { headline: profile.headline } : {}),
        ...(profile.email ? { email: profile.email } : {}),
        ...(profile.phone ? { phone: profile.phone } : {}),
        ...(profile.website ? { website: profile.website } : {}),
        ...(profile.photoStorageId ? { photoStorageId: profile.photoStorageId } : {}),
        ...(profile.coverStorageId ? { coverStorageId: profile.coverStorageId } : {}),
        ...(profile.logoStorageId ? { logoStorageId: profile.logoStorageId } : {}),
        ...(profile.logoMode ? { logoMode: profile.logoMode } : {}),
        squarePhoto: profile.squarePhoto,
        ...(profile.circle ? { circle: profile.circle } : {}),
        wants: profile.wants,
        haves: profile.haves,
        qrOnBack: profile.qrOnBack,
        includeMeetingPlace: profile.includeMeetingPlace,
        profileVersion: profile.profileVersion,
        links: profile.links,
        fields: profile.fields,
        theme: profile.theme,
        status: profile.status,
        isPrimary: cards.length === 0 || !cards.some((card) => card.isPrimary),
        createdAt: now,
        updatedAt: now,
      });
    }

    if (existing) {
      const currentIds = new Set(
        [photoStorageId, coverStorageId, logoStorageId]
          .filter((id): id is Id<"_storage"> => id !== undefined),
      );
      const previousIds = [
        existing.photoStorageId,
        existing.coverStorageId,
        existing.logoStorageId,
      ].filter((id): id is Id<"_storage"> => id !== undefined);
      await Promise.all(
        [...previousIds].filter((id) => !currentIds.has(id)).map((id) => ctx.storage.delete(id)),
      );
    }

    const [photoUrl, coverUrl, logoUrl] = await Promise.all([
      photoStorageId ? ctx.storage.getUrl(photoStorageId) : null,
      coverStorageId ? ctx.storage.getUrl(coverStorageId) : null,
      logoStorageId ? ctx.storage.getUrl(logoStorageId) : null,
    ]);
    return { cardId, photoUrl, coverUrl, logoUrl };
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

export const generateDemoImageUploadUrl = mutation({
  args: { sessionToken: v.string() },
  returns: v.string(),
  handler: async (ctx, { sessionToken }) => {
    await requireDemoUser(ctx, sessionToken);
    return ctx.storage.generateUploadUrl();
  },
});

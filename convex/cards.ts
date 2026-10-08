import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireDemoUser } from "./lib/demoAuthHelper";
import { normalizeSlug } from "./lib/slugs";
import { awardProgress } from "./lib/progress";

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

async function uniqueSlug(
  ctx: MutationCtx,
  slugSource: string,
  ownerId: Id<"users">,
  exceptCardId?: Id<"cards">,
) {
  const base = normalizeSlug(slugSource) || "card";
  let candidate = base;
  let suffix = 1;
  while (true) {
    const existing = await ctx.db
      .query("cards")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();
    if (!existing || existing._id === exceptCardId) return candidate;
    candidate = `${base}-${String(ownerId).slice(-6)}${suffix === 1 ? "" : `-${suffix}`}`;
    suffix += 1;
  }
}

async function requireOwnedUpload(
  ctx: MutationCtx,
  userId: Id<"users">,
  storageId: Id<"_storage"> | undefined,
  currentStorageId: Id<"_storage"> | undefined,
) {
  if (!storageId || storageId === currentStorageId) return;
  const upload = await ctx.db.query("cardUploads")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .unique();
  if (!upload || upload.ownerId !== userId) throw new Error("This image upload does not belong to your account.");
}

export const listMine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    return ctx.db
      .query("cards")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
  },
});

export const getPrimaryMine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireDemoUser(ctx, sessionToken);
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

    return {
      _id: card._id,
      slug: card.slug,
      fullName: card.fullName,
      jobTitle: card.jobTitle,
      company: card.company,
      headline: card.headline,
      photoStorageId: card.photoStorageId,
      coverStorageId: card.coverStorageId,
      logoStorageId: card.logoStorageId,
      logoMode: card.logoMode,
      squarePhoto: card.squarePhoto,
      qrOnBack: card.qrOnBack,
      includeMeetingPlace: card.includeMeetingPlace,
      profileVersion: card.profileVersion,
      fields: card.fields,
      theme: card.theme,
      status: card.status,
      isPrimary: card.isPrimary,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      photoUrl,
      coverUrl,
      logoUrl,
    };
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

    return {
      slug: card.slug,
      fullName: card.fullName,
      jobTitle: card.jobTitle,
      company: card.company,
      headline: card.headline,
      logoMode: card.logoMode,
      squarePhoto: card.squarePhoto,
      qrOnBack: card.qrOnBack,
      includeMeetingPlace: card.includeMeetingPlace,
      theme: card.theme,
      photoUrl,
      coverUrl,
      logoUrl,
      fields: card.fields.filter((field) => field.visible),
    };
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    fullName: v.string(),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    headline: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const slug = await uniqueSlug(ctx, user.demoUsername ?? args.fullName, user._id);

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
    photoStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    coverStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    logoStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    logoMode: v.optional(v.union(v.literal("auto"), v.literal("image"), v.null())),
    squarePhoto: v.optional(v.boolean()),
    qrOnBack: v.optional(v.boolean()),
    includeMeetingPlace: v.optional(v.boolean()),
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
    await Promise.all([
      requireOwnedUpload(ctx, user._id, photoStorageId, existing?.photoStorageId),
      requireOwnedUpload(ctx, user._id, coverStorageId, existing?.coverStorageId),
      requireOwnedUpload(ctx, user._id, logoStorageId, existing?.logoStorageId),
    ]);
    const profile = {
      fullName,
      jobTitle: args.jobTitle === undefined ? existing?.jobTitle : args.jobTitle.trim() || undefined,
      company: args.company === undefined ? existing?.company : args.company.trim() || undefined,
      headline: args.headline === undefined ? existing?.headline : args.headline.trim() || undefined,
      photoStorageId,
      coverStorageId,
      logoStorageId,
      logoMode,
      squarePhoto: args.squarePhoto ?? existing?.squarePhoto ?? false,
      qrOnBack: args.qrOnBack ?? existing?.qrOnBack ?? true,
      includeMeetingPlace: args.includeMeetingPlace ?? existing?.includeMeetingPlace ?? true,
      profileVersion: 1,
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
    let cardSlug = "";
    if (existing) {
      const slug = await uniqueSlug(ctx, existing.slug, user._id, existing._id);
      cardSlug = slug;
      await ctx.db.patch(existing._id, {
        fullName: profile.fullName,
        ...(profile.jobTitle ? { jobTitle: profile.jobTitle } : { jobTitle: undefined }),
        ...(profile.company ? { company: profile.company } : { company: undefined }),
        ...(profile.headline ? { headline: profile.headline } : { headline: undefined }),
        photoStorageId: profile.photoStorageId,
        coverStorageId: profile.coverStorageId,
        logoStorageId: profile.logoStorageId,
        logoMode: profile.logoMode,
        squarePhoto: profile.squarePhoto,
        qrOnBack: profile.qrOnBack,
        includeMeetingPlace: profile.includeMeetingPlace,
        profileVersion: profile.profileVersion,
        fields: profile.fields,
        theme: profile.theme,
        status: profile.status,
        slug,
        updatedAt: profile.updatedAt,
      });
      cardId = existing._id;
    } else {
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect();
      const slug = await uniqueSlug(ctx, user.demoUsername ?? fullName, user._id);
      cardSlug = slug;

      cardId = await ctx.db.insert("cards", {
        ownerId: user._id,
        slug,
        fullName,
        ...(profile.jobTitle ? { jobTitle: profile.jobTitle } : {}),
        ...(profile.company ? { company: profile.company } : {}),
        ...(profile.headline ? { headline: profile.headline } : {}),
        ...(profile.photoStorageId ? { photoStorageId: profile.photoStorageId } : {}),
        ...(profile.coverStorageId ? { coverStorageId: profile.coverStorageId } : {}),
        ...(profile.logoStorageId ? { logoStorageId: profile.logoStorageId } : {}),
        ...(profile.logoMode ? { logoMode: profile.logoMode } : {}),
        squarePhoto: profile.squarePhoto,
        qrOnBack: profile.qrOnBack,
        includeMeetingPlace: profile.includeMeetingPlace,
        profileVersion: profile.profileVersion,
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
      const removedIds = [...previousIds].filter((id) => !currentIds.has(id));
      await Promise.all(
        removedIds.map(async (id) => {
          const upload = await ctx.db.query("cardUploads")
            .withIndex("by_storage", (q) => q.eq("storageId", id))
            .unique();
          if (upload?.ownerId === user._id) await ctx.db.delete(upload._id);
          await ctx.storage.delete(id);
        }),
      );
    }

    if (!existing) await awardProgress(ctx, user._id, 100, "first_card");
    if (photoStorageId && !existing?.photoStorageId) await awardProgress(ctx, user._id, 100, "face_of_brand");
    if (logoMode && !existing?.logoMode) await awardProgress(ctx, user._id, 50, "brand_mark");
    if (profile.status === "published" && existing?.status !== "published") {
      await awardProgress(ctx, user._id, 150, "circle_founder");
    }

    const [photoUrl, coverUrl, logoUrl] = await Promise.all([
      photoStorageId ? ctx.storage.getUrl(photoStorageId) : null,
      coverStorageId ? ctx.storage.getUrl(coverStorageId) : null,
      logoStorageId ? ctx.storage.getUrl(logoStorageId) : null,
    ]);
    return { cardId, slug: cardSlug, photoUrl, coverUrl, logoUrl };
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    cardId: v.id("cards"),
    fullName: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    headline: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    coverStorageId: v.optional(v.id("_storage")),
    fields: v.optional(v.array(fieldValidator)),
    theme: v.optional(themeValidator),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    ),
  },
  handler: async (ctx, { sessionToken, cardId, ...updates }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const card = await ctx.db.get(cardId);
    if (!card || card.ownerId !== user._id) throw new Error("Card not found.");
    await Promise.all([
      requireOwnedUpload(ctx, user._id, updates.photoStorageId, card.photoStorageId),
      requireOwnedUpload(ctx, user._id, updates.coverStorageId, card.coverStorageId),
    ]);

    const slug = await uniqueSlug(ctx, card.slug, user._id, cardId);
    const patch: Record<string, unknown> = { updatedAt: Date.now(), slug };

    for (const key of [
      "fullName",
      "jobTitle",
      "company",
      "headline",
      "photoStorageId",
      "coverStorageId",
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
  args: { sessionToken: v.string(), cardId: v.id("cards") },
  handler: async (ctx, { sessionToken, cardId }) => {
    const user = await requireDemoUser(ctx, sessionToken);
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

export const recordShare = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const card = await ctx.db
      .query("cards")
      .withIndex("by_owner_primary", (q) => q.eq("ownerId", user._id).eq("isPrimary", true))
      .first();
    if (!card || card.status !== "published") throw new Error("Publish your card before sharing it.");
    await awardProgress(ctx, user._id, 100, "first_share");
    return card.slug;
  },
});

export const deleteMine = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const uploads = await ctx.db.query("cardUploads").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect();
    const linkedContacts = await Promise.all(cards.map((card) =>
      ctx.db.query("contacts").withIndex("by_linked_card", (q) => q.eq("linkedCardId", card._id)).collect(),
    ));
    const externalContacts = new Map(linkedContacts.flat()
      .filter((contact) => contact.ownerId !== user._id)
      .map((contact) => [contact._id, contact]));
    const storageIds = new Set<Id<"_storage">>(cards.flatMap((card) => [
      card.photoStorageId,
      card.coverStorageId,
      card.logoStorageId,
    ]).concat(uploads.map((upload) => upload.storageId)).filter((id): id is Id<"_storage"> => id !== undefined));
    await Promise.all([
      ...cards.map((card) => ctx.db.delete(card._id)),
      ...uploads.map((upload) => ctx.db.delete(upload._id)),
      ...[...externalContacts.values()].map((contact) =>
        ctx.db.patch(contact._id, { linkedCardId: undefined, linkedUserId: undefined, updatedAt: Date.now() }),
      ),
      ...[...storageIds].map((id) => ctx.storage.delete(id)),
    ]);
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

export const registerDemoImageUpload = mutation({
  args: { sessionToken: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, { sessionToken, storageId }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const metadata = await ctx.storage.getMetadata(storageId);
    if (!metadata) throw new Error("Uploaded image could not be found.");
    const existing = await ctx.db.query("cardUploads")
      .withIndex("by_storage", (q) => q.eq("storageId", storageId))
      .unique();
    if (existing) {
      if (existing.ownerId !== user._id) throw new Error("This image upload does not belong to your account.");
      return storageId;
    }
    await ctx.db.insert("cardUploads", { ownerId: user._id, storageId, createdAt: Date.now() });
    return storageId;
  },
});

import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { normalizeSlug } from "./lib/slugs";

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const user = await requireCurrentUser(ctx);
    const page = await ctx.db
      .query("contacts")
      .withIndex("by_owner_created_at", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .paginate(paginationOpts);

    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (contact) => {
          const card = contact.linkedCardId
            ? await ctx.db.get(contact.linkedCardId)
            : null;
          const photoUrl = card?.photoStorageId
            ? await ctx.storage.getUrl(card.photoStorageId)
            : null;
          const linkedCard = card
            ? {
                _id: card._id,
                slug: card.slug,
                fullName: card.fullName,
                jobTitle: card.jobTitle,
                company: card.company,
                headline: card.headline,
                email: card.email,
                phone: card.phone,
                website: card.website,
                links: card.links.filter((link) => link.visible),
                fields: card.fields.filter((field) => field.visible),
                theme: card.theme,
              }
            : null;
          return { ...contact, linkedCard, photoUrl };
        }),
      ),
    };
  },
});

export const saveFromCard = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const user = await requireCurrentUser(ctx);
    const card = await ctx.db
      .query("cards")
      .withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(slug)))
      .unique();
    if (!card || card.status !== "published") throw new Error("Card not found.");
    if (card.ownerId === user._id) throw new Error("You cannot save your own card.");

    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_owner_card", (q) =>
        q.eq("ownerId", user._id).eq("linkedCardId", card._id),
      )
      .unique();
    const now = Date.now();
    const snapshot = {
      linkedUserId: card.ownerId,
      fullName: card.fullName,
      ...(card.jobTitle ? { jobTitle: card.jobTitle } : {}),
      ...(card.company ? { company: card.company } : {}),
      ...(card.email ? { email: card.email } : {}),
      ...(card.phone ? { phone: card.phone } : {}),
      ...(card.website ? { website: card.website } : {}),
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, snapshot);
      return existing._id;
    }

    return ctx.db.insert("contacts", {
      ownerId: user._id,
      linkedUserId: card.ownerId,
      linkedCardId: card._id,
      source: "received_card",
      fullName: card.fullName,
      ...(card.jobTitle ? { jobTitle: card.jobTitle } : {}),
      ...(card.company ? { company: card.company } : {}),
      ...(card.email ? { email: card.email } : {}),
      ...(card.phone ? { phone: card.phone } : {}),
      ...(card.website ? { website: card.website } : {}),
      tags: [],
      notes: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createManual = mutation({
  args: {
    fullName: v.string(),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const fullName = args.fullName.trim();
    if (!fullName) throw new Error("Enter a contact name.");
    const now = Date.now();

    return ctx.db.insert("contacts", {
      ownerId: user._id,
      source: "manual",
      fullName,
      ...(args.jobTitle ? { jobTitle: args.jobTitle.trim() } : {}),
      ...(args.company ? { company: args.company.trim() } : {}),
      ...(args.email ? { email: args.email.trim() } : {}),
      ...(args.phone ? { phone: args.phone.trim() } : {}),
      ...(args.website ? { website: args.website.trim() } : {}),
      tags: [],
      notes: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateDetails = mutation({
  args: {
    contactId: v.id("contacts"),
    fullName: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    metAt: v.optional(v.number()),
    metLocation: v.optional(v.string()),
  },
  handler: async (ctx, { contactId, ...updates }) => {
    const user = await requireCurrentUser(ctx);
    const contact = await ctx.db.get(contactId);
    if (!contact || contact.ownerId !== user._id) {
      throw new Error("Contact not found.");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const key of [
      "fullName",
      "jobTitle",
      "company",
      "email",
      "phone",
      "website",
      "tags",
      "metAt",
      "metLocation",
    ] as const) {
      const value = updates[key];
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(contactId, patch);
    return contactId;
  },
});

export const addNote = mutation({
  args: { contactId: v.id("contacts"), body: v.string() },
  handler: async (ctx, { contactId, body }) => {
    const user = await requireCurrentUser(ctx);
    const contact = await ctx.db.get(contactId);
    if (!contact || contact.ownerId !== user._id) {
      throw new Error("Contact not found.");
    }
    const trimmedBody = body.trim();
    if (!trimmedBody) throw new Error("A note cannot be empty.");
    const now = Date.now();
    await ctx.db.patch(contactId, {
      notes: [...contact.notes, { id: crypto.randomUUID(), body: trimmedBody, createdAt: now }],
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, { contactId }) => {
    const user = await requireCurrentUser(ctx);
    const contact = await ctx.db.get(contactId);
    if (!contact || contact.ownerId !== user._id) {
      throw new Error("Contact not found.");
    }
    await ctx.db.delete(contactId);
  },
});

export const exportRows = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_owner_created_at", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();

    return contacts.map((contact) => ({
      fullName: contact.fullName,
      jobTitle: contact.jobTitle ?? "",
      company: contact.company ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      website: contact.website ?? "",
      tags: contact.tags.join("; "),
      notes: contact.notes.map((note) => note.body).join(" | "),
      metLocation: contact.metLocation ?? "",
      createdAt: new Date(contact.createdAt).toISOString(),
    }));
  },
});

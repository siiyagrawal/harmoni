import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireDemoUser } from "./lib/demoAuthHelper";
import { normalizeSlug } from "./lib/slugs";
import { upsertContactFromCard } from "./lib/networking";
import { withCanRequestIntros } from "./lib/circleAccess";

async function saveCardSnapshot(ctx: MutationCtx, ownerId: Id<"users">, slug: string) {
  const card = await ctx.db
    .query("cards")
    .withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(slug)))
    .unique();
  if (!card || card.status !== "published") throw new Error("This card is not available.");
  if (card.ownerId === ownerId) throw new Error("You cannot save your own card.");
  return upsertContactFromCard(ctx, ownerId, card, "received_card");
}

export const listMine = query({
  args: { sessionToken: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { sessionToken, paginationOpts }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const page = await ctx.db
      .query("contacts")
      .withIndex("by_owner_created_at", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...page,
      page: await Promise.all(page.page.map(async (contact) => {
        const [card, contactWithIntroAccess, introducerCard] = await Promise.all([
          contact.linkedCardId ? ctx.db.get(contact.linkedCardId) : Promise.resolve(null),
          withCanRequestIntros(ctx, user._id, contact),
          contact.source === "introduced" && contact.introducedById
            ? ctx.db.query("cards")
                .withIndex("by_owner_primary", (q) => q.eq("ownerId", contact.introducedById!).eq("isPrimary", true))
                .first()
            : Promise.resolve(null),
        ]);
        const publishedCard = card?.status === "published" ? card : null;
        const photoUrl = publishedCard?.photoStorageId
          ? await ctx.storage.getUrl(publishedCard.photoStorageId)
          : null;
        const linkedCard = publishedCard ? {
          _id: publishedCard._id,
          slug: publishedCard.slug,
          fullName: publishedCard.fullName,
          jobTitle: publishedCard.jobTitle,
          company: publishedCard.company,
          headline: publishedCard.headline,
          fields: publishedCard.fields.filter((field) => field.visible),
          theme: publishedCard.theme,
        } : null;
        const snapshot = contact.snapshot ?? {
          fullName: contact.fullName ?? "Harmoni contact",
          ...(contact.jobTitle ? { jobTitle: contact.jobTitle } : {}),
          ...(contact.company ? { company: contact.company } : {}),
          fields: [
            ...(contact.email ? [{ label: "Email", value: contact.email, kind: "email", visible: true, order: 0 }] : []),
            ...(contact.phone ? [{ label: "Phone", value: contact.phone, kind: "phone", visible: true, order: 1 }] : []),
            ...(contact.website ? [{ label: "Website", value: contact.website, kind: "web", visible: true, order: 2 }] : []),
          ],
        };
        return {
          ...contactWithIntroAccess,
          snapshot,
          linkedCard,
          photoUrl,
          ...(introducerCard?.status === "published" ? { introducedByName: introducerCard.fullName } : {}),
        };
      })),
    };
  },
});

export const saveFromCard = mutation({
  args: { sessionToken: v.string(), slug: v.string() },
  handler: async (ctx, { sessionToken, slug }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    return saveCardSnapshot(ctx, user._id, slug);
  },
});

export const savePublicCard = mutation({
  args: { sessionToken: v.string(), slug: v.string() },
  handler: async (ctx, { sessionToken, slug }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    return saveCardSnapshot(ctx, user._id, slug);
  },
});

export const createManual = mutation({
  args: {
    sessionToken: v.string(),
    fullName: v.string(),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireDemoUser(ctx, args.sessionToken);
    const fullName = args.fullName.trim();
    if (!fullName) throw new Error("Enter a contact name.");
    const fields = [
      ...(args.email?.trim() ? [{ label: "Email", value: args.email.trim(), kind: "email", visible: true, order: 0 }] : []),
      ...(args.phone?.trim() ? [{ label: "Phone", value: args.phone.trim(), kind: "phone", visible: true, order: 1 }] : []),
      ...(args.website?.trim() ? [{ label: "Website", value: args.website.trim(), kind: "web", visible: true, order: 2 }] : []),
    ];
    const now = Date.now();
    return ctx.db.insert("contacts", {
      ownerId: user._id,
      source: "manual",
      snapshot: {
        fullName,
        ...(args.jobTitle?.trim() ? { jobTitle: args.jobTitle.trim() } : {}),
        ...(args.company?.trim() ? { company: args.company.trim() } : {}),
        fields,
      },
      tags: [],
      notes: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateDetails = mutation({
  args: {
    sessionToken: v.string(),
    contactId: v.id("contacts"),
    tags: v.optional(v.array(v.string())),
    metAt: v.optional(v.number()),
    metLocation: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, contactId, ...updates }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const contact = await ctx.db.get(contactId);
    if (!contact || contact.ownerId !== user._id) throw new Error("Contact not found.");
    await ctx.db.patch(contactId, { ...updates, updatedAt: Date.now() });
    return contactId;
  },
});

export const addNote = mutation({
  args: { sessionToken: v.string(), contactId: v.id("contacts"), body: v.string() },
  handler: async (ctx, { sessionToken, contactId, body }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const contact = await ctx.db.get(contactId);
    if (!contact || contact.ownerId !== user._id) throw new Error("Contact not found.");
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
  args: { sessionToken: v.string(), contactId: v.id("contacts") },
  handler: async (ctx, { sessionToken, contactId }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const contact = await ctx.db.get(contactId);
    if (!contact || contact.ownerId !== user._id) throw new Error("Contact not found.");
    await ctx.db.delete(contactId);
  },
});

export const exportRows = internalQuery({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_owner_created_at", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
    return contacts.map((contact) => {
      const fields = contact.snapshot?.fields ?? [];
      return {
        fullName: contact.snapshot?.fullName ?? contact.fullName ?? "",
        jobTitle: contact.snapshot?.jobTitle ?? contact.jobTitle ?? "",
        company: contact.snapshot?.company ?? contact.company ?? "",
        email: fields.find((field) => field.kind === "email")?.value ?? contact.email ?? "",
        phone: fields.find((field) => field.kind === "phone")?.value ?? contact.phone ?? "",
        website: fields.find((field) => field.kind === "web")?.value ?? contact.website ?? "",
        tags: contact.tags.join("; "),
        notes: contact.notes.map((note) => note.body).join(" | "),
        metLocation: contact.metLocation ?? "",
        createdAt: new Date(contact.createdAt).toISOString(),
      };
    });
  },
});

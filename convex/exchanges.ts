import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireDemoUser } from "./lib/demoAuthHelper";
import { awardProgress } from "./lib/progress";
import { ensureCircleMembership, primaryPublishedCard, snapshotFromCard, upsertContactFromCard } from "./lib/networking";
import { normalizeSlug } from "./lib/slugs";

export const send = mutation({
  args: {
    sessionToken: v.string(),
    slug: v.string(),
    metLocation: v.optional(v.string()),
    metAt: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, slug, metLocation, metAt }) => {
    const sender = await requireDemoUser(ctx, sessionToken);
    const fromCard = await primaryPublishedCard(ctx, sender._id);
    if (!fromCard) throw new Error("Publish your card before sharing it back.");
    const targetCard = await ctx.db.query("cards")
      .withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(slug))).unique();
    if (!targetCard || targetCard.status !== "published") throw new Error("This card is not available.");
    if (targetCard.ownerId === sender._id) throw new Error("This is your own card.");

    const existing = (await ctx.db.query("exchanges").withIndex("by_from", (q) => q.eq("fromUserId", sender._id)).collect())
      .find((exchange) => exchange.toUserId === targetCard.ownerId && exchange.status !== "declined");
    if (existing) return { exchangeId: existing._id, status: existing.status };
    const incoming = await ctx.db.query("exchanges")
      .withIndex("by_to_status", (q) => q.eq("toUserId", sender._id).eq("status", "pending"))
      .collect();
    const reverse = incoming.find((exchange) => exchange.fromUserId === targetCard.ownerId);
    if (reverse) return { exchangeId: reverse._id, status: reverse.status };

    const exchangeId = await ctx.db.insert("exchanges", {
      fromUserId: sender._id,
      toUserId: targetCard.ownerId,
      fromCardId: fromCard._id,
      status: "pending",
      ...(metLocation?.trim() ? { metLocation: metLocation.trim() } : {}),
      ...(metAt !== undefined ? { metAt } : {}),
      createdAt: Date.now(),
    });
    return { exchangeId, status: "pending" as const };
  },
});

export const inbox = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const pending = await ctx.db.query("exchanges")
      .withIndex("by_to_status", (q) => q.eq("toUserId", user._id).eq("status", "pending"))
      .order("desc").collect();
    return Promise.all(pending.map(async (exchange) => {
      const card = await ctx.db.get(exchange.fromCardId);
      if (!card || card.status !== "published") return null;
      return {
        _id: exchange._id,
        createdAt: exchange.createdAt,
        metLocation: exchange.metLocation,
        metAt: exchange.metAt,
        card: {
          slug: card.slug,
          fullName: card.fullName,
          jobTitle: card.jobTitle,
          company: card.company,
          photoUrl: card.photoStorageId ? await ctx.storage.getUrl(card.photoStorageId) : null,
        },
      };
    })).then((items) => items.filter((item) => item !== null));
  },
});

async function resolvePendingExchange(
  ctx: MutationCtx,
  userId: Id<"users">,
  exchangeId: Id<"exchanges">,
) {
  const exchange = await ctx.db.get(exchangeId);
  if (!exchange || exchange.toUserId !== userId || exchange.status !== "pending") {
    throw new Error("This exchange request is no longer available.");
  }
  const fromCard = await ctx.db.get(exchange.fromCardId);
  if (!fromCard || fromCard.status !== "published" || fromCard.ownerId !== exchange.fromUserId) {
    throw new Error("The sender's card is no longer available.");
  }
  return { exchange, fromCard };
}

export const accept = mutation({
  args: { sessionToken: v.string(), exchangeId: v.id("exchanges") },
  handler: async (ctx, { sessionToken, exchangeId }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const { exchange, fromCard } = await resolvePendingExchange(ctx, user._id, exchangeId);
    const toCard = await primaryPublishedCard(ctx, user._id);
    if (!toCard) throw new Error("Publish your card before accepting this exchange.");
    const metAt = exchange.metAt ?? Date.now();
    const metLocation = exchange.metLocation;
    await ctx.db.patch(exchangeId, { status: "accepted", toCardId: toCard._id, acceptedAt: Date.now() });
    await Promise.all([
      upsertContactFromCard(ctx, user._id, fromCard, "received_card", metAt, metLocation),
      upsertContactFromCard(ctx, exchange.fromUserId, toCard, "received_card", metAt, metLocation),
      ensureCircleMembership(ctx, user._id, exchange.fromUserId),
      ensureCircleMembership(ctx, exchange.fromUserId, user._id),
      awardProgress(ctx, user._id, 250),
      awardProgress(ctx, exchange.fromUserId, 250),
    ]);
    return { status: "accepted" as const, senderCard: snapshotFromCard(fromCard) };
  },
});

export const decline = mutation({
  args: { sessionToken: v.string(), exchangeId: v.id("exchanges") },
  handler: async (ctx, { sessionToken, exchangeId }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    await resolvePendingExchange(ctx, user._id, exchangeId);
    await ctx.db.patch(exchangeId, { status: "declined" });
  },
});

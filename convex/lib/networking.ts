import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type DbContext = MutationCtx | QueryCtx;

export async function primaryPublishedCard(ctx: DbContext, userId: Id<"users">) {
  const card = await ctx.db
    .query("cards")
    .withIndex("by_owner_primary", (q) => q.eq("ownerId", userId).eq("isPrimary", true))
    .first();
  return card?.status === "published" ? card : null;
}

export function snapshotFromCard(card: Doc<"cards">) {
  return {
    fullName: card.fullName,
    ...(card.jobTitle ? { jobTitle: card.jobTitle } : {}),
    ...(card.company ? { company: card.company } : {}),
    ...(card.headline ? { headline: card.headline } : {}),
    fields: card.fields.filter((field) => field.visible),
  };
}

export async function ensureCircleMembership(
  ctx: MutationCtx,
  ownerId: Id<"users">,
  memberId: Id<"users">,
) {
  let circle = await ctx.db.query("circles").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).first();
  if (!circle) {
    const owner = await ctx.db.get(ownerId);
    const name = owner?.fullName ? owner.fullName.split(/\s+/)[0] + "'s Circle" : "My Circle";
    const circleId = await ctx.db.insert("circles", { ownerId, name, createdAt: Date.now() });
    circle = await ctx.db.get(circleId);
  }
  if (!circle) throw new Error("Circle could not be created.");
  const membership = await ctx.db.query("circleMembers")
    .withIndex("by_circle_user", (q) => q.eq("circleId", circle._id).eq("userId", memberId))
    .unique();
  if (!membership) await ctx.db.insert("circleMembers", { circleId: circle._id, userId: memberId, joinedAt: Date.now() });
  return circle;
}

export async function upsertContactFromCard(
  ctx: MutationCtx,
  ownerId: Id<"users">,
  card: Doc<"cards">,
  source: "received_card" | "introduced",
  metAt?: number,
  metLocation?: string,
) {
  const linked = await ctx.db.query("contacts")
    .withIndex("by_owner_linked_user", (q) => q.eq("ownerId", ownerId).eq("linkedUserId", card.ownerId))
    .unique();
  const byCard = linked ?? await ctx.db.query("contacts")
    .withIndex("by_owner_card", (q) => q.eq("ownerId", ownerId).eq("linkedCardId", card._id))
    .unique();
  const now = Date.now();
  const updates = {
    linkedUserId: card.ownerId,
    linkedCardId: card._id,
    snapshot: snapshotFromCard(card),
    source,
    ...(metAt !== undefined ? { metAt } : {}),
    ...(metLocation !== undefined ? { metLocation } : {}),
    updatedAt: now,
  };
  if (byCard) {
    await ctx.db.patch(byCard._id, updates);
    return byCard._id;
  }
  return ctx.db.insert("contacts", {
    ownerId,
    ...updates,
    source,
    tags: [],
    notes: [],
    createdAt: now,
  });
}

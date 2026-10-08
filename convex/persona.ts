import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireDemoUser } from "./lib/demoAuthHelper";
import { canView, recordPersonaRead } from "./lib/permissions";

const kindValidator = v.union(
  v.literal("want"),
  v.literal("have"),
  v.literal("expertise"),
  v.literal("interest"),
  v.literal("goal"),
);
const visibilityValidator = v.union(
  v.literal("private"),
  v.literal("connections"),
  v.literal("circle"),
  v.literal("custom"),
);
const purposeValidator = v.union(v.literal("matching"), v.literal("intro"), v.literal("view"));
async function ownedItem(ctx: MutationCtx, ownerId: Id<"users">, itemId: Id<"personaItems">) {
  const item = await ctx.db.get(itemId);
  if (!item || item.ownerId !== ownerId) throw new Error("Context item not found.");
  return item;
}

export const mine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const items = (await Promise.all(["draft", "approved", "archived"].map((status) =>
      ctx.db.query("personaItems")
        .withIndex("by_owner_status", (q) => q.eq("ownerId", user._id).eq("status", status as "draft" | "approved" | "archived"))
        .collect(),
    ))).flat();
    const visible = [];
    for (const item of items) {
      if (await canView(ctx, user._id, item, "view")) visible.push(item);
    }
    return visible.sort((left, right) => right.updatedAt - left.updatedAt);
  },
});

export const create = mutation({
  args: { sessionToken: v.string(), kind: kindValidator, text: v.string(), tags: v.optional(v.array(v.string())) },
  handler: async (ctx, { sessionToken, kind, text, tags }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const trimmedText = text.trim();
    if (!trimmedText) throw new Error("Add a little context first.");
    const now = Date.now();
    return ctx.db.insert("personaItems", {
      ownerId: user._id,
      kind,
      text: trimmedText,
      tags: [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))],
      visibility: "private",
      status: "draft",
      source: "user",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { sessionToken: v.string(), itemId: v.id("personaItems"), text: v.optional(v.string()), tags: v.optional(v.array(v.string())) },
  handler: async (ctx, { sessionToken, itemId, text, tags }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const item = await ownedItem(ctx, user._id, itemId);
    const trimmedText = text?.trim();
    if (text !== undefined && !trimmedText) throw new Error("Context cannot be empty.");
    await ctx.db.patch(itemId, {
      ...(trimmedText !== undefined ? { text: trimmedText } : {}),
      ...(tags !== undefined ? { tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))] } : {}),
      ...(item.status === "approved" ? { status: "draft" as const } : {}),
      updatedAt: Date.now(),
    });
    return itemId;
  },
});

export const approve = mutation({
  args: { sessionToken: v.string(), itemId: v.id("personaItems") },
  handler: async (ctx, { sessionToken, itemId }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    await ownedItem(ctx, user._id, itemId);
    await ctx.db.patch(itemId, { status: "approved", updatedAt: Date.now() });
    return itemId;
  },
});

export const archive = mutation({
  args: { sessionToken: v.string(), itemId: v.id("personaItems") },
  handler: async (ctx, { sessionToken, itemId }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    await ownedItem(ctx, user._id, itemId);
    await ctx.db.patch(itemId, { status: "archived", updatedAt: Date.now() });
    return itemId;
  },
});

export const setVisibility = mutation({
  args: { sessionToken: v.string(), itemId: v.id("personaItems"), visibility: visibilityValidator },
  handler: async (ctx, { sessionToken, itemId, visibility }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    await ownedItem(ctx, user._id, itemId);
    await ctx.db.patch(itemId, { visibility, updatedAt: Date.now() });
    return itemId;
  },
});

export const grant = mutation({
  args: {
    sessionToken: v.string(),
    itemId: v.id("personaItems"),
    granteeUserId: v.optional(v.id("users")),
    granteeCircleId: v.optional(v.id("circles")),
    purpose: purposeValidator,
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, itemId, granteeUserId, granteeCircleId, purpose, expiresAt }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const item = await ownedItem(ctx, user._id, itemId);
    if (item.status !== "approved" || item.visibility !== "custom") throw new Error("Approve the item and set its visibility to custom before granting access.");
    if ((granteeUserId === undefined) === (granteeCircleId === undefined)) throw new Error("Choose one person or circle for this grant.");
    if (granteeUserId) {
      const grantee = await ctx.db.get(granteeUserId);
      if (!grantee || grantee._id === user._id) throw new Error("Choose another Harmoni member.");
    }
    if (granteeCircleId) {
      const circle = await ctx.db.get(granteeCircleId);
      if (!circle) throw new Error("Circle not found.");
      const ownerMembership = await ctx.db.query("circleMembers")
        .withIndex("by_circle_user", (q) => q.eq("circleId", granteeCircleId).eq("userId", user._id)).unique();
      if (!ownerMembership) throw new Error("You must belong to that circle to grant access to it.");
    }
    if (expiresAt !== undefined && expiresAt <= Date.now()) throw new Error("Choose a future expiry time.");
    const existing = await ctx.db.query("personaGrants").withIndex("by_item", (q) => q.eq("itemId", itemId)).collect();
    const duplicate = existing.find((grant) =>
      grant.ownerId === user._id && grant.purpose === purpose && grant.revokedAt === undefined &&
      grant.granteeUserId === granteeUserId && grant.granteeCircleId === granteeCircleId &&
      grant.expiresAt === expiresAt,
    );
    if (duplicate) return duplicate._id;
    return ctx.db.insert("personaGrants", {
      ownerId: user._id,
      itemId,
      ...(granteeUserId ? { granteeUserId } : {}),
      ...(granteeCircleId ? { granteeCircleId } : {}),
      purpose,
      ...(expiresAt !== undefined ? { expiresAt } : {}),
      createdAt: Date.now(),
    });
  },
});

export const revoke = mutation({
  args: { sessionToken: v.string(), grantId: v.id("personaGrants") },
  handler: async (ctx, { sessionToken, grantId }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const grant = await ctx.db.get(grantId);
    if (!grant || grant.ownerId !== user._id) throw new Error("Permission grant not found.");
    if (grant.revokedAt === undefined) await ctx.db.patch(grantId, { revokedAt: Date.now() });
    return grantId;
  },
});

export const read = mutation({
  args: { sessionToken: v.string(), itemId: v.id("personaItems"), purpose: purposeValidator },
  handler: async (ctx, { sessionToken, itemId, purpose }) => {
    const viewer = await requireDemoUser(ctx, sessionToken);
    const item = await ctx.db.get(itemId);
    if (!item || !(await canView(ctx, viewer._id, item, purpose))) throw new Error("You do not have permission to view this context.");
    await recordPersonaRead(ctx, viewer._id, item, purpose);
    return { _id: item._id, kind: item.kind, text: item.text, tags: item.tags, visibility: item.visibility, status: item.status };
  },
});

export const accessLogMine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const owner = await requireDemoUser(ctx, sessionToken);
    const ownedItems = (await Promise.all(["draft", "approved", "archived"].map((status) =>
      ctx.db.query("personaItems")
        .withIndex("by_owner_status", (q) => q.eq("ownerId", owner._id).eq("status", status as "draft" | "approved" | "archived"))
        .collect(),
    ))).flat();
    const logs = (await Promise.all(ownedItems.map((item) =>
      ctx.db.query("accessLog").withIndex("by_item", (q) => q.eq("itemId", item._id)).collect(),
    ))).flat();
    const itemsById = new Map(ownedItems.map((item) => [item._id, item]));
    const rows = await Promise.all(logs.map(async (entry) => {
      const item = itemsById.get(entry.itemId);
      const viewer = await ctx.db.get(entry.viewerId);
      if (!item || !viewer || !(await canView(ctx, owner._id, item, "view"))) return null;
      const [grants, memberships, viewerCard] = await Promise.all([
        ctx.db.query("personaGrants").withIndex("by_item", (q) => q.eq("itemId", item._id)).collect(),
        ctx.db.query("circleMembers").withIndex("by_user", (q) => q.eq("userId", entry.viewerId)).collect(),
        ctx.db.query("cards").withIndex("by_owner_primary", (q) => q.eq("ownerId", entry.viewerId).eq("isPrimary", true)).first(),
      ]);
      const circleIds = new Set(memberships.map((membership) => membership.circleId));
      const grant = grants.find((candidate) =>
        candidate.ownerId === owner._id && candidate.purpose === entry.purpose &&
        candidate.revokedAt === undefined && (candidate.expiresAt === undefined || candidate.expiresAt > Date.now()) &&
        (candidate.granteeUserId === entry.viewerId || (candidate.granteeCircleId !== undefined && circleIds.has(candidate.granteeCircleId))),
      );
      return {
        _id: entry._id,
        viewerName: viewerCard?.status === "published" ? viewerCard.fullName : "Harmoni member",
        itemId: item._id,
        itemText: item.text,
        purpose: entry.purpose,
        at: entry.at,
        ...(grant ? { grantId: grant._id } : {}),
      };
    }));
    return rows.filter((row) => row !== null).sort((left, right) => right.at - left.at);
  },
});

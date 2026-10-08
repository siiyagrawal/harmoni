import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireDemoUser } from "./lib/demoAuthHelper";
import { getCircleNetwork } from "./lib/circleAccess";

export const mine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const circle = await ctx.db.query("circles").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).first();
    if (!circle) return null;
    const selfMembership = await ctx.db.query("circleMembers")
      .withIndex("by_circle_user", (q) => q.eq("circleId", circle._id).eq("userId", user._id)).unique();
    if (!selfMembership) throw new Error("You are not a member of your circle.");
    const memberships = await ctx.db.query("circleMembers").withIndex("by_circle", (q) => q.eq("circleId", circle._id)).collect();
    const members = await Promise.all(memberships.map(async (membership) => {
      const member = await ctx.db.get(membership.userId);
      const card = await ctx.db.query("cards").withIndex("by_owner_primary", (q) => q.eq("ownerId", membership.userId).eq("isPrimary", true)).first();
      if (!member) return null;
      return {
        userId: member._id,
        fullName: card?.status === "published" ? card.fullName : member._id === user._id ? member.fullName ?? "You" : "Harmoni member",
        jobTitle: card?.status === "published" ? card.jobTitle : undefined,
        company: card?.status === "published" ? card.company : undefined,
        photoUrl: card?.status === "published" && card.photoStorageId ? await ctx.storage.getUrl(card.photoStorageId) : null,
        isMe: member._id === user._id,
      };
    }));
    return { _id: circle._id, name: circle.name, members: members.filter((member) => member !== null) };
  },
});

export const members = query({
  args: { sessionToken: v.string(), circleId: v.id("circles") },
  handler: async (ctx, { sessionToken, circleId }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const circle = await ctx.db.get(circleId);
    if (!circle) throw new Error("Circle not found.");
    const viewerMembership = await ctx.db.query("circleMembers")
      .withIndex("by_circle_user", (q) => q.eq("circleId", circleId).eq("userId", user._id)).unique();
    if (!viewerMembership) throw new Error("Only circle members can view this list.");
    const memberships = await ctx.db.query("circleMembers").withIndex("by_circle", (q) => q.eq("circleId", circleId)).collect();
    return Promise.all(memberships.map(async (membership) => {
      const member = await ctx.db.get(membership.userId);
      if (!member) return null;
      const card = await ctx.db.query("cards").withIndex("by_owner_primary", (q) => q.eq("ownerId", member._id).eq("isPrimary", true)).first();
      if (!card || card.status !== "published") return { userId: member._id, fullName: "Harmoni member", jobTitle: undefined, company: undefined, photoUrl: null };
      return {
        userId: member._id,
        fullName: card.fullName,
        jobTitle: card.jobTitle,
        company: card.company,
        photoUrl: card.photoStorageId ? await ctx.storage.getUrl(card.photoStorageId) : null,
      };
    })).then((result) => result.filter((member) => member !== null));
  },
});

export const network = query({
  args: { sessionToken: v.string(), introducerId: v.id("users") },
  handler: async (ctx, { sessionToken, introducerId }) => {
    const requester = await requireDemoUser(ctx, sessionToken);
    return getCircleNetwork(ctx, requester._id, introducerId);
  },
});

export const rename = mutation({
  args: { sessionToken: v.string(), name: v.string() },
  handler: async (ctx, { sessionToken, name }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error("Enter a name for your circle.");
    const circle = await ctx.db.query("circles").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).first();
    if (!circle) throw new Error("Your circle could not be found.");
    await ctx.db.patch(circle._id, { name: trimmedName });
    return circle._id;
  },
});

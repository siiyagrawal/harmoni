import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireDemoUser } from "./lib/demoAuthHelper";
import { awardProgress } from "./lib/progress";
import { primaryPublishedCard, upsertContactFromCard } from "./lib/networking";
import { requireCircleMemberForIntro } from "./lib/circleAccess";

export const request = mutation({
  args: {
    sessionToken: v.string(),
    introducerId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { sessionToken, introducerId, targetUserId }) => {
    const requester = await requireDemoUser(ctx, sessionToken);
    if (requester._id === introducerId || requester._id === targetUserId || introducerId === targetUserId) {
      throw new Error("Choose another connection for this introduction.");
    }
    const connection = await ctx.db.query("contacts")
      .withIndex("by_owner_linked_user", (q) => q.eq("ownerId", requester._id).eq("linkedUserId", introducerId)).unique();
    if (!connection) throw new Error("You can only ask a connection for an introduction.");
    await requireCircleMemberForIntro(ctx, requester._id, introducerId);
    const circle = await ctx.db.query("circles").withIndex("by_owner", (q) => q.eq("ownerId", introducerId)).first();
    if (!circle) throw new Error("This connection has no circle yet.");
    const targetMember = await ctx.db.query("circleMembers")
      .withIndex("by_circle_user", (q) => q.eq("circleId", circle._id).eq("userId", targetUserId))
      .unique();
    if (!targetMember) throw new Error("That person is not in your connection's circle.");
    const duplicate = (await ctx.db.query("introRequests").withIndex("by_requester", (q) => q.eq("requesterId", requester._id)).collect())
      .find((item) => item.introducerId === introducerId && item.targetUserId === targetUserId && item.status === "pending");
    if (duplicate) return duplicate._id;
    const requestId = await ctx.db.insert("introRequests", {
      requesterId: requester._id,
      introducerId,
      targetUserId,
      status: "pending",
      createdAt: Date.now(),
    });
    await awardProgress(ctx, requester._id, 75);
    return requestId;
  },
});

export const inbox = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const introducer = await requireDemoUser(ctx, sessionToken);
    const requests = await ctx.db.query("introRequests")
      .withIndex("by_introducer_status", (q) => q.eq("introducerId", introducer._id).eq("status", "pending"))
      .order("desc").collect();
    return Promise.all(requests.map(async (request) => {
      const [requester, target] = await Promise.all([ctx.db.get(request.requesterId), ctx.db.get(request.targetUserId)]);
      if (!requester || !target) return null;
      const [requesterCard, targetCard] = await Promise.all([
        primaryPublishedCard(ctx, requester._id),
        primaryPublishedCard(ctx, target._id),
      ]);
      return {
        _id: request._id,
        createdAt: request.createdAt,
        requester: { userId: requester._id, fullName: requesterCard?.fullName ?? "Harmoni member" },
        target: { userId: target._id, fullName: targetCard?.fullName ?? "Harmoni member" },
      };
    })).then((items) => items.filter((item) => item !== null));
  },
});

export const sentMine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const requester = await requireDemoUser(ctx, sessionToken);
    return ctx.db.query("introRequests").withIndex("by_requester", (q) => q.eq("requesterId", requester._id)).collect();
  },
});

export const decide = mutation({
  args: {
    sessionToken: v.string(),
    requestId: v.id("introRequests"),
    decision: v.union(v.literal("approve"), v.literal("decline")),
  },
  handler: async (ctx, { sessionToken, requestId, decision }) => {
    const introducer = await requireDemoUser(ctx, sessionToken);
    const request = await ctx.db.get(requestId);
    if (!request || request.introducerId !== introducer._id || request.status !== "pending") {
      throw new Error("This introduction request is no longer available.");
    }
    const now = Date.now();
    if (decision === "decline") {
      await ctx.db.patch(requestId, { status: "declined", decidedAt: now });
      return { status: "declined" as const };
    }

    const [requesterCard, targetCard] = await Promise.all([
      primaryPublishedCard(ctx, request.requesterId),
      primaryPublishedCard(ctx, request.targetUserId),
    ]);
    if (!requesterCard || !targetCard) throw new Error("Both people need a published card before you can introduce them.");
    await ctx.db.patch(requestId, { status: "approved", decidedAt: now });
    const [requesterContactId, targetContactId] = await Promise.all([
      upsertContactFromCard(ctx, request.requesterId, targetCard, "introduced"),
      upsertContactFromCard(ctx, request.targetUserId, requesterCard, "introduced"),
    ]);
    await Promise.all([
      ctx.db.patch(requesterContactId, { introducedById: introducer._id }),
      ctx.db.patch(targetContactId, { introducedById: introducer._id }),
    ]);
    return { status: "approved" as const };
  },
});

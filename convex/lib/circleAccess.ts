import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

type CircleContext = QueryCtx | MutationCtx;

export type CircleNetworkMember = {
  userId: Id<"users">;
  fullName: string;
  jobTitle?: string;
  company?: string;
};

export type CircleNetworkResult =
  | { status: "not_member" }
  | { status: "ok"; members: CircleNetworkMember[] };

export async function isCircleMember(
  ctx: CircleContext,
  viewerId: Id<"users">,
  circleOwnerId: Id<"users">,
) {
  const circle = await ctx.db.query("circles")
    .withIndex("by_owner", (q) => q.eq("ownerId", circleOwnerId))
    .first();
  if (!circle) return false;

  const membership = await ctx.db.query("circleMembers")
    .withIndex("by_circle_user", (q) => q.eq("circleId", circle._id).eq("userId", viewerId))
    .unique();
  return membership !== null;
}

export async function canRequestIntros(
  ctx: CircleContext,
  viewerId: Id<"users">,
  linkedUserId: Id<"users"> | undefined,
) {
  return linkedUserId ? isCircleMember(ctx, viewerId, linkedUserId) : false;
}

export async function withCanRequestIntros<T extends { linkedUserId?: Id<"users"> }>(
  ctx: CircleContext,
  viewerId: Id<"users">,
  contact: T,
) {
  return {
    ...contact,
    canRequestIntros: await canRequestIntros(ctx, viewerId, contact.linkedUserId),
  };
}

export async function requireCircleMemberForIntro(
  ctx: MutationCtx,
  requesterId: Id<"users">,
  introducerId: Id<"users">,
) {
  if (!(await isCircleMember(ctx, requesterId, introducerId))) {
    throw new Error("Exchange and accept cards with this connection before asking for an introduction.");
  }
}

export async function getCircleNetwork(
  ctx: QueryCtx,
  viewerId: Id<"users">,
  introducerId: Id<"users">,
): Promise<CircleNetworkResult> {
  const introducer = await ctx.db.get(introducerId);
  if (!introducer) throw new Error("Introducer not found.");

  const circle = await ctx.db.query("circles")
    .withIndex("by_owner", (q) => q.eq("ownerId", introducerId))
    .first();
  if (!circle || !(await isCircleMember(ctx, viewerId, introducerId))) {
    return { status: "not_member" };
  }

  const memberships = await ctx.db.query("circleMembers")
    .withIndex("by_circle", (q) => q.eq("circleId", circle._id))
    .collect();
  const members = await Promise.all(
    memberships
      .filter((membership) => membership.userId !== viewerId && membership.userId !== introducerId)
      .map(async (membership): Promise<CircleNetworkMember | null> => {
        const member = await ctx.db.get(membership.userId);
        if (!member) return null;
        const card = await ctx.db.query("cards")
          .withIndex("by_owner_primary", (q) => q.eq("ownerId", membership.userId).eq("isPrimary", true))
          .first();
        return {
          userId: member._id,
          fullName: card?.status === "published" ? card.fullName : "Harmoni member",
          ...(card?.status === "published" && card.jobTitle ? { jobTitle: card.jobTitle } : {}),
          ...(card?.status === "published" && card.company ? { company: card.company } : {}),
        };
      }),
  );
  return { status: "ok", members: members.filter((member): member is CircleNetworkMember => member !== null) };
}

import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export type PersonaPurpose = "matching" | "intro" | "view";
type PermissionContext = QueryCtx | MutationCtx;

export async function canView(
  ctx: PermissionContext,
  viewerId: Id<"users">,
  item: Doc<"personaItems">,
  purpose: PersonaPurpose,
) {
  if (viewerId === item.ownerId) return true;
  if (item.status !== "approved" || item.visibility === "private") return false;

  if (item.visibility === "connections") {
    const [viewerHasOwner, ownerHasViewer] = await Promise.all([
      ctx.db.query("contacts")
        .withIndex("by_owner_linked_user", (q) => q.eq("ownerId", viewerId).eq("linkedUserId", item.ownerId))
        .unique(),
      ctx.db.query("contacts")
        .withIndex("by_owner_linked_user", (q) => q.eq("ownerId", item.ownerId).eq("linkedUserId", viewerId))
        .unique(),
    ]);
    return viewerHasOwner !== null && ownerHasViewer !== null;
  }

  if (item.visibility === "circle") {
    const [viewerMemberships, ownerMemberships] = await Promise.all([
      ctx.db.query("circleMembers").withIndex("by_user", (q) => q.eq("userId", viewerId)).collect(),
      ctx.db.query("circleMembers").withIndex("by_user", (q) => q.eq("userId", item.ownerId)).collect(),
    ]);
    const ownerCircleIds = new Set(ownerMemberships.map((membership) => membership.circleId));
    return viewerMemberships.some((membership) => ownerCircleIds.has(membership.circleId));
  }

  const grants = await ctx.db.query("personaGrants")
    .withIndex("by_item", (q) => q.eq("itemId", item._id))
    .collect();
  const viewerCircles = new Set((await ctx.db.query("circleMembers")
    .withIndex("by_user", (q) => q.eq("userId", viewerId))
    .collect()).map((membership) => membership.circleId));
  const now = Date.now();
  return grants.some((grant) =>
    grant.ownerId === item.ownerId &&
    grant.purpose === purpose &&
    grant.revokedAt === undefined &&
    (grant.expiresAt === undefined || grant.expiresAt > now) &&
    (grant.granteeUserId === viewerId || (grant.granteeCircleId !== undefined && viewerCircles.has(grant.granteeCircleId))),
  );
}

export async function recordPersonaRead(
  ctx: MutationCtx,
  viewerId: Id<"users">,
  item: Doc<"personaItems">,
  purpose: PersonaPurpose,
) {
  if (viewerId !== item.ownerId) {
    await ctx.db.insert("accessLog", { itemId: item._id, viewerId, purpose, at: Date.now() });
  }
}

/**
 * The only function future LLM features may call to read another person's persona.
 * It applies matching permissions and logs every item it returns.
 */
export async function getContextForMatching(
  ctx: MutationCtx,
  viewerId: Id<"users">,
  targetUserId: Id<"users">,
) {
  const items = await ctx.db.query("personaItems")
    .withIndex("by_owner_status", (q) => q.eq("ownerId", targetUserId).eq("status", "approved"))
    .collect();
  const visible = [];
  for (const item of items) {
    if (item.kind !== "have" || !(await canView(ctx, viewerId, item, "matching"))) continue;
    await recordPersonaRead(ctx, viewerId, item, "matching");
    visible.push({ itemId: item._id, kind: item.kind, text: item.text, tags: item.tags });
  }
  return visible;
}

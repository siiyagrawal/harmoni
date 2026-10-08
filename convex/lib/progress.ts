import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export async function awardProgress(
  ctx: MutationCtx,
  userId: Id<"users">,
  xp: number,
  badgeId?: string,
) {
  const progress = await ctx.db
    .query("userProgress")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const alreadyAwarded = badgeId !== undefined && progress?.awardedBadges.includes(badgeId);
  if (alreadyAwarded) return progress;
  const awardedBadges = badgeId && progress
    ? [...progress.awardedBadges, badgeId]
    : badgeId
      ? [badgeId]
      : progress?.awardedBadges ?? [];
  const nextXp = (progress?.xp ?? 0) + xp;
  if (progress) {
    await ctx.db.patch(progress._id, { xp: nextXp, awardedBadges });
    return { ...progress, xp: nextXp, awardedBadges };
  }
  const progressId = await ctx.db.insert("userProgress", { userId, xp: nextXp, awardedBadges });
  return ctx.db.get(progressId);
}

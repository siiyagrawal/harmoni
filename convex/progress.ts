import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireDemoUser } from "./lib/demoAuthHelper";

export const mine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const progress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    return progress ?? { xp: 0, awardedBadges: [] };
  },
});

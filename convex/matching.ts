import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireDemoUser } from "./lib/demoAuthHelper";
import { getContextForMatching } from "./lib/permissions";

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "i", "in", "into", "is", "it",
  "me", "my", "of", "on", "or", "our", "the", "to", "we", "with", "you", "your",
]);

function stem(word: string) {
  if (word.length > 6 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 5 && word.endsWith("ers")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

function tokens(text: string) {
  return new Set(text.toLowerCase().match(/[a-z0-9]+/g)?.map(stem).filter((word) => word.length > 1 && !STOP_WORDS.has(word)) ?? []);
}

function overlapScore(wantText: string, wantTags: string[], haveText: string, haveTags: string[]) {
  const wantWords = tokens(wantText);
  const haveWords = tokens(haveText);
  const keywordOverlap = [...wantWords].filter((word) => haveWords.has(word)).length;
  const wantTagSet = tokens(wantTags.join(" "));
  const haveTagSet = tokens(haveTags.join(" "));
  const tagOverlap = [...wantTagSet].filter((word) => haveTagSet.has(word)).length;
  return tagOverlap * 2 + keywordOverlap;
}

function safeReason(name: string, text: string) {
  const phrase = text.replace(/\s+/g, " ").trim().slice(0, 96);
  return name + " can help with: " + phrase;
}

type MatchCandidate = {
  targetUserId: Id<"users">;
  targetName: string;
  wantItemId: Id<"personaItems">;
  haveItemId: Id<"personaItems">;
  reason: string;
  score: number;
};

export const refresh = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const viewer = await requireDemoUser(ctx, sessionToken);
    const previous = (await Promise.all(["new", "requested", "dismissed"].map((status) =>
      ctx.db.query("matchSuggestions")
        .withIndex("by_user_status", (q) => q.eq("userId", viewer._id).eq("status", status as "new" | "requested" | "dismissed"))
        .collect(),
    ))).flat();
    const dismissedPairs = new Set(previous.filter((item) => item.status === "dismissed")
      .map((item) => String(item.wantItemId) + ":" + String(item.haveItemId)));
    const replaceable = previous.filter((item) => item.status !== "dismissed");
    await Promise.all(replaceable.map((item) => ctx.db.delete(item._id)));

    const wants = await ctx.db.query("personaItems")
      .withIndex("by_owner_status", (q) => q.eq("ownerId", viewer._id).eq("status", "approved"))
      .collect();
    const approvedWants = wants.filter((item) => item.kind === "want");
    if (!approvedWants.length) return [];

    const users = await ctx.db.query("users").collect();
    const candidates: MatchCandidate[] = [];
    for (const target of users) {
      if (target._id === viewer._id) continue;
      const targetHaves = await getContextForMatching(ctx, viewer._id, target._id);
      if (!targetHaves.length) continue;
      const targetCard = await ctx.db.query("cards")
        .withIndex("by_owner_primary", (q) => q.eq("ownerId", target._id).eq("isPrimary", true))
        .first();
      const targetName = targetCard?.status === "published" ? targetCard.fullName : "A Harmoni member";
      for (const want of approvedWants) {
        for (const have of targetHaves) {
          const score = overlapScore(want.text, want.tags, have.text, have.tags);
          const pair = String(want._id) + ":" + String(have.itemId);
          if (score <= 0 || dismissedPairs.has(pair)) continue;
          candidates.push({
            targetUserId: target._id,
            targetName,
            wantItemId: want._id,
            haveItemId: have.itemId,
            reason: safeReason(targetName, have.text),
            score,
          });
        }
      }
    }

    candidates.sort((left, right) => right.score - left.score);
    const now = Date.now();
    const created = await Promise.all(candidates.slice(0, 40).map(async (candidate) => {
      const { targetName, ...suggestion } = candidate;
      const suggestionId = await ctx.db.insert("matchSuggestions", {
        userId: viewer._id,
        ...suggestion,
        status: "new",
        createdAt: now,
      });
      return {
        _id: suggestionId,
        targetUserId: candidate.targetUserId,
        targetName,
        reason: candidate.reason,
        score: candidate.score,
        wantItemId: candidate.wantItemId,
        haveItemId: candidate.haveItemId,
      };
    }));
    return created;
  },
});

export const dismiss = mutation({
  args: { sessionToken: v.string(), suggestionId: v.id("matchSuggestions") },
  handler: async (ctx, { sessionToken, suggestionId }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const suggestion = await ctx.db.get(suggestionId);
    if (!suggestion || suggestion.userId !== user._id) throw new Error("Match suggestion not found.");
    await ctx.db.patch(suggestionId, { status: "dismissed" });
  },
});

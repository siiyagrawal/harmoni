import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireDemoUser } from "./lib/demoAuthHelper";
import { ensureCircleMembership, primaryPublishedCard, upsertContactFromCard } from "./lib/networking";
import { getContextForMatching } from "./lib/permissions";
import { normalizeSlug } from "./lib/slugs";

type SeedPerson = {
  key: string;
  name: string;
  title: string;
  company: string;
  have: string;
  tags: string[];
};

const PEOPLE: SeedPerson[] = [
  { key: "maya", name: "Maya Chen", title: "Investor relations", company: "Northstar Ventures", have: "Seed fundraising introductions", tags: ["seed", "fundraising", "investors"] },
  { key: "luca", name: "Luca Patel", title: "Engineering lead", company: "Goodwork", have: "Hiring early engineering teams", tags: ["hiring", "engineering"] },
  { key: "anika", name: "Anika Rao", title: "Product designer", company: "Studio Field", have: "Product design for early teams", tags: ["product", "design"] },
];

async function uniqueSeedSlug(ctx: MutationCtx, baseName: string, ownerId: Id<"users">) {
  const base = normalizeSlug(baseName) || "member";
  let candidate = base;
  let suffix = 1;
  while (await ctx.db.query("cards").withIndex("by_slug", (q) => q.eq("slug", candidate)).unique()) {
    candidate = base + "-" + String(ownerId).slice(-5) + (suffix === 1 ? "" : "-" + suffix);
    suffix += 1;
  }
  return candidate;
}

async function seedPerson(ctx: MutationCtx, person: SeedPerson, currentUserId: Id<"users">) {
  const authSubject = "harmoni-demo-seed-" + person.key;
  let user = await ctx.db.query("users")
    .withIndex("by_auth_subject", (q) => q.eq("authSubject", authSubject)).first();
  const now = Date.now();
  if (!user) {
    const userId = await ctx.db.insert("users", { authSubject, fullName: person.name, createdAt: now, updatedAt: now });
    user = await ctx.db.get(userId);
  }
  if (!user) throw new Error("Demo user could not be created.");

  let card = await ctx.db.query("cards")
    .withIndex("by_owner_primary", (q) => q.eq("ownerId", user._id).eq("isPrimary", true)).first();
  if (card && card.status !== "published") {
    await ctx.db.patch(card._id, {
      fullName: person.name,
      jobTitle: person.title,
      company: person.company,
      status: "published",
      updatedAt: now,
    });
    card = await ctx.db.get(card._id);
  }
  if (!card) {
    const slug = await uniqueSeedSlug(ctx, person.name, user._id);
    const cardId = await ctx.db.insert("cards", {
      ownerId: user._id,
      slug,
      fullName: person.name,
      jobTitle: person.title,
      company: person.company,
      fields: [],
      theme: { style: "0", accentColor: "#1d5647", backgroundColor: "#f8f7f2", textColor: "#18352e" },
      status: "published",
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    });
    card = await ctx.db.get(cardId);
  }
  if (!card) throw new Error("Demo card could not be created.");

  await ensureCircleMembership(ctx, user._id, user._id);
  await ensureCircleMembership(ctx, user._id, currentUserId);
  await ensureCircleMembership(ctx, currentUserId, currentUserId);
  await ensureCircleMembership(ctx, currentUserId, user._id);

  const visibleHaves = await getContextForMatching(ctx, currentUserId, user._id);
  if (!visibleHaves.some((item) => item.text === person.have)) {
    await ctx.db.insert("personaItems", {
      ownerId: user._id,
      kind: "have",
      text: person.have,
      tags: person.tags,
      visibility: "circle",
      status: "approved",
      source: "user",
      createdAt: now,
      updatedAt: now,
    });
  }

  const currentCard = await primaryPublishedCard(ctx, currentUserId);
  await upsertContactFromCard(ctx, currentUserId, card, "received_card");
  if (currentCard) {
    await upsertContactFromCard(ctx, user._id, currentCard, "received_card");
    const outgoing = await ctx.db.query("exchanges").withIndex("by_from", (q) => q.eq("fromUserId", user._id)).collect();
    if (!outgoing.some((exchange) => exchange.toUserId === currentUserId && exchange.status === "accepted")) {
      await ctx.db.insert("exchanges", {
        fromUserId: user._id,
        toUserId: currentUserId,
        fromCardId: card._id,
        toCardId: currentCard._id,
        status: "accepted",
        createdAt: now,
        acceptedAt: now,
      });
    }
  }
  return user._id;
}

export const seedDemoData = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireDemoUser(ctx, sessionToken);
    const previousRun = await ctx.db.query("demoSeedRuns")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id)).unique();
    if (previousRun) return { alreadyLoaded: true, userCount: PEOPLE.length };

    const seededUserIds = await Promise.all(PEOPLE.map((person) => seedPerson(ctx, person, user._id)));
    const existingItems = (await Promise.all(["draft", "approved", "archived"].map((status) =>
      ctx.db.query("personaItems")
        .withIndex("by_owner_status", (q) => q.eq("ownerId", user._id).eq("status", status as "draft" | "approved" | "archived"))
        .collect(),
    ))).flat();
    if (!existingItems.some((item) => item.kind === "want" && item.text.toLowerCase() === "seed fundraising connections")) {
      const now = Date.now();
      await ctx.db.insert("personaItems", {
        ownerId: user._id,
        kind: "want",
        text: "Seed fundraising connections",
        tags: ["seed", "fundraising"],
        visibility: "circle",
        status: "approved",
        source: "user",
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.insert("demoSeedRuns", { ownerId: user._id, createdAt: Date.now() });
    return { alreadyLoaded: false, userCount: seededUserIds.length };
  },
});

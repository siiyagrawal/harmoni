import { paginationOptsValidator } from "convex/server";
import { internalMutation } from "./_generated/server";
import { hashSessionToken } from "./lib/session";

function appendLegacyField(
  fields: Array<{
    label: string;
    value: string;
    kind: string;
    visible: boolean;
    order: number;
    abbreviation?: string;
    color?: string;
  }>,
  field: {
    label: string;
    value: string;
    kind: string;
    visible: boolean;
    order: number;
  },
) {
  const value = field.value.trim();
  if (!value || fields.some((current) => current.kind === field.kind && current.value === value)) {
    return;
  }
  fields.push({ ...field, value, order: fields.length });
}

export const backfillLegacyData = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("cards").order("asc").paginate(paginationOpts);
    let cardsMigrated = 0;
    let personaItemsCreated = 0;
    let circlesCreated = 0;
    const now = Date.now();

    for (const card of page.page) {
      if (card.legacyMigratedAt !== undefined) continue;

      const fields = [...card.fields];
      appendLegacyField(fields, {
        label: "Email",
        value: card.email ?? "",
        kind: "email",
        visible: true,
        order: fields.length,
      });
      appendLegacyField(fields, {
        label: "Phone",
        value: card.phone ?? "",
        kind: "phone",
        visible: true,
        order: fields.length,
      });
      appendLegacyField(fields, {
        label: "Website",
        value: card.website ?? "",
        kind: "web",
        visible: true,
        order: fields.length,
      });

      for (const link of card.links ?? []) {
        appendLegacyField(fields, {
          label: link.label,
          value: link.url,
          kind: link.kind || "web",
          visible: link.visible,
          order: link.order,
        });
      }

      await ctx.db.patch(card._id, {
        fields,
        email: undefined,
        phone: undefined,
        website: undefined,
        links: undefined,
        circle: undefined,
        wants: undefined,
        haves: undefined,
        legacyMigratedAt: now,
      });

      let circle = await ctx.db
        .query("circles")
        .withIndex("by_owner", (q) => q.eq("ownerId", card.ownerId))
        .first();
      const legacyCircleName = card.circle?.trim();
      if (!circle) {
        const circleId = await ctx.db.insert("circles", {
          ownerId: card.ownerId,
          name: legacyCircleName || "My Circle",
          createdAt: now,
        });
        circle = await ctx.db.get(circleId);
        circlesCreated += 1;
      } else if (legacyCircleName && circle.name === "My Circle") {
        await ctx.db.patch(circle._id, { name: legacyCircleName });
      }

      if (circle) {
        const membership = await ctx.db
          .query("circleMembers")
          .withIndex("by_circle_user", (q) =>
            q.eq("circleId", circle._id).eq("userId", card.ownerId),
          )
          .unique();
        if (!membership) {
          await ctx.db.insert("circleMembers", {
            circleId: circle._id,
            userId: card.ownerId,
            joinedAt: now,
          });
        }
      }

      for (const text of card.wants ?? []) {
        const trimmed = text.trim();
        if (!trimmed) continue;
        await ctx.db.insert("personaItems", {
          ownerId: card.ownerId,
          kind: "want",
          text: trimmed,
          tags: [],
          visibility: "circle",
          status: "approved",
          source: "user",
          createdAt: now,
          updatedAt: now,
        });
        personaItemsCreated += 1;
      }
      for (const text of card.haves ?? []) {
        const trimmed = text.trim();
        if (!trimmed) continue;
        await ctx.db.insert("personaItems", {
          ownerId: card.ownerId,
          kind: "have",
          text: trimmed,
          tags: [],
          visibility: "circle",
          status: "approved",
          source: "user",
          createdAt: now,
          updatedAt: now,
        });
        personaItemsCreated += 1;
      }
      cardsMigrated += 1;
    }

    return {
      cardsMigrated,
      personaItemsCreated,
      circlesCreated,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

export const backfillContactSnapshots = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("contacts").order("asc").paginate(paginationOpts);
    let contactsMigrated = 0;

    for (const contact of page.page) {
      if (contact.snapshot) continue;
      const fields = [
        ...(contact.email
          ? [{ label: "Email", value: contact.email, kind: "email", visible: true, order: 0 }]
          : []),
        ...(contact.phone
          ? [{ label: "Phone", value: contact.phone, kind: "phone", visible: true, order: 1 }]
          : []),
        ...(contact.website
          ? [{ label: "Website", value: contact.website, kind: "web", visible: true, order: 2 }]
          : []),
      ];
      await ctx.db.patch(contact._id, {
        snapshot: {
          fullName: contact.fullName ?? "Contact",
          ...(contact.jobTitle ? { jobTitle: contact.jobTitle } : {}),
          ...(contact.company ? { company: contact.company } : {}),
          fields,
        },
      });
      contactsMigrated += 1;
    }

    return {
      contactsMigrated,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

export const clearLegacyCardFields = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("cards").order("asc").paginate(paginationOpts);
    let cardsCleaned = 0;
    for (const card of page.page) {
      if (card.legacyMigratedAt === undefined) continue;
      if (
        card.email === undefined && card.phone === undefined && card.website === undefined &&
        card.links === undefined && card.circle === undefined && card.wants === undefined &&
        card.haves === undefined
      ) continue;
      await ctx.db.patch(card._id, {
        email: undefined,
        phone: undefined,
        website: undefined,
        links: undefined,
        circle: undefined,
        wants: undefined,
        haves: undefined,
      });
      cardsCleaned += 1;
    }
    return {
      cardsCleaned,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

export const clearLegacyContactFields = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("contacts").order("asc").paginate(paginationOpts);
    let contactsCleaned = 0;
    for (const contact of page.page) {
      if (!contact.snapshot) continue;
      if (
        contact.fullName === undefined && contact.jobTitle === undefined && contact.company === undefined &&
        contact.email === undefined && contact.phone === undefined && contact.website === undefined
      ) continue;
      await ctx.db.patch(contact._id, {
        fullName: undefined,
        jobTitle: undefined,
        company: undefined,
        email: undefined,
        phone: undefined,
        website: undefined,
      });
      contactsCleaned += 1;
    }
    return {
      contactsCleaned,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

export const backfillIntroducedBy = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("introRequests").order("asc").paginate(paginationOpts);
    let contactsMigrated = 0;
    for (const request of page.page) {
      if (request.status !== "approved") continue;
      const [requesterContact, targetContact] = await Promise.all([
        ctx.db.query("contacts")
          .withIndex("by_owner_linked_user", (q) => q.eq("ownerId", request.requesterId).eq("linkedUserId", request.targetUserId))
          .unique(),
        ctx.db.query("contacts")
          .withIndex("by_owner_linked_user", (q) => q.eq("ownerId", request.targetUserId).eq("linkedUserId", request.requesterId))
          .unique(),
      ]);
      for (const contact of [requesterContact, targetContact]) {
        if (contact?.source === "introduced" && contact.introducedById === undefined) {
          await ctx.db.patch(contact._id, { introducedById: request.introducerId });
          contactsMigrated += 1;
        }
      }
    }
    return { contactsMigrated, isDone: page.isDone, continueCursor: page.continueCursor };
  },
});

export const hashLegacySessions = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const page = await ctx.db.query("demoSessions").order("asc").paginate(paginationOpts);
    let sessionsMigrated = 0;
    for (const session of page.page) {
      if (session.tokenHash || !session.token) continue;
      await ctx.db.patch(session._id, {
        tokenHash: await hashSessionToken(session.token),
        token: undefined,
      });
      sessionsMigrated += 1;
    }
    return {
      sessionsMigrated,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

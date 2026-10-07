import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const cardLink = v.object({
  label: v.string(),
  url: v.string(),
  kind: v.string(),
  visible: v.boolean(),
  order: v.number(),
});

const cardField = v.object({
  label: v.string(),
  value: v.string(),
  kind: v.string(),
  visible: v.boolean(),
  order: v.number(),
});

const contactNote = v.object({
  id: v.string(),
  body: v.string(),
  createdAt: v.number(),
});

export default defineSchema({
  users: defineTable({
    authSubject: v.string(),
    email: v.optional(v.string()),
    fullName: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_auth_subject", ["authSubject"]),

  cards: defineTable({
    ownerId: v.id("users"),
    slug: v.string(),
    fullName: v.string(),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    headline: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    coverStorageId: v.optional(v.id("_storage")),
    links: v.array(cardLink),
    fields: v.array(cardField),
    theme: v.object({
      style: v.string(),
      accentColor: v.string(),
      backgroundColor: v.string(),
      textColor: v.string(),
    }),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
    isPrimary: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_primary", ["ownerId", "isPrimary"])
    .index("by_slug", ["slug"]),

  contacts: defineTable({
    ownerId: v.id("users"),
    linkedUserId: v.optional(v.id("users")),
    linkedCardId: v.optional(v.id("cards")),
    source: v.union(
      v.literal("received_card"),
      v.literal("manual"),
      v.literal("lead_capture"),
      v.literal("import"),
    ),
    fullName: v.string(),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    tags: v.array(v.string()),
    notes: v.array(contactNote),
    metAt: v.optional(v.number()),
    metLocation: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_created_at", ["ownerId", "createdAt"])
    .index("by_owner_card", ["ownerId", "linkedCardId"])
    .index("by_owner_linked_user", ["ownerId", "linkedUserId"])
    .index("by_owner_email", ["ownerId", "email"]),
});

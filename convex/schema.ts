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
  abbreviation: v.optional(v.string()),
  color: v.optional(v.string()),
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
    authSubject: v.optional(v.string()),
    demoUsername: v.optional(v.string()),
    email: v.optional(v.string()),
    fullName: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_subject", ["authSubject"]),

  demoAccounts: defineTable({
    userId: v.id("users"),
    username: v.string(),
    passwordSalt: v.string(),
    passwordHash: v.string(),
    createdAt: v.number(),
  })
    .index("by_username", ["username"])
    .index("by_user", ["userId"]),

  demoSessions: defineTable({
    token: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

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
    logoStorageId: v.optional(v.id("_storage")),
    logoMode: v.optional(v.union(v.literal("auto"), v.literal("image"))),
    squarePhoto: v.optional(v.boolean()),
    circle: v.optional(v.string()),
    wants: v.optional(v.array(v.string())),
    haves: v.optional(v.array(v.string())),
    qrOnBack: v.optional(v.boolean()),
    includeMeetingPlace: v.optional(v.boolean()),
    profileVersion: v.optional(v.number()),
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
    .index("by_owner_email", ["ownerId", "email"])
    .index("by_linked_card", ["linkedCardId"])
    .index("by_linked_user", ["linkedUserId"]),
});

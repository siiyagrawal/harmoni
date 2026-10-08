import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const cardField = v.object({
  label: v.string(),
  value: v.string(),
  kind: v.string(),
  abbreviation: v.optional(v.string()),
  color: v.optional(v.string()),
  visible: v.boolean(),
  order: v.number(),
});

const cardTheme = v.object({
  style: v.string(),
  accentColor: v.string(),
  backgroundColor: v.string(),
  textColor: v.string(),
});

const contactNote = v.object({
  id: v.string(),
  body: v.string(),
  createdAt: v.number(),
});

const contactSnapshot = v.object({
  fullName: v.string(),
  jobTitle: v.optional(v.string()),
  company: v.optional(v.string()),
  headline: v.optional(v.string()),
  fields: v.array(cardField),
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
  }).index("by_auth_subject", ["authSubject"]),

  // Demo credentials stay separate from profile data so the auth layer can be replaced.
  demoAccounts: defineTable({
    userId: v.id("users"),
    username: v.string(),
    passwordSalt: v.string(),
    passwordHash: v.string(),
    createdAt: v.number(),
  })
    .index("by_username", ["username"])
    .index("by_user", ["userId"]),

  // `token` is a temporary migration field. Remove it after `migrations.hashSessions`.
  demoSessions: defineTable({
    tokenHash: v.optional(v.string()),
    token: v.optional(v.string()),
    userId: v.id("users"),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  demoPasswordResets: defineTable({
    userId: v.id("users"),
    codeHash: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_code_hash", ["codeHash"])
    .index("by_user", ["userId"]),

  demoLoginAttempts: defineTable({
    username: v.string(),
    count: v.number(),
    windowStartedAt: v.number(),
    lockedUntil: v.optional(v.number()),
  }).index("by_username", ["username"]),

  demoSeedRuns: defineTable({
    ownerId: v.id("users"),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  cards: defineTable({
    ownerId: v.id("users"),
    slug: v.string(),
    fullName: v.string(),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    headline: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    coverStorageId: v.optional(v.id("_storage")),
    logoStorageId: v.optional(v.id("_storage")),
    logoMode: v.optional(v.union(v.literal("auto"), v.literal("image"))),
    squarePhoto: v.optional(v.boolean()),
    qrOnBack: v.optional(v.boolean()),
    includeMeetingPlace: v.optional(v.boolean()),
    fields: v.array(cardField),
    theme: cardTheme,
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
    isPrimary: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Temporary compatibility fields. `migrations.backfillLegacyData` copies these
    // into `fields`, `circles`, and `personaItems`; remove them after it completes.
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    links: v.optional(v.array(v.object({
      label: v.string(),
      url: v.string(),
      kind: v.string(),
      visible: v.boolean(),
      order: v.number(),
    }))),
    circle: v.optional(v.string()),
    wants: v.optional(v.array(v.string())),
    haves: v.optional(v.array(v.string())),
    profileVersion: v.optional(v.number()),
    legacyMigratedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_primary", ["ownerId", "isPrimary"])
    .index("by_slug", ["slug"]),

  cardUploads: defineTable({
    ownerId: v.id("users"),
    storageId: v.id("_storage"),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_storage", ["storageId"]),

  contacts: defineTable({
    ownerId: v.id("users"),
    linkedUserId: v.optional(v.id("users")),
    linkedCardId: v.optional(v.id("cards")),
    introducedById: v.optional(v.id("users")),
    source: v.union(
      v.literal("received_card"),
      v.literal("manual"),
      v.literal("lead_capture"),
      v.literal("import"),
      v.literal("introduced"),
    ),
    snapshot: v.optional(contactSnapshot),
    tags: v.array(v.string()),
    notes: v.array(contactNote),
    metAt: v.optional(v.number()),
    metLocation: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Temporary compatibility fields. The backfill creates `snapshot` before these
    // fields are removed from the schema.
    fullName: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
  })
    .index("by_owner_created_at", ["ownerId", "createdAt"])
    .index("by_owner_card", ["ownerId", "linkedCardId"])
    .index("by_owner_linked_user", ["ownerId", "linkedUserId"])
    .index("by_owner_email", ["ownerId", "email"])
    .index("by_linked_card", ["linkedCardId"])
    .index("by_linked_user", ["linkedUserId"]),

  circles: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  circleMembers: defineTable({
    circleId: v.id("circles"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_circle", ["circleId"])
    .index("by_user", ["userId"])
    .index("by_circle_user", ["circleId", "userId"]),

  exchanges: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    fromCardId: v.id("cards"),
    toCardId: v.optional(v.id("cards")),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
    ),
    metLocation: v.optional(v.string()),
    metAt: v.optional(v.number()),
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_to_status", ["toUserId", "status"])
    .index("by_from", ["fromUserId"]),

  introRequests: defineTable({
    requesterId: v.id("users"),
    introducerId: v.id("users"),
    targetUserId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
    ),
    createdAt: v.number(),
    decidedAt: v.optional(v.number()),
  })
    .index("by_introducer_status", ["introducerId", "status"])
    .index("by_requester", ["requesterId"]),

  userProgress: defineTable({
    userId: v.id("users"),
    xp: v.number(),
    awardedBadges: v.array(v.string()),
  }).index("by_user", ["userId"]),

  personaItems: defineTable({
    ownerId: v.id("users"),
    kind: v.union(
      v.literal("want"),
      v.literal("have"),
      v.literal("expertise"),
      v.literal("interest"),
      v.literal("goal"),
    ),
    text: v.string(),
    tags: v.array(v.string()),
    visibility: v.union(
      v.literal("private"),
      v.literal("connections"),
      v.literal("circle"),
      v.literal("custom"),
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("approved"),
      v.literal("archived"),
    ),
    source: v.union(v.literal("user"), v.literal("suggested")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner_status", ["ownerId", "status"]),

  personaGrants: defineTable({
    ownerId: v.id("users"),
    itemId: v.id("personaItems"),
    granteeUserId: v.optional(v.id("users")),
    granteeCircleId: v.optional(v.id("circles")),
    purpose: v.union(
      v.literal("matching"),
      v.literal("intro"),
      v.literal("view"),
    ),
    expiresAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_item", ["itemId"])
    .index("by_grantee_user", ["granteeUserId"]),

  matchSuggestions: defineTable({
    userId: v.id("users"),
    targetUserId: v.id("users"),
    wantItemId: v.id("personaItems"),
    haveItemId: v.id("personaItems"),
    reason: v.string(),
    score: v.number(),
    status: v.union(
      v.literal("new"),
      v.literal("requested"),
      v.literal("dismissed"),
    ),
    createdAt: v.number(),
  }).index("by_user_status", ["userId", "status"]),

  accessLog: defineTable({
    itemId: v.id("personaItems"),
    viewerId: v.id("users"),
    purpose: v.string(),
    at: v.number(),
  }).index("by_item", ["itemId"]),
});

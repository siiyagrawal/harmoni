import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

const PERSONA_STATUSES = ["draft", "approved", "archived"] as const;
const EXCHANGE_STATUSES = ["pending", "accepted", "declined"] as const;

export async function deleteDemoUserData(
  ctx: MutationCtx,
  user: Doc<"users">,
  deleteAuth: boolean,
) {
  const [cards, uploads, seedRuns, ownedContacts, linkedUserContacts, memberships, ownedCircles, sessions, accounts, progress, resets] = await Promise.all([
    ctx.db.query("cards").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect(),
    ctx.db.query("cardUploads").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect(),
    ctx.db.query("demoSeedRuns").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect(),
    ctx.db.query("contacts").withIndex("by_owner_created_at", (q) => q.eq("ownerId", user._id)).collect(),
    ctx.db.query("contacts").withIndex("by_linked_user", (q) => q.eq("linkedUserId", user._id)).collect(),
    ctx.db.query("circleMembers").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
    ctx.db.query("circles").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect(),
    ctx.db.query("demoSessions").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
    ctx.db.query("demoAccounts").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
    ctx.db.query("userProgress").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
    ctx.db.query("demoPasswordResets").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
  ]);

  const personaItems = (await Promise.all(
    PERSONA_STATUSES.map((status) =>
      ctx.db.query("personaItems")
        .withIndex("by_owner_status", (q) => q.eq("ownerId", user._id).eq("status", status))
        .collect(),
    ),
  )).flat();
  const itemIds = new Set(personaItems.map((item) => item._id));
  const circleIds = new Set(ownedCircles.map((circle) => circle._id));
  const [allGrants, allAccessLogs, allSuggestions, allIntroRequests, allExchanges, cardsContacts] = await Promise.all([
    ctx.db.query("personaGrants").collect(),
    ctx.db.query("accessLog").collect(),
    ctx.db.query("matchSuggestions").collect(),
    ctx.db.query("introRequests").collect(),
    Promise.all([
      ctx.db.query("exchanges").withIndex("by_from", (q) => q.eq("fromUserId", user._id)).collect(),
      ...EXCHANGE_STATUSES.map((status) =>
        ctx.db.query("exchanges").withIndex("by_to_status", (q) => q.eq("toUserId", user._id).eq("status", status)).collect(),
      ),
    ]).then((groups) => groups.flat()),
    Promise.all(cards.map((card) =>
      ctx.db.query("contacts").withIndex("by_linked_card", (q) => q.eq("linkedCardId", card._id)).collect(),
    )).then((groups) => groups.flat()),
  ]);

  const contactsToUnlink = new Map<string, Doc<"contacts">>();
  for (const contact of [...linkedUserContacts, ...cardsContacts]) {
    if (contact.ownerId !== user._id) contactsToUnlink.set(contact._id, contact);
  }

  const exchangeIds = new Set(allExchanges.map((exchange) => exchange._id));
  const introRequests = allIntroRequests.filter((request) =>
    request.requesterId === user._id || request.introducerId === user._id || request.targetUserId === user._id,
  );
  const grants = allGrants.filter((grant) =>
    grant.ownerId === user._id || grant.granteeUserId === user._id ||
    itemIds.has(grant.itemId) || (grant.granteeCircleId !== undefined && circleIds.has(grant.granteeCircleId)),
  );
  const suggestions = allSuggestions.filter((suggestion) =>
    suggestion.userId === user._id || suggestion.targetUserId === user._id ||
    itemIds.has(suggestion.wantItemId) || itemIds.has(suggestion.haveItemId),
  );
  const accessLogs = allAccessLogs.filter((entry) =>
    entry.viewerId === user._id || itemIds.has(entry.itemId),
  );
  const circleMemberships = await Promise.all([...circleIds].map((circleId) =>
    ctx.db.query("circleMembers").withIndex("by_circle", (q) => q.eq("circleId", circleId)).collect(),
  ));
  const membershipsToDelete = new Map(memberships.map((membership) => [membership._id, membership]));
  for (const membership of circleMemberships.flat()) membershipsToDelete.set(membership._id, membership);
  const usernameAttempts = user.demoUsername
    ? await ctx.db.query("demoLoginAttempts").withIndex("by_username", (q) => q.eq("username", user.demoUsername!)).collect()
    : [];

  await Promise.all([
    ...[...contactsToUnlink.values()].map((contact) =>
      ctx.db.patch(contact._id, { linkedUserId: undefined, linkedCardId: undefined, updatedAt: Date.now() }),
    ),
    ...ownedContacts.map((contact) => ctx.db.delete(contact._id)),
    ...cards.map((card) => ctx.db.delete(card._id)),
    ...uploads.map((upload) => ctx.db.delete(upload._id)),
    ...seedRuns.map((seedRun) => ctx.db.delete(seedRun._id)),
    ...[...exchangeIds].map((id) => ctx.db.delete(id)),
    ...introRequests.map((request) => ctx.db.delete(request._id)),
    ...suggestions.map((suggestion) => ctx.db.delete(suggestion._id)),
    ...accessLogs.map((entry) => ctx.db.delete(entry._id)),
    ...grants.map((grant) => ctx.db.delete(grant._id)),
    ...personaItems.map((item) => ctx.db.delete(item._id)),
    ...progress.map((item) => ctx.db.delete(item._id)),
    ...[...membershipsToDelete.values()].map((membership) => ctx.db.delete(membership._id)),
    ...ownedCircles.map((circle) => ctx.db.delete(circle._id)),
    ...resets.map((reset) => ctx.db.delete(reset._id)),
    ...sessions.map((session) => ctx.db.delete(session._id)),
    ...usernameAttempts.map((attempt) => ctx.db.delete(attempt._id)),
    ...(deleteAuth ? accounts.map((account) => ctx.db.delete(account._id)) : []),
  ]);

  const storageIds = new Set<Id<"_storage">>([
    user.avatarStorageId,
    ...uploads.map((upload) => upload.storageId),
    ...cards.flatMap((card) => [card.photoStorageId, card.coverStorageId, card.logoStorageId]),
  ].filter((storageId): storageId is Id<"_storage"> => storageId !== undefined));
  await Promise.all([...storageIds].map((storageId) => ctx.storage.delete(storageId)));
  if (deleteAuth) await ctx.db.delete(user._id);
}

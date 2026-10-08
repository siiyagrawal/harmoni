import { describe, expect, it } from "vitest";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { getCircleNetwork, requireCircleMemberForIntro, withCanRequestIntros } from "./circleAccess";

type TestRow = Record<string, unknown>;
type TestData = {
  circles: TestRow[];
  circleMembers: TestRow[];
  users: TestRow[];
  cards: TestRow[];
};
type IndexRange = { eq: (field: string, value: unknown) => IndexRange };

function fakeContext(data: TestData) {
  const db = {
    get: async (id: unknown) => data.users.find((row) => row._id === id) ?? null,
    query: (tableName: keyof TestData) => ({
      withIndex: (_indexName: string, build: (range: IndexRange) => unknown) => {
        const filters: [string, unknown][] = [];
        const range: IndexRange = {
          eq(field, value) {
            filters.push([field, value]);
            return range;
          },
        };
        build(range);
        const rows = data[tableName].filter((row) => filters.every(([field, value]) => row[field] === value));
        return {
          first: async () => rows[0] ?? null,
          unique: async () => rows[0] ?? null,
          collect: async () => rows,
        };
      },
    }),
  };
  return { db } as unknown as QueryCtx;
}

const userId = (value: string) => value as Id<"users">;
const circleId = (value: string) => value as Id<"circles">;

function circleData(memberIds: Id<"users">[]): TestData {
  const ownerId = userId("introducer");
  const id = circleId("introducer-circle");
  return {
    circles: [{ _id: id, ownerId, name: "Introducer circle", createdAt: 1 }],
    circleMembers: memberIds.map((memberId) => ({ circleId: id, userId: memberId, joinedAt: 1 })),
    users: [ownerId, ...memberIds].map((_id) => ({ _id, fullName: "Member" })),
    cards: [],
  };
}

describe("circle intro access", () => {
  it("returns an ok network with members for a circle member", async () => {
    const requesterId = userId("requester");
    const targetId = userId("target");
    const ctx = fakeContext(circleData([userId("introducer"), requesterId, targetId]));

    const result = await getCircleNetwork(ctx, requesterId, userId("introducer"));

    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.members.map((member) => member.userId)).toEqual([targetId]);
  });

  it("returns not_member without exposing a network to a non-member", async () => {
    const ctx = fakeContext(circleData([userId("introducer"), userId("target")]));

    await expect(getCircleNetwork(ctx, userId("requester"), userId("introducer")))
      .resolves.toEqual({ status: "not_member" });
  });

  it("marks exchange-connected contacts as requestable and introduced contacts as not requestable", async () => {
    const requesterId = userId("requester");
    const ctx = fakeContext(circleData([userId("introducer"), requesterId]));

    const exchangeContact = await withCanRequestIntros(ctx, requesterId, {
      linkedUserId: userId("introducer"),
      source: "received_card",
    });
    const introducedContact = await withCanRequestIntros(ctx, requesterId, {
      linkedUserId: userId("introduced-target"),
      source: "introduced",
    });

    expect(exchangeContact.canRequestIntros).toBe(true);
    expect(introducedContact.canRequestIntros).toBe(false);
  });

  it("rejects intro requests unless the requester belongs to the introducer's circle", async () => {
    const ctx = fakeContext(circleData([userId("introducer")]));

    await expect(requireCircleMemberForIntro(ctx as MutationCtx, userId("requester"), userId("introducer")))
      .rejects.toThrow("Exchange and accept cards");
  });
});

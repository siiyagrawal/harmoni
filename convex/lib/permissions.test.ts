import { describe, expect, it } from "vitest";
import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { canView } from "./permissions";

type TestRow = Record<string, unknown>;
type TestData = {
  contacts: TestRow[];
  circleMembers: TestRow[];
  personaGrants: TestRow[];
};
type IndexRange = { eq: (field: string, value: unknown) => IndexRange };

function fakeContext(data: TestData) {
  const query = (tableName: keyof TestData) => ({
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
        unique: async () => rows[0] ?? null,
        collect: async () => rows,
      };
    },
  });
  return { db: { query } } as unknown as QueryCtx;
}

const userId = (value: string) => value as Id<"users">;
const circleId = (value: string) => value as Id<"circles">;
const itemId = (value: string) => value as Id<"personaItems">;

function item(visibility: Doc<"personaItems">["visibility"], status: Doc<"personaItems">["status"] = "approved") {
  return {
    _id: itemId("item-1"),
    _creationTime: 1,
    ownerId: userId("owner"),
    kind: "have" as const,
    text: "Seed fundraising introductions",
    tags: ["fundraising"],
    visibility,
    status,
    source: "user" as const,
    createdAt: 1,
    updatedAt: 1,
  } as Doc<"personaItems">;
}

function emptyData(): TestData {
  return { contacts: [], circleMembers: [], personaGrants: [] };
}

describe("canView persona permissions", () => {
  it("always allows the owner, including drafts and archived items", async () => {
    const ctx = fakeContext(emptyData());
    expect(await canView(ctx, userId("owner"), item("private", "draft"), "view")).toBe(true);
    expect(await canView(ctx, userId("owner"), item("private", "archived"), "matching")).toBe(true);
  });

  it("keeps private items hidden from other users", async () => {
    expect(await canView(fakeContext(emptyData()), userId("viewer"), item("private"), "view")).toBe(false);
  });

  it("requires contacts in both directions for connections visibility", async () => {
    const oneWay: TestData = {
      ...emptyData(),
      contacts: [{ ownerId: userId("viewer"), linkedUserId: userId("owner") }],
    };
    const mutual: TestData = {
      ...emptyData(),
      contacts: [
        { ownerId: userId("viewer"), linkedUserId: userId("owner") },
        { ownerId: userId("owner"), linkedUserId: userId("viewer") },
      ],
    };
    expect(await canView(fakeContext(oneWay), userId("viewer"), item("connections"), "view")).toBe(false);
    expect(await canView(fakeContext(mutual), userId("viewer"), item("connections"), "view")).toBe(true);
  });

  it("requires a shared circle for circle visibility", async () => {
    const shared: TestData = {
      ...emptyData(),
      circleMembers: [
        { circleId: circleId("shared"), userId: userId("viewer") },
        { circleId: circleId("shared"), userId: userId("owner") },
      ],
    };
    const separate: TestData = {
      ...emptyData(),
      circleMembers: [
        { circleId: circleId("viewer-circle"), userId: userId("viewer") },
        { circleId: circleId("owner-circle"), userId: userId("owner") },
      ],
    };
    expect(await canView(fakeContext(shared), userId("viewer"), item("circle"), "view")).toBe(true);
    expect(await canView(fakeContext(separate), userId("viewer"), item("circle"), "view")).toBe(false);
  });

  it("requires a matching, live, non-revoked custom grant for the requested purpose", async () => {
    const valid: TestData = {
      ...emptyData(),
      personaGrants: [{
        _id: "grant-1",
        itemId: itemId("item-1"),
        ownerId: userId("owner"),
        granteeUserId: userId("viewer"),
        purpose: "matching",
        expiresAt: Date.now() + 60_000,
      }],
    };
    const revoked: TestData = {
      ...valid,
      personaGrants: [{ ...valid.personaGrants[0], revokedAt: Date.now() }],
    };
    const expired: TestData = {
      ...valid,
      personaGrants: [{ ...valid.personaGrants[0], expiresAt: Date.now() - 1 }],
    };
    expect(await canView(fakeContext(valid), userId("viewer"), item("custom"), "matching")).toBe(true);
    expect(await canView(fakeContext(valid), userId("viewer"), item("custom"), "intro")).toBe(false);
    expect(await canView(fakeContext(revoked), userId("viewer"), item("custom"), "matching")).toBe(false);
    expect(await canView(fakeContext(expired), userId("viewer"), item("custom"), "matching")).toBe(false);
  });

  it.each(["private", "connections", "circle", "custom"] as const)(
    "denies non-owners when an item is %s or archived",
    async (visibility) => {
      const ctx = fakeContext(emptyData());
      expect(await canView(ctx, userId("viewer"), item(visibility, "draft"), "matching")).toBe(false);
      expect(await canView(ctx, userId("viewer"), item(visibility, "archived"), "matching")).toBe(false);
    },
  );
});

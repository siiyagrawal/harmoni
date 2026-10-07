import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export const exportContactsCsv = action({
  args: {},
  returns: v.object({ fileName: v.string(), contentType: v.string(), content: v.string() }),
  handler: async (ctx): Promise<{ fileName: string; contentType: string; content: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to export your contacts.");

    const rows = await ctx.runQuery(internal.contacts.exportRows, {});
    const columns = [
      "fullName",
      "jobTitle",
      "company",
      "email",
      "phone",
      "website",
      "tags",
      "notes",
      "metLocation",
      "createdAt",
    ] as const;
    const content = [
      columns.map(csvCell).join(","),
      ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
    ].join("\r\n");

    return {
      fileName: "blinq-contacts.csv",
      contentType: "text/csv;charset=utf-8",
      content,
    };
  },
});

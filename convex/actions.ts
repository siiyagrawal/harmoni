import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export const exportContactsCsv = action({
  args: { sessionToken: v.string() },
  returns: v.object({ fileName: v.string(), contentType: v.string(), content: v.string() }),
  handler: async (ctx, { sessionToken }): Promise<{ fileName: string; contentType: string; content: string }> => {
    const rows = await ctx.runQuery(internal.contacts.exportRows, { sessionToken });
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
    type ContactExportRow = Record<(typeof columns)[number], string>;
    const content = [
      columns.map(csvCell).join(","),
      ...rows.map((row: ContactExportRow) => columns.map((column) => csvCell(row[column])).join(",")),
    ].join("\r\n");

    return {
      fileName: "blinq-contacts.csv",
      contentType: "text/csv;charset=utf-8",
      content,
    };
  },
});

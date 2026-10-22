export type DashboardPortfolio = {
  id: string;
  title: string | null;
  template_key: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/** A failed/malformed response is never an empty portfolio list. */
export function parseDashboardPortfolios(value: unknown): DashboardPortfolio[] {
  if (!Array.isArray(value)) throw new Error("Invalid portfolio list");
  const nullableText = (v: unknown): v is string | null => v === null || typeof v === "string";
  return value.map((row: unknown) => {
    if (!row || typeof row !== "object" || !("id" in row) || typeof row.id !== "string" || !row.id ||
      !("title" in row) || !nullableText(row.title) || !("template_key" in row) || !nullableText(row.template_key) ||
      !("created_at" in row) || !nullableText(row.created_at) || !("updated_at" in row) || !nullableText(row.updated_at)) {
      throw new Error("Invalid portfolio row");
    }
    return { id: row.id, title: row.title, template_key: row.template_key, created_at: row.created_at, updated_at: row.updated_at };
  });
}

/** Keep optional portfolio timestamps readable if a stored date is malformed. */
export function formatPortfolioDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

/** Display template names consistently without rewriting legacy template keys. */
export function portfolioTemplateName(key: string | null): string {
  switch (key) {
    case "modern": return "Emerald Editorial";
    case "minimal": return "Minimal";
    case "classic":
    case null: return "Classic";
    default: return "รูปแบบเดิม";
  }
}

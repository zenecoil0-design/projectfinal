export const visibilitySections = ["preface", "toc", "profile", "education", "activity", "certificate"] as const;
export type VisibilitySection = typeof visibilitySections[number];
export type SectionVisibility = Record<VisibilitySection, boolean>;
export type VisibilityRow = { section: VisibilitySection; visible: boolean };
export const contentSections = ["profile", "education", "activity", "certificate"] as const;
export const visibilityNames: Record<VisibilitySection, string> = {
  preface: "คำนำ", toc: "สารบัญ", profile: "ประวัติส่วนตัว", education: "การศึกษา", activity: "ผลงานและกิจกรรม", certificate: "เกียรติบัตร",
};

export function defaultVisibility(): SectionVisibility {
  return { preface: true, toc: true, profile: true, education: true, activity: true, certificate: true };
}

export function isVisibilitySection(value: unknown): value is VisibilitySection {
  return typeof value === "string" && visibilitySections.some(section => section === value);
}

/** Call only for a successful read. Missing/failed payloads are not defaults. */
export function parseVisibilityRows(data: unknown): SectionVisibility {
  if (!Array.isArray(data)) throw new Error("Visibility rows are missing");
  const values = defaultVisibility();
  const seen = new Set<VisibilitySection>();
  const rows: unknown[] = data;
  for (const row of rows) {
    if (!row || typeof row !== "object" || !("section" in row) || !("visible" in row) || !isVisibilitySection(row.section) || typeof row.visible !== "boolean" || seen.has(row.section)) {
      throw new Error("Invalid visibility row");
    }
    seen.add(row.section);
    values[row.section] = row.visible;
  }
  return values;
}

/** TOC preference is retained even when there is no displayed content. */
export function showContents(values: SectionVisibility): boolean {
  return values.toc && contentSections.some(section => values[section]);
}

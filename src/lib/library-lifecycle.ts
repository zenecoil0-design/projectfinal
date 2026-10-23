export type LibraryKind = 'education' | 'activity' | 'certificate';
export const libraryTables = {
  education: { source: 'user_library_educations', relation: 'portfolio_educations', column: 'education_id' },
  activity: { source: 'user_library_activities', relation: 'portfolio_activities', column: 'activity_id' },
  certificate: { source: 'user_library_certificates', relation: 'portfolio_certificates', column: 'certificate_id' },
} as const;

export type ImpactPortfolio = { id: string; title: string | null };
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Missing/invalid join data is never evidence that zero portfolios are affected. */
export function parseLibraryImpact(value: unknown, owner: string): ImpactPortfolio[] {
  if (!Array.isArray(value)) throw new Error('Invalid impact response');
  const ids = new Set<string>();
  return value.map(row => {
    if (!record(row) || !record(row.portfolios)) throw new Error('Invalid impact row');
    const p = row.portfolios;
    if (typeof p.id !== 'string' || !p.id.trim() || row.portfolio_id !== p.id || p.user_id !== owner ||
      !(p.title === null || typeof p.title === 'string') || ids.has(p.id)) throw new Error('Invalid impact portfolio');
    ids.add(p.id);
    return { id: p.id, title: p.title };
  });
}

export function confirmedLibraryDelete(value: unknown, id: string): boolean {
  return Array.isArray(value) && value.length === 1 && record(value[0]) && value[0].id === id;
}

export const libraryImageLimits = { activity: 4, certificate: 2 } as const;
export function canAddLibraryImages(kind: 'activity' | 'certificate', existing: number, added: number): boolean {
  return Number.isInteger(existing) && Number.isInteger(added) && existing >= 0 && added >= 0 &&
    ((kind === 'certificate' && added === 0) || existing + added <= libraryImageLimits[kind]);
}

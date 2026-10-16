export type TagSection = "education" | "activity" | "certificate";
export type Tag = { id: string; name: string };
export type TagRelation = { itemId: string; tagId: string };
export type TagResult = { tags: Tag[] | null; relations: TagRelation[] | null; tagsError: boolean; relationsError: boolean };
export type TagState = {
  snapshot: { tags: Tag[]; relations: TagRelation[] } | null;
  loading: boolean;
  tagsError: boolean;
  relationsError: boolean;
};
export const initialTagState: TagState = { snapshot: null, loading: true, tagsError: false, relationsError: false };

/** Metadata only: no selection store, saved baseline or session navigation is touched. */
export function createTagLoader() {
  let version = 0;
  let owner: string | null = null;
  let pending: Promise<void> | null = null;
  let state = initialTagState;
  return {
    invalidate() { version++; owner = null; pending = null; state = initialTagState; },
    load(nextOwner: string, query: () => Promise<TagResult>, publish: (state: TagState) => void): Promise<void> {
      if (owner === nextOwner && pending) return pending;
      if (owner !== nextOwner) state = initialTagState;
      owner = nextOwner;
      const ticket = ++version;
      const current = () => version === ticket && owner === nextOwner;
      state = { ...state, loading: true };
      publish(state);
      // Defer the query so even synchronously resolving reads share the pending request.
      pending = Promise.resolve().then(query).then(result => {
        if (!current()) return;
        const tagsError = result.tagsError || result.tags === null;
        const relationsError = result.relationsError || result.relations === null;
        state = {
          loading: false, tagsError, relationsError,
          snapshot: !tagsError && !relationsError
            ? { tags: result.tags!, relations: result.relations! }
            : state.snapshot,
        };
        publish(state);
      }).catch(() => {
        if (!current()) return;
        state = { ...state, loading: false, tagsError: true, relationsError: true };
        publish(state);
      }).finally(() => { if (current()) pending = null; });
      return pending;
    },
  };
}

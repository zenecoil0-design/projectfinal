"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createTagLoader, initialTagState, type Tag, type TagSection, type TagState } from "@/lib/editor/tag-loader";
import { useEditorSession } from "./EditorSession";

/** Called once with the initial loader's verified owner; retry reads metadata only. */
export function useEditorTags(supabase: SupabaseClient, section: TagSection) {
  const { reportTags } = useEditorSession();
  const loader = useMemo(() => createTagLoader(), []);
  const owner = useRef<string | null>(null);
  const [state, setState] = useState<TagState>(initialTagState);
  const [selectedTag, setFilterTag] = useState<string | null>(null);
  useLayoutEffect(() => () => { loader.invalidate(); owner.current = null; }, [loader]);
  const load = useCallback((userId: string) => {
    owner.current = userId;
    return loader.load(userId, async () => {
      const [tags, relations] = await Promise.all([
        supabase.from("user_tags").select("id, name").eq("user_id", userId).order("name", { ascending: true }).returns<Tag[]>(),
        supabase.from(`user_library_${section}_tags`).select(`${section}_id, tag_id`)
          .returns<(Record<`${TagSection}_id`, string> & { tag_id: string })[]>(),
      ]);
      return {
        tags: tags.data, tagsError: Boolean(tags.error), relationsError: Boolean(relations.error),
        relations: relations.data?.map(row => ({ itemId: row[`${section}_id`], tagId: row.tag_id })) ?? null,
      };
    }, next => {
      setState(next);
      reportTags(section, next.loading ? "loading" : next.tagsError || next.relationsError ? "error" : "ready");
    });
  }, [loader, reportTags, section, supabase]);
  const ready = !state.loading && !state.tagsError && !state.relationsError && state.snapshot !== null;
  const tags = state.snapshot?.tags ?? [];
  const missingFilter = ready && selectedTag !== null && !tags.some(tag => tag.id === selectedTag);
  const filterTag = ready && !missingFilter ? selectedTag : null;
  const hasTag = (itemId: string, tagId: string) => Boolean(state.snapshot?.relations.some(row => row.itemId === itemId && row.tagId === tagId));
  return {
    ...state, ready, tags, filterTag, missingFilter, setFilterTag, load, hasTag,
    tagsFor: (itemId: string) => tags.filter(tag => hasTag(itemId, tag.id)),
    retry: () => { if (owner.current) return load(owner.current); },
  };
}

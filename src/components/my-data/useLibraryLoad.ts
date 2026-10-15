"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Result = { mainError: boolean; tagsError: boolean };
const initial = { isLoading: true, loaded: false, loadError: false, tagsError: false };

/** One request per mounted library; never apply a response from an obsolete owner/request. */
export function useLibraryLoad() {
  const [state, setState] = useState(initial);
  const mounted = useRef(false);
  const request = useRef({ version: 0 });
  const pending = useRef<{ owner: string; promise: Promise<void> } | null>(null);
  useEffect(() => {
    const lifetime = request.current;
    mounted.current = true;
    return () => { mounted.current = false; lifetime.version++; pending.current = null; };
  }, []);
  const run = useCallback(<T,>(owner: string, query: () => Promise<T>, apply: (result: T) => Result, replace = false) => {
    if (!replace && pending.current?.owner === owner) return pending.current.promise;
    const ticket = ++request.current.version;
    const current = () => mounted.current && ticket === request.current.version;
    setState(previous => ({ ...previous, isLoading: true }));
    const promise = (async () => {
      try {
        const result = await Promise.resolve().then(query);
        if (!current()) return;
        const { mainError, tagsError } = apply(result);
        setState(previous => ({ isLoading: false, loaded: previous.loaded || !mainError, loadError: mainError, tagsError }));
      } catch {
        if (current()) setState(previous => ({ ...previous, isLoading: false, loadError: true, tagsError: true }));
      } finally {
        if (current()) pending.current = null;
      }
    })();
    pending.current = { owner, promise };
    return promise;
  }, []);
  return { ...state, run, canSave: state.loaded && !state.isLoading && !state.loadError && !state.tagsError };
}

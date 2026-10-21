"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

type Entry = { key: string };
type LibraryNavigation = EventTarget & {
  currentEntry: Entry | null;
  entries: () => readonly Entry[];
  traverseTo: (key: string) => { finished: Promise<unknown> };
};
type LibraryNavigateEvent = Event & { navigationType: string; destination: Entry & { sameDocument: boolean } };
type Flags = { dirty: boolean; busy: boolean };

// TS's installed DOM declarations do not yet include window.navigation.
function navigation(): LibraryNavigation | undefined {
  const value = (window as Window & { navigation?: LibraryNavigation }).navigation;
  return value && typeof value.traverseTo === "function" && typeof value.entries === "function" &&
    typeof value.currentEntry?.key === "string" ? value : undefined;
}
const subscribe = () => () => {};
const supported = () => navigation() !== undefined;
const serverSupported = () => false;

/** Only mounted on /my-data. No history entries, state writes, or router patches. */
export function useLibraryHistoryGuard(getFlags: () => Flags, requestExit: (action: () => void) => void) {
  const callbacks = useRef({ getFlags, requestExit });
  useEffect(() => { callbacks.current = { getFlags, requestExit }; }, [getFlags, requestExit]);
  const historySupported = useSyncExternalStore(subscribe, supported, serverSupported);
  useEffect(() => {
    const api = navigation();
    if (!api?.currentEntry) return;
    let active = true;
    let leaving: string | null = null;
    const traverse = (key: string) => {
      // A superseding Back/Forward can abort this traversal; no stale callbacks.
      void api.traverseTo(key).finished.catch(() => {});
    };
    const onNavigate = (raw: Event) => {
      const event = raw as LibraryNavigateEvent;
      if (!active || event.navigationType !== "traverse" || !event.destination.sameDocument) return;
      if (event.destination.key === leaving) { leaving = null; return; }
      const flags = callbacks.current.getFlags();
      if ((!flags.dirty && !flags.busy) || !event.cancelable) return;
      event.preventDefault();
      if (flags.busy) return;
      const target = event.destination.key;
      callbacks.current.requestExit(() => {
        if (!active || !api.entries().some(entry => entry.key === target)) return;
        leaving = target; traverse(target);
      });
    };
    api.addEventListener("navigate", onNavigate);
    return () => { active = false; leaving = null; api.removeEventListener("navigate", onNavigate); };
  }, []);
  return historySupported;
}

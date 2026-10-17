"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import { bindPageLayout } from "@/lib/editor/page-layout";

type RegisterMeasurement = (measure: () => void) => () => void;
const MeasurementContext = createContext<RegisterMeasurement | null>(null);

export function PageLayout({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const measurements = useRef(new Set<() => void>());
  const register = useCallback<RegisterMeasurement>(measure => {
    measurements.current.add(measure);
    return () => { measurements.current.delete(measure); };
  }, []);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    return bindPageLayout(element, () => {
      for (const measure of [...measurements.current]) measure();
    });
  }, []);
  return <MeasurementContext.Provider value={register}>
    <div ref={root} data-page-layout className="flex flex-col items-center gap-8">{children}</div>
  </MeasurementContext.Provider>;
}

export const usePageMeasurements = () => useContext(MeasurementContext);

// Text is assigned by the scoped layout coordinator from actual rendered pages.
// No per-section offset state, registration count, or baseline mutation.
export function PageNumber() {
  return <span className="document-page-number" data-page-number />;
}

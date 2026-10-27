import type { NextResponse } from "next/server";

/** Preserve refreshed/deleted cookies and cache policy when Auth redirects. */
export function copySessionResponse(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach(cookie => target.cookies.set(cookie));
  for (const name of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(name);
    if (value !== null) target.headers.set(name, value);
  }
}

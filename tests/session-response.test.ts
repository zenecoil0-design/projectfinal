import test from "node:test";
import assert from "node:assert/strict";
import { NextResponse } from "next/server";
import { copySessionResponse } from "../src/lib/session-response";

test("redirect preserves chunked session cookie attributes and cache restrictions", () => {
  const source = NextResponse.next();
  for (const name of ["session.0", "session.1"]) {
    source.cookies.set(name, "synthetic", { path: "/", domain: "example.invalid", secure: true, httpOnly: true, sameSite: "lax", expires: new Date("2030-01-01T00:00:00Z") });
  }
  source.headers.set("cache-control", "private, no-store");
  source.headers.set("pragma", "no-cache");
  source.headers.set("expires", "0");
  const target = NextResponse.redirect("https://example.invalid/dashboard");
  copySessionResponse(source, target);
  assert.deepEqual(target.cookies.getAll(), source.cookies.getAll());
  for (const name of ["cache-control", "pragma", "expires"]) assert.equal(target.headers.get(name), source.headers.get(name));
  assert.equal(target.status, 307);
  assert.equal(target.headers.get("location"), "https://example.invalid/dashboard");
});

test("expired cookie remains a deletion on login redirect", () => {
  const source = NextResponse.next();
  source.cookies.set("session", "", { path: "/", maxAge: 0, sameSite: "lax" });
  const target = NextResponse.redirect("https://example.invalid/login");
  copySessionResponse(source, target);
  assert.equal(target.cookies.get("session")?.maxAge, 0);
  assert.match(target.headers.get("set-cookie")!, /Max-Age=0/);
  assert.deepEqual(target.cookies.getAll(), source.cookies.getAll());
});

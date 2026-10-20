import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { localJwt, assertLocalDocker } from "../integration/section-visibility-api.mjs";

test("local acceptance JWTs have authenticated role, distinct synthetic subjects and valid signatures", () => {
  const secret = "unit-only-generated-key-not-a-project-secret";
  for (const subject of ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"]) {
    const [header, payload, signature] = localJwt(subject, secret).split(".");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    assert.equal(claims.sub, subject); assert.equal(claims.role, "authenticated");
    assert.ok(claims.exp > Date.now() / 1000);
    assert.equal(signature, createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url"));
  }
  assert.throws(() => localJwt("hosted-user", secret));
});

test("runner refuses remote Docker endpoints and endpoint/context overrides", () => {
  assert.doesNotThrow(() => assertLocalDocker("unix:///var/run/docker.sock", {}));
  for (const endpoint of [undefined, "tcp://127.0.0.1:2375", "ssh://remote", "https://hosted"]) assert.throws(() => assertLocalDocker(endpoint, {}));
  for (const environment of [{ DOCKER_HOST: "unix:///other" }, { DOCKER_CONTEXT: "remote" }]) assert.throws(() => assertLocalDocker("unix:///var/run/docker.sock", environment));
});

test("fixture/Compose are isolated, non-destructive and do not use service-role authentication", () => {
  const compose = readFileSync(new URL("../integration/visibility/compose.yaml", import.meta.url), "utf8");
  const fixture = readFileSync(new URL("../integration/visibility/fixture.sql", import.meta.url), "utf8");
  const runner = readFileSync(new URL("../integration/section-visibility-api.mjs", import.meta.url), "utf8");
  assert.match(compose, /127\.0\.0\.1:/); assert.match(compose, /tmpfs:/); assert.match(compose, /internal: true/);
  assert.doesNotMatch(compose, /supabase\.co|docker\.sock|host\.docker\.internal|network_mode:\s*host/);
  assert.match(fixture, /current_database\(\) <> 'section_visibility_integration'/);
  assert.match(fixture, /fresh empty database/); assert.match(fixture, /request\.jwt\.claims/);
  assert.doesNotMatch(fixture, /\b(?:DROP|TRUNCATE|DELETE|BYPASSRLS|SUPERUSER)\b/);
  assert.doesNotMatch(runner, /service_role|SUPABASE.*KEY|DATABASE_URL/);
  assert.match(runner, /migrationFile, "utf8"/);
});

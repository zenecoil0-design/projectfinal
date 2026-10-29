# Snapshot upload validation prototype — 29 October 2026

Base: eb4ee3787cf75a7cd403cf447c4956d038a6e39c.

Added private-schema configuration and trigger validation for new education logos and activity/certificate image references. Requires an explicitly configured public Storage URL base, exact owner/section/item path, UUID image filename and an existing portfolio-images Storage metadata row owned by the authenticated user. Unchanged existing URLs are retained without revalidating legacy assets; image/order ownership remains enforced by the atomic-update RPC.

Configuration and implementation are private, with no authenticated/anon table or function access. Triggers also cover atomic creation because its inserts use the same tables. No Storage object is uploaded, overwritten or removed by this proposal.

PGlite tests: 3/3 PASS, one per category (4.4 seconds). Covers absent configuration, foreign origin, changed owner, missing object, query suffix, newline suffix, traversal and valid upload; configuration reads are denied. Scoped lint and full repository TypeScript PASS. No app source changed; no browser/build rerun.

NOT installed or enabled. Target storage.objects column types and ownership semantics still require read-only verification before migration promotion. A metadata row lock does not prove physical-object retention against concurrent Storage API deletion. Upload failure/uncertain-save recovery, actual callers, old-portfolio transition, Snapshot Editor/PDF integration and real PostgreSQL/PostgREST acceptance remain pending. No full Snapshot completion claim.

The new proposal is intended to replace the missing new-URL validation noted in earlier prototype reports once integrated and verified on the target. It is not permission to apply SQL to hosted infrastructure or clean up files.

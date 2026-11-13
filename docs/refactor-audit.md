# Development refactor audit — 2026-11-12

The audit covers the application source, server layers, shared contracts, database schema/migration baseline, and verification tooling. It uses static analysis, boundary linting, type checking, behavior tests, database integration and browser workflows. These checks do not certify the absence of every possible defect.

| Finding | Change |
| --- | --- |
| Scattered dimensions and arbitrary CSS values | Central theme; semantic spacing, typography, radius, container and viewport aliases; continuous style audit |
| Spacing aliases could collide with Tailwind keywords/container widths | Dedicated `ui` namespace and a reserved-name check; editor width verified in the browser |
| Snapshot insertion, pruning and limits duplicated across document/manual save paths | Single snapshot policy and shared transactional persistence helper; injected clock |
| Application notification service wrote directly to console | Injected error-reporting port and runtime adapter; delivery failure isolation tested |
| Restore/purge loaded the complete trash list before selecting an item | Permission-filtered lookup by resource kind and ID |
| Late version-preview errors could replace a newer selection | Request identity guards and lifecycle cleanup in a feature composable |
| Recovery HTTP orchestration mixed into screen components | Feature composables own query and mutation state |
| Cache keys and relative-time rendering duplicated | Central library cache registry and one relative-time formatter |
| Unused presentation selectors and embedded checkbox image payloads | Unused rules removed; checkbox artwork is a dedicated SVG asset |
| Development migration history did not represent a single clean baseline | Regenerated one schema snapshot and initial migration containing all 20 tables, including email activity snapshots; local development DB reset and migration rerun verified |

## Verification

`bun run verify` includes migration consistency, Knip, semantic style audit, architecture lint, browser/server type checking, unit tests, production build, HTTP smoke, and MySQL/workspace/knowledge-tool integration.

Additional browser checks exercise desktop/mobile/tablet layouts, light/dark/reduced-motion skeletons, independent resource loading, history preview races, templates, search, Trash restore and auth viewport fit. Microsoft tenant login and live external AI availability remain environment-dependent; automated authorization and provider-error tests use controlled fixtures.

Runtime drag coordinates and editor/table structure remain numeric because they describe live geometry or document structure. Visual dimensions live in the theme. The deployment remains a single Bun process: distributed collaboration and invalidation require a shared coordinator before horizontal scaling.

## Member and permission rewrite — 2026-11-13

The approval invitation tables, APIs, services, browser clients, inbox composable, and pending-invitation screens were removed. The replacement separates member management, resource authorization, and workspace navigation. Restricted documents are filtered across content discovery and delivery paths; member changes use workspace transactions and protected role transitions. Shared invalidation streams serve notifications and read-only discussions. Development migrations are rebuilt as one baseline.

Verification adds permission-policy unit tests and HTTP checks for immediate membership, first-login email attachment, hierarchy protections, viewer/commenter/editor boundaries, direct/group grants, inherited caps, expiry, suspension, bulk results, private attachment URLs, audit visibility, AI sources, and export/email access checks.

## Members / Settings boundary audit

Removed the former workspaces-owned member/settings screen locations and moved each capability into its feature directory. Both management screens now share a presentation shell/navigation. Capability rules are explicitly distinguished from individual/group document access. Scoped settings PATCH and field-aware draft reconciliation prevent one category overwriting another. Initial member grants are rechecked while holding the workspace lock. Load-more results are discarded after filters change. Retention records a purge only when the transaction actually removed the item. Governance changes revalidate editors and invalidate member navigation.

The transaction audit also removed nested pool queries: resource scopes accept the current database transaction, and policy/grant/notification checks use that same connection. Group/policy audit entries are inserted in batches with one actor lookup. Archive/ownership/leave mutations record their audit entries in the same transaction, including per-member role history after ownership transfer. Invalidation targets the current workspace and mounted feature views instead of refreshing every cached workspace.

Automated verification for this audit: 87 passing unit tests, architecture/style/unused-code checks, app/server type checking, production build, HTTP/workspace/knowledge/mail/settings integration, independent/concurrent settings PATCH, protected document access, and saturation with 16 policy writes plus 12 member additions carrying resource grants. Development SSR checks inspect authenticated Members and Settings markup; desktop visual inspection requires an unlocked Mac.

Development-only SSR schema loading was also fixed: the new schemas and SMTP config now use the same Zod namespace import as existing validation modules. ESLint rejects the incompatible named namespace pattern, and `bun run test:development` verifies authenticated Members/Settings rendering against a running local development server without sending email.

Remaining manual check: an existing development browser session logged hydration mismatches after server restarts. Authenticated fresh HTTP SSR checks pass, but a fresh browser reload and screenshot comparison could not be completed because the desktop was locked and the browser-control adapter failed. These warnings are not classified as resolved by the automated SSR check.

## Toast feedback and workspace questions

All application `UAlert` instances and custom inline error announcements were removed. Shared query feedback deduplicates the same failure across consumers and background retries until recovery; explicit retry controls start a new feedback attempt. Mutation failures preserve form drafts and keep confirmation dialogs open. ESLint rejects both `UAlert` and application-owned inline `role="alert"` messages. Query errors retain retry controls without displaying misleading empty states, and document loading no longer stays on a skeleton after workspace metadata fails.

Version history uses the shared panel shell, a searchable version selector, a full-width preview, and a restore confirmation. The previous split timeline styles/tokens were deleted. Ask workspace is now a workspace route (`/workspaces/:workspaceId/ask`), with its query state in a feature composable; the global slideover and its opening state were deleted. Replies arriving after navigation are discarded.

Verification: lint (including rejection of a sample `UAlert`), Knip, semantic styles, application type checking, 87 unit tests, production build, HTTP smoke, permission/workspace/knowledge/settings/fake-SMTP integration, and authenticated development SSR for Members, Settings, and Ask workspace. Version selection and restore cancellation were inspected in the browser. Visual inspection of the new Ask page was interrupted by active browser use; its route and SSR were checked automatically.

## Knowledge workflow improvements — 2026-11-13

Implemented private persistent AI conversations, version comparisons, permission-aware move acknowledgements, member visibility preview, discussion/mention notification targets, workspace template snapshots, read-only page archives, full SQL/attachment backup scheduling and restore tooling. These features reuse current resource authorization, shared screen primitives, semantic theme tokens, toast feedback, and workspace invalidation. The old questions UI composable and unused browser answer method were removed; document initialization now inserts initial Markdown atomically with the new page instead of a separate replacement/compensating delete.

Page move commits recompute their access impact and reject stale acknowledgements. AI follow-ups retain source dependencies so revoking an earlier source also redacts dependent answers. Templates retain a snapshot and current source authorization. Archives use the existing read-only editor path and stay separate from Trash.

The additive `0001_workspace_knowledge.sql` migration extends the baseline to 23 tables; applying this change does not reset working data. Backup SQL uses an InnoDB transaction snapshot, followed by attachment archiving; exact cross-storage consistency requires stopping writes for a manual backup. Restore is explicitly gated, verifies archive contents, and is tested against isolated databases. Docker's daily worker mounts uploads read-only; restore uses a separate writable override documented in `docs/backup.md`.

Verification completed: migration-chain checks, Knip, semantic style audit, architecture lint, application/server type checks, 92 passing unit tests, production build, HTTP smoke, workspace/access/knowledge/email/settings integration, new feature integration, and isolated full-schema/binary/Unicode/attachment restore and corruption tests. The backup Docker image builds and runs Bun, and Compose validation passes. Authenticated development SSR passes for Members, Settings, Ask, Archive and Templates; no external email is sent by these tests. The Archive screen was inspected visually. The browser extension adapter failed during further UI navigation, so a complete interactive browser pass for the new conversation screen remains a manual follow-up; automated HTTP/SSR checks cover their routes and operations.

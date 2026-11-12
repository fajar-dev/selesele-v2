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
| Recovery/invitation HTTP orchestration mixed into screen components | Feature composables own query and mutation state |
| Cache keys and relative-time rendering duplicated | Central library cache registry and one relative-time formatter |
| Unused presentation selectors and embedded checkbox image payloads | Unused rules removed; checkbox artwork is a dedicated SVG asset |
| Development migration history did not represent a single clean baseline | Regenerated one schema snapshot and initial migration containing all 15 tables; local development DB reset and migration rerun verified |

## Verification

`bun run verify` includes migration consistency, Knip, semantic style audit, architecture lint, browser/server type checking, unit tests, production build, HTTP smoke, and MySQL/workspace/knowledge-tool integration.

Additional browser checks exercise desktop/mobile/tablet layouts, light/dark/reduced-motion skeletons, independent resource loading, history preview races, templates, search, Trash restore and auth viewport fit. Microsoft tenant login and live external AI availability remain environment-dependent; automated authorization and provider-error tests use controlled fixtures.

Runtime drag coordinates and editor/table structure remain numeric because they describe live geometry or document structure. Visual dimensions live in the theme. The deployment remains a single Bun process: distributed collaboration and invalidation require a shared coordinator before horizontal scaling.

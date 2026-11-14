# Architecture

SeleSele is a modular Nuxt/Bun monolith. One origin serves browser routes, authenticated HTTP APIs, document WebSockets, and notification SSE. The business entity is an **item** with an immutable kind: `document`, `kanban`, `whiteboard`, or `diagram`.

## Ownership

- `app/features/items`: metadata, creation, lifecycle, document editing/reading, and typed API transport.
- `app/features/canvases`: structured editor shell, autosave orchestration, import/export, and a framework-independent `CanvasSession` with undo/redo and revision acknowledgement.
- `app/features/kanban`: immutable board commands and task/column presentation.
- `app/features/whiteboard`: drawing commands, pressure-aware pen paths, SVG shapes, pointer interactions, and export.
- `app/features/diagrams`: graph commands, Vue Flow adapter, node/connector presentation, and SVG export.
- Other features own workspaces, membership, access, settings, library/templates, conversations, recovery, comments, notifications, and auth.
- `server/features/*/domain`: entities, pure policy, and dependency ports. No Vue, Nitro, SQL, Zod, filesystem, or provider dependencies.
- `server/features/*/application`: injected use cases coordinating domain ports. Runtime adapters stay in `infrastructure` and `server/platform`.
- `server/bootstrap/container.ts` and `app/plugins/api.ts`: dependency composition.
- `shared/kernel`, `shared/contracts`, and `shared/validation`: framework-independent values, API types, and strict request schemas.
- `app/pages`: Nuxt route adapters. The framework's reserved route folder and APIs such as `definePageMeta` keep their framework names; they do not represent the item entity.

## Persistence and lifecycle

The development baseline is `drizzle/0000_initial_schema.sql` with 24 tables. `items` owns workspace/folder membership, kind, title, description, icon, access mode, archive, and Trash timestamps. `item_documents` stores text Markdown/Yjs state. `item_canvases` stores discriminated structured content, searchable text, revision, and update time. Every item has exactly its corresponding content store on creation, committed with its metadata.

Item kinds cannot be changed through metadata updates. Text content/state endpoints and document WebSockets reject non-document items. Structured write endpoints reject document items and mismatched kinds. The system does not interpret arbitrary HTML, SVG, JavaScript, or CSS supplied in JSON: drawing colors, shapes, coordinates, task values, and graph edges are validated and bounded.

`item_versions` stores serialized prior content for all item kinds with a common retention policy. Document restore uses the collaboration room queue; structured restore uses revision-checked persistence. Purge cascades structured content and dependent records. Archives remain readable and block all writes. Templates preserve the kind and a content snapshot, with continued source-access checks. Workspace export includes Markdown or JSON according to kind and an item manifest.

## Access and concurrency

Owner/Admin/Member/Viewer roles, direct/group grants, expiry, suspension, and parent-folder caps use one permission evaluator. Owners retain access; Admins do not bypass restricted content. Search, AI retrieval, exports, templates, media, Trash, versions, and editor APIs apply current visibility. Moving an item recomputes before/after member access and requires a current acknowledgement when permissions change.

Structured content writes lock the workspace before rechecking current membership/access and item lifecycle. They lock the item/content, check the expected revision, validate references/assignees, save a prior snapshot, update the searchable projection, and append audit activity in the same transaction. The response acknowledges exactly that committed revision, not a later reader's snapshot. WIP limits, unique identifiers, column membership, connector endpoints, size limits, and strict typed fields are validated on the server.

Document editing uses Yjs/WebSocket collaboration. Structured editors use autosave with compare-and-swap revisions; they are not CRDT editors. `CanvasSession` preserves edits made during an in-flight save and never replaces a dirty draft with a remote refresh. Conflicts require review, load-latest, or explicit replacement; the replaced server version remains in history. Undo/redo is local draft history. Workspace SSE invalidates mounted structured editors; each refresh rechecks authorization. Browser navigation is blocked while a draft remains unsaved.

## Presentation

All editors share item metadata, breadcrumbs, access, lifecycle actions, feedback, and the existing Nuxt UI primitives. Structured editors are loaded on demand. Components render interaction; commands and persistence orchestration stay outside templates. Static dimensions use semantic theme tokens. Drawing coordinates, graph positions, shape dimensions, pointer transforms, and SVG geometry remain numeric domain/runtime data.

Feedback uses deduplicated toast notifications and retry actions; application `UAlert` and inline error-alert blocks are prohibited by ESLint. Lazy queries load independently. Sidebar titles truncate, and item creation offers all four kinds plus folders without creation modals.

## Operations and verification

Run one Bun application process. Document rooms and invalidation are coordinated in memory; additional replicas require shared ownership and a broker first. MySQL and uploads are persistent resources. Shutdown flushes document rooms before closing the database. Email uses a transactional MySQL outbox, leases, preference/access revalidation, retries, and background SMTP delivery.

`bun run verify` checks migration consistency, unused code, semantic styles, architecture lint, app/server types, unit tests, production build, HTTP smoke, and isolated integration suites for access, content workflows, mail, settings, and backup/restore. Real Microsoft sign-in and external AI/SMTP availability remain deployment configuration; automated suites use identity/provider/SMTP fixtures and do not send external mail.

See [design-system.md](design-system.md) and [backup.md](backup.md) for visual conventions and recovery procedures.

## Workspace productivity

AI chat has a newline-delimited JSON streaming endpoint alongside the existing completed-response endpoint. Text chunks are released after current source/provenance access checks; request cancellation aborts the provider and prevents appending an incomplete exchange. A final committed conversation completes the stream. Source excerpts are stored with citations and removed from responses together with inaccessible answers. Chat pins are private per conversation owner; message search selects candidates in SQL and filters them again through redacted conversation presentation.

Structured drafts are backed up in browser local storage per user/item, validated on recovery, and expire after 30 days. Recovery is offered only after the server grants access. A draft based on an older revision enters the existing review/replace flow. Successful saves and logout remove the local backup. These backups supplement server autosave and do not turn structured editors into CRDT editors.

My Tasks aggregates kanban assignments using each workspace's membership ID, constrained by current item visibility and active workspace/item lifecycle. It opens the original board with a task deep link. Comment anchors support either Yjs text ranges or typed object IDs. Object discussion creation validates the target against persisted structured content, while replies, resolution, notifications, and realtime synchronization share the existing comment services.

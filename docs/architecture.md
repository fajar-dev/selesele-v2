# Architecture

SeleSele is a modular Nuxt monolith. Browser UI, HTTP handlers and collaboration WebSockets share one deployment and origin. Feature boundaries organize business capabilities; domain ports isolate persistence and external providers.

## Ownership

```text
app/
  core/http/              Request-scoped API transport
  plugins/api.ts          Client dependency composition
  components/shell/       Application chrome
  components/ui/          Shared presentation primitives
  features/
    auth/                 Microsoft sign-in and session state
    workspaces/           Directory, folders, navigation
    members/              Member directory, groups, bulk membership actions
    access/               Resource policies and access management
    settings/             Workspace rules, preferences, data and lifecycle
    pages/                Page metadata, document lifecycle, creation/movement/deletion
    editor/               Rich-text extensions, selection, images and AI writing
    comments/             Discussions, anchored highlights and synchronization
    library/              Search, templates, personal page navigation
    recovery/             Trash, version history and preview state
    notifications/        Realtime activity inbox
  pages/                  Thin Nuxt routes: params, metadata, screen selection
  layouts/                Persistent workspace shell
server/
  bootstrap/container.ts  Server dependency composition and lifecycle
  core/                   Transport-neutral errors and common ports
  features/
    identity/             Accounts, sessions, Microsoft OAuth
    workspaces/           Workspace authorization, folders, navigation
    members/              Immediate membership, groups, role hierarchy
    access/               Resource permission evaluator and authorization adapters
    pages/                Metadata and document access
    comments/             Discussion permissions and lifecycle
    writing/              Completion use case and provider adapter
    media/                Image policy, upload use case and storage port
    library/              Authorized discovery and templates
    recovery/             Trash access and shared snapshot policy
    notifications/        Recipient-scoped activity delivery
    mail/                 Durable email outbox, retry policy and SMTP adapter
    settings/             Workspace governance, audit, export and retention
  platform/               Database, HTTP, filesystem, clock and collaboration adapters
  api/                    HTTP input/output adapters
  routes/                 WebSocket and public image transports
shared/
  kernel/                 Framework-free identity, role and anchor value types
  contracts/              Serializable API requests and responses
  validation/             Strict Zod request schemas
```

Each server feature has `domain`, `application` and `infrastructure` directories. Domain code defines entities and ports. Application services coordinate rules through those ports. Infrastructure implements database/provider access. `platform` owns shared runtime adapters, and `bootstrap` connects concrete implementations. Feature dependencies use interfaces such as `WorkspaceAuthorization`, `FolderLookup`, `PageAccess` and `SessionAuthenticator`, rather than importing another feature's concrete service.

HTTP handlers validate untrusted input, obtain the authenticated identity, invoke a use case and map its result. `ApplicationError` carries a semantic code; the HTTP adapter maps it to a status. Domain code does not import Nitro, Vue, Drizzle or request schemas. ESLint enforces these boundaries. Avoid naming a business directory `server/modules`: Nitro reserves that directory for runtime modules.

## State and data

Browser API clients receive an `ApiTransport` and expose typed operations. The Nuxt plugin constructs clients per app/SSR request; the server-side fetch retains the caller's session cookies. API clients do not own Vue state. Feature composables orchestrate operations; components own interaction and presentation. Shared primitives do not know workspace or editor rules.

`workspaceKeys` defines cache identity. `useWorkspaceState` owns page/folder cache mutations, so creation, title changes, moves and deletion update the same workspace projection. Workspace metadata, folders, pages and members use independent authorized endpoints and cache keys. UI queries are lazy and load in parallel on the client; the shell and each section render their own Nuxt UI skeleton, with separate failure/retry states. The workspace directory queries current membership directly; there is no separate invitation inbox. The database remains authoritative. Serialized page metadata writes preserve ordering, and failed operations preserve the prior state or draft for retry.

Custom composables register Nuxt hooks synchronously. Register independent lazy queries synchronously rather than awaiting a combined readiness promise. Do not resume Nuxt composable calls after an arbitrary await inside a helper.

MySQL repositories own transactions and persistence mapping. Workspace creation includes its owner; adding members, groups, and access grants is transactional; workspace, folder and page deletion moves the resource to trash. Folder contents remain attached and become inaccessible until restoration. Permanent deletion is restricted to managers (workspaces: owner) and removes dependent records transactionally. Composite foreign keys prevent cross-workspace page placement. The split schema files export the same SQL model through `platform/database/schema/index.ts`. Development migrations start with `drizzle/0000_initial_schema.sql` and its matching snapshot and journal. Existing development databases use `bun run db:reset` when adopting this baseline; earlier migration history is intentionally removed. Subsequent schema changes use generated, reviewed migrations. `db:check` validates the migration chain; schema push is not part of the workflow.

Workspace metadata edits from home and settings share `useWorkspaceActions`, which updates detail and directory caches from the server response. Editor block types share one catalogue for slash commands and conversion menus. Public exports are limited to symbols consumed outside their file.

## Collaboration and comments

`PageDocumentService` authorizes document reads and replacements. Its `DocumentEditor` port delegates replacements to the collaboration hub, which writes Markdown and Yjs state together through the same serialized room queue used by live edits. Offline replacements open and dispose a temporary room. There is no separate direct-to-database Markdown writer. The hub checks access on connections and messages. Comments are separate persisted entities anchored with Yjs relative positions. Deleting quoted text does not discard its discussion. A server-only notification invalidates authorized clients' comment snapshots; reconnect performs a catch-up fetch. Requests coalesce and transient failures retry without periodic polling.

AI writing captures a relative selection before generation and resolves it before applying the result. Replacement rejects changed source text to protect concurrent edits. Ghost completions support accept/cancel and clear when the selection or document changes.

## Runtime and scaling

Run one Bun application process. Collaboration rooms and connected peers are coordinated in memory. Additional replicas require shared room ownership/coordination and a notification broker; ports make that replacement possible, but horizontal collaboration coordination is not implemented. MySQL and persistent image storage are external resources. Shutdown flushes rooms before closing the database.

## Verification and changes

`bun run verify` runs migration checks, Knip unused-code/dependency analysis, semantic style checks, lint boundaries, browser/server type checks, unit tests, production build, unauthenticated HTTP smoke and MySQL integration. Knip uses Nuxt discovery plus explicit CLI entry points; the only dependency exceptions cover Nuxt icon collection discovery and Nuxt typecheck tooling. Integration starts its own production listener and removes only its fixture records. CI provides an isolated MySQL database and runs the same command. A real Microsoft tenant login and live AI generation require configured external credentials; automated checks use signed identity fixtures and provider doubles.

When adding a capability, put its rules and ports in the owning feature, its concrete adapter beside that feature, and transport handling in Nuxt routes. Add a shared abstraction only when multiple features need the same contract. Test observable rules and failure cases rather than reproducing implementation details.

## Knowledge tools

`library` owns permission-filtered content search, personal favorites/recent pages, canonical internal backlinks, and built-in page templates. `recovery` owns trash and document snapshots. Document persistence saves Markdown, Yjs state, version checkpoints, links and mention identities in a transaction; live edits snapshot at most once per minute, while document replacement always checkpoints changed content. Each page retains up to 100 snapshots. Restoration runs through the existing collaboration queue and broadcasts to connected editors.

`notifications` stores recipient-specific activity and exposes an authenticated SSE invalidation stream. Reconnection catches up from MySQL; the stream revalidates sessions periodically. Reads re-check current membership, page/folder visibility and invitation expiry, so revoked access cannot expose historical page notifications. Current in-process invalidation assumes the same single-instance deployment as collaboration.

Workspace question answering first authorizes membership, then retrieves at most five matching document excerpts (10,000 characters each). The gateway receives only these readable excerpts. Answers return source IDs/titles separately for safe application links. This is bounded lexical retrieval, not an embedding/vector index. Model output is untrusted plain text; it cannot execute actions. Provider failures propagate as unavailable responses.


## Presentation and snapshot ownership

Directory screens share their shell and heading, while editor screens retain their document layout. Feature composables own query and mutation state, including Trash and invitation inbox actions; page history guards responses by request identity so a late preview or failure cannot replace a newer selection. Library cache identities are centralized in `libraryKeys`.

`recovery/domain/snapshotPolicy` owns checkpoint eligibility and retention. Both manual and collaborative snapshots use the same transactional database helper, with the page row locked before pruning. The document adapter receives a clock. Notification use cases receive an error reporter rather than writing to a concrete console transport.

The current development baseline includes all 20 tables, including the email outbox and its activity snapshots, in `0000_initial_schema.sql`. After replacing earlier development migration history, run `bun run db:reset` against local development MySQL. This removes existing development data. Future changes use additive generated migrations; never rewrite deployed production history.

See [design-system.md](design-system.md) for semantic sizing and the style audit rules.

## Email delivery

Notification persistence and its email outbox insert share a transaction. `mail` owns delivery policy, a persistence port and a sender port; the notification adapter uses the transaction-scoped enqueue helper. SMTP is never awaited by an HTTP request. The application lifecycle starts a timer-owned worker and waits for its active job only during shutdown, before closing the SMTP transport and database.

The MySQL outbox leases work with `FOR UPDATE SKIP LOCKED`, bounded attempts and lease tokens. Expired leases recover after a restart; conditional acknowledgements prevent stale workers from completing a newer lease. SMTP failures retry with exponential backoff (30 seconds initially, six attempts maximum), and only error codes are persisted. Current membership, active page/folder/workspace and the invitation's exact expiry version are rechecked before delivery. The SMTP adapter emits both text and escaped HTML with a stable Message-ID. Delivery is at least once; an SMTP acceptance followed by a crash before acknowledgement may duplicate a message.

Email is optional. Disabling it skips enqueueing and worker startup without disabling the in-app SSE inbox. Invitations enqueue for addresses without user accounts and link to Microsoft sign-in rather than exposing acceptance tokens. Automated HTTP suites disable mail; the email integration suite creates and drops its own temporary MySQL database and uses a local SMTP double, never the configured external relay. It requires CREATE/DROP DATABASE privileges in the test environment.

Email activity snapshots include the author, workspace/page names, invitation role and description, and bounded plain-text discussion/document excerpts. The outbox persists these alongside the notification so delivery retries render the triggering content. Templates escape all user text and preserve line breaks; they never render user HTML. Membership and visibility checks still run before SMTP delivery.

## Workspace governance

Workspace access includes a normalized settings value with safe defaults. `WorkspaceAccessPolicy` checks capability rules and archive state on content writes; collaboration authorization uses the same writable page port. Read-only and archived pages use an isolated Yjs snapshot with editing disabled. Commenters can annotate selected text; SSE invalidations keep snapshots and discussions current without opening a writable WebSocket. Settings and personal email preferences have independent lazy queries; management controls remain role-scoped in both the UI and API.

`settings` coordinates governance through repository, archive and journal ports. Ownership transfer and leaving lock the workspace and membership rows and recheck the current owner. Audit entries contain actor names, semantic actions and bounded target labels; management queries paginate by ordered UUID cursor. Document audit entries are committed with snapshot changes. Content services publish their metadata/membership events through the injected journal.

Personal email switches are persisted on membership rows, with invitation opt-out stored at account level because invitees may not yet be members. Enqueue and delivery both honor preferences. Daily jobs are scheduled for 01:00 UTC (08:00 Asia/Jakarta); the outbox leases up to 50 due recipient/workspace jobs together. The delivery service rechecks each item before rendering one summary and acknowledges or retries each leased record. In-app inbox events are independent of email preferences.

Workspace export uses Bun’s native gzip tar archive, safe names with stable IDs, and bounded memory (50 MB output content). It only reads local image filenames extracted from authorized active documents and never fetches remote URLs. Usage reports count referenced local attachments. Trash retention is explicitly opt-in and checks eligible workspaces every minute; expiry purges recheck soft-delete timestamps while holding the item row lock so restored/live items are protected. The default retains Trash until manual deletion.

## Membership and resource authorization

`members` owns immediate email membership, the filtered member directory, role hierarchy, groups, and bulk actions. Unregistered email membership is claimed by a matching verified Microsoft identity on login; there is no approval or pending invitation lifecycle. Only Owners manage Admins or group membership. Membership suspension takes effect in all authorization paths.

`access/domain/accessPolicy.ts` is the pure permission evaluator. `loadResourceScope` indexes workspace metadata, groups, and grants and applies that evaluator for lists, direct reads, recovery, search, AI, audit, exports, and queued mail. Individual grants take priority over group grants; group permissions combine by maximum level. The folder’s effective permission caps a page; a Viewer is capped at view. Expired grants are ignored. Owners retain full access; Admins receive no implicit restricted-document bypass.

Resource policy writes and member mutations acquire the workspace row lock before validating current permissions. Per-member override writes merge against the current policy inside that lock. Access changes revalidate editable collaboration sessions and close those that lost access and invalidate member navigation through authenticated events. Every WebSocket write rechecks writable page access. Image routes require a session and read access to the source page bound at upload time. Copying an image URL into another document cannot broaden that access. Workspace exports intersect image references with authorized source pages. Responses are private and uncached. Existing readable copies cannot be recalled from a client after revocation.

The initial development migration contains members, groups, grants, settings/audit, image upload ownership, and the mail outbox. It replaces the former approval-invitation schema. Tests use disposable fixtures, an isolated SMTP listener, and disabled external mail; no configured relay is used by automated verification.

## Management page ownership

Members owns adding/removing/suspending people, role assignment, groups, and reviewing effective document access. Settings owns workspace identity, opening page, capability rules, personal delivery preferences, audit, data/retention, and workspace lifecycle/ownership. Settings never edits an individual role or document grant. Members never edits workspace retention, preferences, or lifecycle. Document policies reuse one access component and one backend evaluator.

`WorkspaceManagementPage` and `SectionNavigation` give both screens the same heading, content width, navigation, responsive layout, loading/error presentation, and archive notice. Members queries and actions live in its feature composable. Activity and usage are requested when their category is opened. Settings PATCH accepts named sections, merges them under a workspace lock, rechecks the actor's current membership, and records the mutation in the same transaction. Refreshing server state preserves dirty fields in other sections. General details and the opening page have separate save actions.

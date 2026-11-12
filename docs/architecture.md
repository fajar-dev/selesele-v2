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
    workspaces/           Directory, membership, invitations, folders, navigation
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
    workspaces/           Authorization, workspace, folder and membership use cases
    pages/                Metadata and document access
    comments/             Discussion permissions and lifecycle
    writing/              Completion use case and provider adapter
    media/                Image policy, upload use case and storage port
    library/              Authorized discovery and templates
    recovery/             Trash access and shared snapshot policy
    notifications/        Recipient-scoped activity delivery
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

`workspaceKeys` defines cache identity. `useWorkspaceState` owns page/folder cache mutations, so creation, title changes, moves and deletion update the same workspace projection. Workspace metadata, folders, pages and members use independent authorized endpoints and cache keys. UI queries are lazy and load in parallel on the client; the shell and each section render their own Nuxt UI skeleton, with separate failure/retry states. Directory memberships and invitation inbox are independent too. The database remains authoritative. Serialized page metadata writes preserve ordering, and failed operations preserve the prior state or draft for retry.

Custom composables register Nuxt hooks synchronously. Register independent lazy queries synchronously rather than awaiting a combined readiness promise. Do not resume Nuxt composable calls after an arbitrary await inside a helper.

MySQL repositories own transactions and persistence mapping. Workspace creation includes its owner; invitation acceptance is atomic; workspace, folder and page deletion moves the resource to trash. Folder contents remain attached and become inaccessible until restoration. Permanent deletion is restricted to managers (workspaces: owner) and removes dependent records transactionally. Composite foreign keys prevent cross-workspace page placement. The split schema files export the same SQL model through `platform/database/schema/index.ts`. Development migrations start with `drizzle/0000_initial_schema.sql` and its matching snapshot and journal. Existing development databases use `bun run db:reset` when adopting this baseline; earlier migration history is intentionally removed. Subsequent schema changes use generated, reviewed migrations. `db:check` validates the migration chain; schema push is not part of the workflow.

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

The current development baseline includes all 15 tables in `0000_initial_schema.sql`. After replacing earlier development migration history, run `bun run db:reset` against local development MySQL. This removes existing development data. Future changes use additive generated migrations; never rewrite deployed production history.

See [design-system.md](design-system.md) for semantic sizing and the style audit rules.

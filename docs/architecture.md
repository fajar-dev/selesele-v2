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

MySQL repositories own transactions and persistence mapping. Workspace creation includes its owner; invitation acceptance is atomic; folder deletion reparents pages before removing the folder. Composite foreign keys prevent cross-workspace page placement. The split schema files export the same SQL model through `platform/database/schema/index.ts`. Versioned migrations remain the authoritative schema history. Generate and review a migration whenever that model changes; never rewrite applied migrations to hide history.

## Collaboration and comments

The collaboration hub authorizes page access through ports, persists Yjs updates and checks access on messages. Comments are separate persisted entities anchored with Yjs relative positions. Deleting quoted text does not discard its discussion. A server-only notification invalidates authorized clients' comment snapshots; reconnect performs a catch-up fetch. Requests coalesce and transient failures retry without periodic polling.

AI writing captures a relative selection before generation and resolves it before applying the result. Replacement rejects changed source text to protect concurrent edits. Ghost completions support accept/cancel and clear when the selection or document changes.

## Runtime and scaling

Run one Bun application process. Collaboration rooms and connected peers are coordinated in memory. Additional replicas require shared room ownership/coordination and a notification broker; ports make that replacement possible, but horizontal collaboration coordination is not implemented. MySQL and persistent image storage are external resources. Shutdown flushes rooms before closing the database.

## Verification and changes

`bun run verify` runs lint boundaries, browser/server type checks, unit tests, production build, unauthenticated HTTP smoke and MySQL integration. Integration starts its own production listener and removes only its fixture records. CI provides an isolated MySQL database and runs the same command. A real Microsoft tenant login and live AI generation require configured external credentials; automated checks use signed identity fixtures and provider doubles.

When adding a capability, put its rules and ports in the owning feature, its concrete adapter beside that feature, and transport handling in Nuxt routes. Add a shared abstraction only when multiple features need the same contract. Test observable rules and failure cases rather than reproducing implementation details.

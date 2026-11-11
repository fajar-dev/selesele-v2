# SeleSele

A workspace-based notes application built as one Nuxt 4 monolith on Bun. Microsoft Entra ID handles sign-in; MySQL stores workspaces, memberships, invitations, folders, pages, sessions, Markdown and Yjs document state. The Vue UI, API and collaboration WebSocket share one origin and one application process.

## Development

Requirements: Bun 1.4.4+ and MySQL 8. Docker is optional for local MySQL.

```sh
bun install --frozen-lockfile
cp .env.example .env
# Configure MySQL and Microsoft Entra ID.
docker compose up -d
bun run db:migrate
bun run dev
```

Open http://localhost:3000, sign in with Microsoft, and create a workspace. New accounts start with an empty workspace home. Workspaces are created explicitly; the application does not generate demonstration content.

The schema is a fresh workspace foundation. A development database from the previous model must be reset:

```sh
bun run db:reset  # Destructive: removes every table in the configured local database.
```

`db:reset` refuses production mode and non-local MySQL hosts. Use it only on a disposable development database. Startup never resets or migrates the database automatically. For later schema changes, run `bun run db:generate` and commit the generated SQL, snapshots and journal, then apply with `bun run db:migrate`.

## Workspaces, folders and pages

Membership belongs to a workspace. Every accepted member can read, create, edit, move and delete pages and folders in that workspace. Pages have no independent membership or invitation list. Membership uses immutable application user IDs; changing an email does not create membership in another workspace.

| Role | Pages and folders | Invite, revoke, manage members and workspace name | Delete workspace |
| --- | --- | --- | --- |
| Owner | Yes | Yes | Yes |
| Admin | Yes | Yes | No |
| Member | Yes | No | No |

The workspace creator becomes its owner in the same database transaction. No API can grant the owner role, demote the owner, or remove the owner. Role changes can grant `admin` or `member` only.

Owners and admins invite an email address with a role. Invitations appear in the recipient's workspace home after Microsoft sign-in; no email delivery service is configured. The recipient must accept before gaining access. Only the matching signed-in email can accept or decline. Invitations expire after seven days, can be cancelled, and are consumed atomically. Re-inviting refreshes an outstanding invitation without creating duplicates. Accepting an invitation never overwrites an existing membership role.

Folders are one level deep inside their workspace. Pages can live at the workspace root or inside a folder. The editor's page menu includes **Move to folder**, with the root as a destination. Application validation and a composite database foreign key prevent moving a page into another workspace's folder. Deleting a folder moves its pages to the root in one transaction. It does not delete their content.

Deleting a page or workspace makes it inaccessible. Revoking a member or deleting a workspace disconnects the relevant collaboration sockets. HTTP reads, writes and WebSocket messages independently check workspace membership. Unknown or inaccessible resources return 404.

## Microsoft authentication

Register a **single-tenant Web application** in Microsoft Entra ID:

1. Choose accounts in your organizational directory only.
2. Register `http://localhost:3000/api/auth/microsoft/callback` as a Web redirect URI; use the public HTTPS origin in production.
3. Set `MICROSOFT_TENANT_ID` to the Directory UUID, `MICROSOFT_CLIENT_ID` to the Application UUID, and `MICROSOFT_CLIENT_SECRET` to the secret value.
4. Generate a private random `AUTH_SECRET` with at least 32 characters using the command in `.env.example`.
5. Set `APP_ORIGIN` to the exact public origin. All credentials are runtime-only server configuration.

The directory is explicitly trusted. Tenant UUIDs are required; arbitrary tenant domains and `common` are rejected. Configure an email claim or a valid email-formatted `preferred_username` so that users can receive workspace invitations. Personal Microsoft accounts can be guests of the configured directory. See [Microsoft's authorization code flow documentation](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow).

The server uses authorization code flow with PKCE S256, state, nonce, OpenID discovery and JWKS signature verification. It validates issuer, audience, expiry and tenant. The immutable tenant/object ID pair identifies an account. OAuth transaction data is encrypted in a ten-minute `HttpOnly`, `SameSite=Lax` cookie. Successful login creates an opaque 14-day session; MySQL stores only its SHA-256 digest. Refresh rotates a token atomically. Production cookies use `Secure`, and mutations and WebSocket upgrades check the request origin.

## Editor and collaboration

The editor supports rich text, slash commands, task lists, tables, images, mentions of workspace members, code highlighting, Markdown export and AI writing assistance. PDF export is not included.

Native Nitro WebSockets synchronize TipTap/Yjs documents. The server initializes each document once, saves updates before broadcasting, and flushes the final state before disposing a room. Browser clients wait for synchronization. Membership revocation applies to every page in the workspace, including currently connected editors.

Gemini writing assistance is separate from authentication. Set `GOOGLE_GENERATIVE_AI_API_KEY` and optionally `AI_MODEL` to enable it. Image uploads accept PNG, JPEG, GIF and WebP up to 2 MB and use generated filenames. Their URLs are public asset URLs. Persist `UPLOAD_DIR` outside `.output` and limit reverse-proxy request bodies to 3 MB.

## Architecture

```text
app/
  pages/                     Workspace home, workspace and page routes, Microsoft sign-in
  layouts/workspace.vue      Persistent workspace navigation and mobile shell
  components/workspaces/     Sidebar, membership and workspace/folder forms
  components/pages/          Page metadata, move dialog and editor shell
  components/editor/         Rich-text UI and node views
  editor/extensions/         TipTap extensions
  composables/               Request-scoped state and editor lifecycle
  services/                  Stateless internal API clients
  utils/                     Presentation and editor helpers
shared/
  types/                     Auth, workspace and page API contracts
  validation/                Shared Zod request schemas
server/
  domain/entities/           Account, workspace, folder, invitation, page and session
  domain/ports/              Repository, provider and transport interfaces
  application/               Workspace, folder, page, authentication and AI use cases
  infrastructure/database/   MySQL schema, pool and separate entity/document repositories
  infrastructure/            Microsoft OIDC, AI, image storage and Yjs adapters
  http/                      Transport schemas, cookies, origin checks and response handling
  api/                       Thin authenticated HTTP handlers
  routes/                    WebSocket and image routes
  container.ts               Dependency composition and resource lifecycle
drizzle/                     Workspace foundation migration and metadata
scripts/                     Local reset, integration smoke, production smoke and dependency audit
tests/                       Authorization, OAuth, session, validation and collaboration tests
```

Application services depend on domain ports. Repositories implement persistence and atomic operations; HTTP handlers validate requests and translate responses. ESLint enforces layer boundaries, type-only imports, two-space indentation, single quotes and braces. Shared validation has no framework dependencies. Vue state is isolated per SSR request. Plain TypeScript editor extensions remain outside Vue component directories.

## API

Endpoints share the application origin and use `{ success, message, data }`. Errors use Nitro's HTTP error format. All APIs except health and Microsoft sign-in require a session.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/auth/microsoft` | Begin Microsoft sign-in |
| GET | `/api/auth/microsoft/callback` | Validate identity, create session, redirect home |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/refresh` | Rotate session |
| POST | `/api/auth/logout` | Revoke session and connections |
| GET / POST | `/api/workspaces` | List memberships / create workspace |
| GET | `/api/workspaces/:workspaceId` | Workspace overview with folders, pages and members |
| PATCH / DELETE | `/api/workspaces/:workspaceId` | Rename / delete workspace |
| POST | `/api/workspaces/:workspaceId/folders` | Create folder |
| PATCH / DELETE | `/api/workspaces/:workspaceId/folders/:folderId` | Rename / delete folder |
| POST | `/api/workspaces/:workspaceId/pages` | Create page, optionally in a folder |
| GET | `/api/workspaces/:workspaceId/members` | List members |
| PATCH / DELETE | `/api/workspaces/:workspaceId/members/:userId` | Change role / revoke member |
| GET / POST | `/api/workspaces/:workspaceId/invitations` | List / create invitations |
| DELETE | `/api/workspaces/:workspaceId/invitations/:invitationId` | Cancel invitation |
| GET | `/api/invitations` | Signed-in user's invitation inbox |
| POST | `/api/invitations/:invitationId/accept` | Accept invitation |
| DELETE | `/api/invitations/:invitationId` | Decline invitation |
| GET / PUT / DELETE | `/api/pages/:id` | Read / edit metadata / delete page |
| PATCH | `/api/pages/:id/location` | Move page with `{ folderId: UUID or null }` |
| GET / POST | `/api/pages/:id/content` | Read / replace Markdown |
| GET | `/api/pages/:id/md` | Export Markdown |
| POST | `/api/upload` | Upload image in multipart `file` |
| POST | `/api/completion` | Stream writing assistance |
| GET | `/api/health` | Process health |
| WS | `/collaboration/:id` | Workspace-authorized Yjs synchronization |

There are no page invitation, page permission, or global page collection endpoints.

## Verification

```sh
bun run lint
bun run typecheck
bun run typecheck:server
bun run test
bun run build
bun run test:smoke
bun run deps:check
```

The unit tests cover workspace isolation, owner protection, cross-workspace folder rejection, membership revocation, document synchronization, Microsoft token validation, session rotation, shared schemas and image storage.

With MySQL migrated and a local app server running:

```sh
bun run test:integration
# Different local port:
SMOKE_ORIGIN=http://127.0.0.1:8030 bun run test:integration
```

Integration smoke uses temporary accounts created directly through the application service, verifies real HTTP/SSR, workspace/folder/page creation, moves, invitation acceptance and replay rejection, authorization, Markdown persistence, live WebSocket revocation and logout. It cleans up its records and is restricted to local servers. It does not perform a real Microsoft sign-in; OAuth verification is separately exercised using signed test tokens. The production smoke starts its own production listener and checks unauthenticated routes, SSR, callback protection, request origins and WebSocket upgrades.

## Dependencies and deployment

Bun 1.4.4 is pinned in `.bun-version` and `packageManager`. All direct dependencies follow npm's latest release tags, checked with `bun run deps:check`. Nuxt 4.6.4 uses its compatible stable Nitro server adapter. TypeScript 7 provides the native server checker; the `@typescript/typescript6` compiler API compatibility alias supports Vue and ESLint, following [Microsoft's side-by-side guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0).

```sh
bun install --frozen-lockfile
bun run build
bun run db:migrate
PORT=8030 APP_ORIGIN=https://your-domain.example bun run start
```

Provide the variables in `.env.example`. Bun reads `.env` from the working directory. Production requires HTTPS, persistent image storage, and reverse-proxy support for WebSocket upgrades. Run one Bun instance because collaboration rooms are coordinated in process; horizontal scaling requires shared room coordination. Shutdown flushes rooms before releasing MySQL. PM2 is optional through `ecosystem.config.cjs`.

## License

[MIT](./LICENSE)

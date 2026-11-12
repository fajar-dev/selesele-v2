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

Open http://localhost:3000, sign in with Microsoft, and create a workspace. New accounts start with an empty workspace home. Creating a workspace immediately opens an Untitled workspace with its name focused for inline editing; the application does not generate demonstration content.

Startup does not reset or migrate the database. For schema changes, run `bun run db:generate`, review and commit the SQL and migration metadata, then run `bun run db:migrate`. The optional `bun run db:reset` command removes every table in a disposable local development database; it refuses production and remote hosts.

## Workspaces, folders and pages

Membership belongs to a workspace. Every accepted member can read, create, edit, move and delete pages and folders in that workspace. Pages have no independent membership or invitation list. Membership uses immutable application user IDs; changing an email does not create membership in another workspace.

| Role | Pages and folders | Invite, revoke, manage members and workspace name | Delete workspace |
| --- | --- | --- | --- |
| Owner | Yes | Yes | Yes |
| Admin | Yes | Yes | No |
| Member | Yes | No | No |

The workspace creator becomes its owner in the same database transaction. No API can grant the owner role, demote the owner, or remove the owner. Role changes can grant `admin` or `member` only.

Owners and admins invite an email address with a role. Invitations appear in the recipient's workspace home after Microsoft sign-in; no email delivery service is configured. The recipient must accept before gaining access. Only the matching signed-in email can accept or decline. Invitations expire after seven days, can be cancelled, and are consumed atomically. Re-inviting refreshes an outstanding invitation without creating duplicates. Accepting an invitation never overwrites an existing membership role.

Folders are one level deep inside their workspace. Pages can live at the workspace root or inside a folder. Drag pages onto a sidebar folder to move them, or onto the Pages heading to return them to the workspace root. Page action menus contain Delete; folder menus offer New page and Delete. New page creates directly inside that folder. Create pages directly and edit their titles and icons inline; new folders open immediately with a default 📁 icon and a focused inline name field. Workspace and folder headings expose inline name, emoji icon and description editing; pages expose inline title, icon and description editing. Descriptions are optional and can be cleared. Workspace metadata is editable by owners and admins. Page, folder and workspace icon selection share one component; saved icons appear in navigation, breadcrumbs, the directory and page locations. Application validation and a composite database foreign key prevent moving a page into another workspace's folder. Deleting a folder moves its pages to the root in one transaction. It does not delete their content.

Members can select page text and choose **Comment** (or use **Cmd/Ctrl + Alt + M**) to start a discussion. Click a highlighted passage or the Comments toolbar button to open its replies. Members can resolve and reopen discussions; creators and workspace managers can delete them. Open and resolved discussions are stored separately from the document, using Yjs relative text positions so highlights follow collaborative edits. If the selected text is removed, its discussion and original quotation remain available. Comment changes notify authorized page viewers immediately over the existing collaboration WebSocket. Clients fetch a fresh snapshot on each notification and after reconnecting; overlapping requests are coalesced, and transient fetch failures retry automatically. No periodic comment polling is used. Failed submissions preserve the draft for retry. Closing the panel preserves a new comment draft.


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

## Interface and theming

The interface uses Nuxt UI components for navigation controls, tables, cards, empty states, dialogs, mobile slideovers, forms and the editor. `app/app.config.ts` defines shared component styling; `app/assets/css/main.css` owns the monochrome light/dark palette, typography, subtle separators and motion preferences. Cards use a subtle 6 px radius, controls use 2–5 px, and dialogs use 8 px. Empty states use a single divider instead of a full frame. Folder links and page lists use open rows with subtle separators; sidebar selection uses a light background instead of a heavy accent stripe. Navigation uses Lucide SVG icons with no decorative covers or canvas artwork. `app/features/workspaces/utils/workspacePresentation.ts` keeps page-count formatting separate from business logic.

The home header aligns its logo and account controls to the same content gutters as the page. The navbar provides a light/dark toggle beside the account button. The account dropdown contains only the user identity and sign-out action.

Home offers searchable list and grid workspace layouts, with a persistent layout preference. Grid cards include the workspace icon, role, description and creation date. The create action stays next to the page heading. Workspace and page layout controls share the same component.

Workspace, folder, document and settings screens share `PageContent`, `PageHeading` and `PageBreadcrumbs`. The shared container fixes content width and responsive gutters; headings use the same typography and inline icon placement. Editor actions live below the document heading rather than adding a second global header row. The editor body and its heading use the same container with no extra text inset.

The sidebar's workspace switcher lists the current user's workspaces and refreshes on opening. Members and Settings are dedicated pages in the sidebar. Members includes invitations, role changes and member removal; Invite teammates links directly to its invitation form. Settings appears below Members. Owners and admins can rename a workspace; members see read-only details, and only owners can delete it. Mutations refresh the workspace directory and home list, while the server remains responsible for enforcing role permissions.

The workspace sidebar has one combined page/folder list. Its add menu creates either a page or a folder; page and folder context menus contain only Delete. Drag a page onto a folder row to move it, or onto the Pages heading to return it to the workspace root. Collapsed destinations open while dragging. Moves persist through the existing workspace-scoped location endpoint, and failed saves preserve the original location. Search matches page titles and folder names while retaining their hierarchy.

## Architecture

The monolith is organized by business capability. Browser features own their API clients, composables and components. Server features separate domain ports, application services and infrastructure adapters. Shared contracts and validation remain framework-free. Request-scoped composition preserves SSR isolation, and ESLint enforces dependency boundaries.

See [architecture and engineering guide](docs/architecture.md) for the directory map, state ownership, persistence rules, collaboration lifecycle and scaling constraints.

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
| GET | `/api/workspaces/:workspaceId` | Workspace metadata and current role |
| PATCH / DELETE | `/api/workspaces/:workspaceId` | Rename / delete workspace |
| GET / POST | `/api/workspaces/:workspaceId/folders` | List / create folders |
| PATCH / DELETE | `/api/workspaces/:workspaceId/folders/:folderId` | Edit name/description / delete folder |
| GET / POST | `/api/workspaces/:workspaceId/pages` | List / create pages, optionally in a folder |
| GET | `/api/workspaces/:workspaceId/members` | List members |
| PATCH / DELETE | `/api/workspaces/:workspaceId/members/:userId` | Change role / revoke member |
| GET / POST | `/api/workspaces/:workspaceId/invitations` | List / create invitations |
| DELETE | `/api/workspaces/:workspaceId/invitations/:invitationId` | Cancel invitation |
| GET | `/api/invitations` | Signed-in user's invitation inbox |
| POST | `/api/invitations/:invitationId/accept` | Accept invitation |
| DELETE | `/api/invitations/:invitationId` | Decline invitation |
| GET / PUT / DELETE | `/api/pages/:id` | Read / edit metadata / delete page |
| PATCH | `/api/pages/:id/location` | Move page with `{ folderId: UUID or null }` |
| GET / POST | `/api/pages/:id/comments` | List / create text discussions (quote, relative anchor, body) |
| POST | `/api/pages/:id/comments/:threadId/replies` | Reply to an open discussion |
| PATCH | `/api/pages/:id/comments/:threadId` | Resolve / reopen with `{ resolved: boolean }` |
| DELETE | `/api/pages/:id/comments/:threadId` | Delete a discussion (creator or workspace manager) |
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

With MySQL migrated and a production build available, integration starts and stops its own local server:

```sh
bun run test:integration
# Complete local/CI verification:
bun run verify
```

Integration smoke uses temporary accounts created directly through the application service, verifies real HTTP/SSR, workspace/folder/page creation, moves, invitation acceptance and replay rejection, authorization, Markdown persistence, live WebSocket revocation and logout. It cleans up its records and is restricted to local servers. It does not perform a real Microsoft sign-in; OAuth verification is separately exercised using signed test tokens. The production smoke starts its own production listener and checks unauthenticated routes, SSR, callback protection, request origins and WebSocket upgrades.

## Dependencies and deployment

Bun 1.4.4 is pinned in `.bun-version` and `packageManager`. The lockfile fixes the installed dependency graph; `bun run deps:check` compares direct dependencies with npm release tags. Nuxt 4.6.4 uses its compatible stable Nitro server adapter. TypeScript 7 provides the native server checker; the `@typescript/typescript6` compiler API compatibility alias supports Vue and ESLint, following [Microsoft's side-by-side guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0).

```sh
bun install --frozen-lockfile
bun run build
bun run db:migrate
PORT=8030 APP_ORIGIN=https://your-domain.example bun run start
```

Provide the variables in `.env.example`. Bun reads `.env` from the working directory. Production requires HTTPS, persistent image storage, and reverse-proxy support for WebSocket upgrades. Run one Bun instance because collaboration rooms are coordinated in process; horizontal scaling requires shared room coordination. Shutdown flushes rooms before releasing MySQL. PM2 is optional through `ecosystem.config.cjs`.

## License

[MIT](./LICENSE)

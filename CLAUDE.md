# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Calendary is a personal calendar / time / task / project management server: a Kotlin + Spring Boot backend with a documented API and Postgres migrations via Flyway, and a Bun + React SSR frontend (no Next.js). Full product/domain spec (roles, workspaces, public calendar, data model, roadmap) lives in `docs/product-spec.md` (French) — read it before making product-behavior decisions, this file only covers things needed to be productive in the code.

## Commands

### Backend (root directory)

- Start Postgres: `docker compose up -d postgres`
- Run the backend: `./gradlew bootRun` — serves on `http://localhost:8080`, Swagger UI at `/swagger-ui/index.html`, OpenAPI JSON at `/v3/api-docs`
- Run all tests: `./gradlew test`
- Run one test class: `./gradlew test --tests "com.calendary.tasks.TaskAssigneeIntegrationTests"`
- Run one test method: `./gradlew test --tests "com.calendary.tasks.TaskAssigneeIntegrationTests.assigns a collaborator to a task on create and notifies them"`
- Fast compile-only check: `./gradlew compileKotlin compileTestKotlin`

B2 object storage and Google Calendar integrations default to disabled (`CALENDARY_B2_ENABLED=false`, `CALENDARY_GOOGLE_CALENDAR_ENABLED=false`), so the backend and test suite run locally with no cloud credentials. Integration tests use Testcontainers Postgres.

### Frontend (`frontend/`)

- Install: `bun install`
- Dev server (SSR via Vite middleware, dev proxy to the backend): `bun run dev` → `http://localhost:5173`
- Typecheck: `bun run typecheck`
- Build client + SSR bundles: `bun run build`
- Production server: `bun run start` (requires `NODE_ENV=production` and a built `dist/`)

There is no frontend lint or test script configured — `typecheck` + `build` are what catch breakage before a PR.

## Architecture

### Backend: vertical feature packages, not horizontal layers

`src/main/kotlin/com/calendary/<feature>/{api,application,domain,infra}` — each feature owns its own controllers, services/commands, JPA entities, and Spring Data repositories. Cross-feature access goes through the other feature's service, not its repository (e.g. `TaskService` depends on `WorkspaceAccessService` and `ProjectRepository` directly for ownership checks, but resource access control is centralized in `resources`/`workspaces`).

Feature packages: `auth`, `users`, `workspaces`, `onboarding` (bootstrap + invitations), `tasks`, `projects` (Project and Epic are the same entity; `ProjectType` discriminates), `events`, `calendar` (the `CalendarBlock` model — see below), `booking` (public booking requests), `collaboration` (cross-workspace resource sharing, confirmation-gated), `notifications` (WebSocket + email), `attachments`, `storage` (Backblaze B2), `mail`, `publiccalendar`, `resources` (shared access-control for shareable resource types), `common` (cross-cutting: exception handling, persistence base classes).

### CalendarBlock is the calendar's source of truth — Task and Event do not store time the same way

`Event` stores `startsAt`/`endsAt` directly on its entity. **`Task` does not.** A task only gets a `CalendarBlock` row (`sourceType=TASK, sourceId=task.id`, in the `calendar` package) if it's given a planned execution window — that's a separate concept from its `dueAt` deadline. Because of this, `TaskService.create/update/get/list` all return a `TaskWithSchedule(task, block)` wrapper instead of bare `Task`, so `TaskController` can build a `TaskResponse` that includes `plannedStart`/`plannedEnd`/`timezone`; `Task.toResponse()` by itself has no access to the calendar block. The main calendar view and the public calendar both render from `CalendarBlock` rows, never by querying tasks/events directly for a time range.

A Task therefore has three independent date concepts — don't conflate them: `plannedStart`/`plannedEnd` (CalendarBlock — "when do I work on this"), `dueAt` (deadline, what the Timeline view keys off), and nothing else.

### Auth is session-based, not JWT

`spring-session-jdbc` backs the session store; the cookie is `JSESSIONID`. `AuthSessionService.signIn()` calls `request.changeSessionId()` on login (session-fixation protection) — a captured cookie from before login won't carry over.

### Frontend talks to the backend directly in production — no server-side proxy

`frontend/src/server.ts` only does SSR rendering and serves static files; it does not proxy `/api` calls. The browser calls the backend's own public origin directly, using `CALENDARY_API_BASE_URL` injected into `window.__API_BASE_URL__` by the HTML template (`resolveUrl()` in `frontend/src/lib/api.ts` reads it). This means the backend must allow the frontend's origin via CORS (`CALENDARY_FRONTEND_ORIGIN`, wired in `SecurityConfig.kt`, see `docker-compose.prod.yml`). In dev, none of this applies: Vite's own proxy (`vite.config.ts`) forwards `/api`, `/public`, `/ws` to `localhost:8080`, and `window.__API_BASE_URL__` is unset so `resolveUrl()` stays relative.

### One shared editor component for four resource kinds

`frontend/src/features/details/detail-pages.tsx`'s `ResourceEditor`/`ResourceDetail` handle Task, Event, Project, and Epic through a single form, with kind-specific fields conditionally rendered. `useResourceDraftQuery` builds a fresh draft object from whichever query (`useTaskQuery`/`useEventQuery`/`useProjectQuery`) is active for the current kind — that derivation must stay `useMemo`'d on the underlying query data. Recomputing it inline gives every render a "new" object, which loops an effect that depends on it forever.

### Timezones are resolved client-side, per viewer

Calendar items are stored as UTC instants; bucketing into a day column and formatting as a time-of-day happens client-side per the viewer's selected timezone (`frontend/src/lib/timezone.ts`: `dayIndexInTimezone`, `formatTimeInTimezone`). `dayIndexInTimezone` returns `-1` when a date falls outside the visible day range — callers must filter those out rather than clamp onto day 0, or an item shifted across a week boundary by timezone math renders on the wrong day.

### Theming

Six themes (`solar-orange`, `paper-green`, `clear-blue` light; `ember-dark`, `graphite-cyan`, `plum-night` dark) are applied via `data-theme`/`data-mode` attributes on `<html>`, set by an inline script in `frontend/index.html` (and persisted server-side per workspace, with localStorage as the anonymous-visitor fallback). Tokens live in `frontend/src/styles/globals.css`. The MDX markdown editor's own stylesheet (`@mdxeditor/editor/style.css`) ships unlayered CSS — per the CSS cascade-layers spec, unlayered rules always beat anything inside `@layer components`, so editor theme overrides must stay unlayered too or the library's hardcoded light-mode colors win.

### Deployment

`docker-compose.prod.yml` (used by Coolify) runs three services (Postgres, backend, frontend) from prebuilt GHCR images with `pull_policy: always` — without it, `docker compose up -d` can silently keep running a stale cached image even after CI pushed a new one under the same tag. `.github/workflows/ci.yml` builds and pushes both images on every push to `main`, then triggers a Coolify deploy.

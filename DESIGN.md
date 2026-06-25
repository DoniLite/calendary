# Calendary — Design Reference

This is the UI/visual design reference: tokens, layout shells, shared components, and the
conventions the frontend follows. For *what* the product does (roles, workspaces, sharing rules,
data model), see `docs/product-spec.md`. For engineering navigation, see `CLAUDE.md`.

## Three portals, one app

The frontend is one Bun/React SSR app (`frontend/`) serving three distinct route trees, each with
its own layout shell:

- **`/app/*`** — the super admin's authenticated workspace (`AppRouteLayout`).
- **`/collab/*`** — a collaborator's authenticated portal (`components/layout/collaborator-shell.tsx`), same features, scoped to what's been shared with them.
- **`/p/<publicSlug>/*`** — the public, unauthenticated calendar/booking pages (`components/layout/public-shell.tsx`), no login required.

Resource pages (Task/Event/Project/Epic create, edit, detail) are shared between `/app` and
`/collab` through the same components in `frontend/src/features/details/detail-pages.tsx` — the
component branches on whether the current path starts with `/collab` to pick the right back-link
and edit-link targets, rather than duplicating the page per portal.

## Theming

Six themes, toggled via `data-theme="<name>"` + `data-mode="light"|"dark"` on `<html>`:

| Theme | Mode | Accent |
|---|---|---|
| `solar-orange` | light | orange (default) |
| `paper-green` | light | green |
| `clear-blue` | light | blue |
| `ember-dark` | dark | orange |
| `graphite-cyan` | dark | cyan |
| `plum-night` | dark | violet |

Tokens are HSL triplets consumed as `hsl(var(--token))`, defined per theme in
`frontend/src/styles/globals.css`. Two token families:

- **Structural** (shadcn-style): `--background`, `--foreground`, `--card`, `--card-foreground`,
  `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`,
  `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`,
  `--destructive-foreground`, `--border`, `--input`, `--ring`.
- **Business/domain**: `--event`, `--task`, `--project`, `--available`, `--busy` — used to color
  calendar blocks and status badges by *kind*, independent of the structural palette, so a task
  always reads as "task-colored" regardless of which of the six themes is active.

Resolution order: an authenticated user's theme is persisted server-side on their workspace
(`PATCH /api/workspaces/{id}/theme`) and synced by `frontend/src/features/theme/theme-provider.tsx`.
Anonymous public-calendar visitors have no session, so they fall back to `localStorage`
(`calendary.theme`), read by an inline script in `frontend/index.html` before first paint to avoid
a flash of the wrong theme.

The MDX markdown editor (`frontend/src/components/rich-markdown-editor.client.tsx`, wraps
`@mdxeditor/editor`) needs its own override block in `globals.css` (`.calendary-mdx-editor*`)
because the library ships its own unlayered stylesheet — per the CSS cascade-layers spec,
unlayered rules beat anything declared inside `@layer components`, so naive Tailwind component
classes silently lose to the library's hardcoded light-mode colors. The override rules must stay
unlayered too.

## Layout primitives (`frontend/src/components/ui/`)

Small, composable, not a full design-system library:

- `Panel` / `PanelHeader` / `PanelTitle` / `PanelBody` — the card-like container used for every
  content block across the app (forms, lists, calendar grid, detail panels).
- `Button` — variants for primary actions vs. `secondary` (toolbar/nav actions).
- `Badge` — status/kind pills; `tone` prop maps to the business tokens (`task`, `event`,
  `project`, `success`/`available`, `danger`/`busy`, `muted`).
- `TabBar` / `TabButton` — used for in-page mode switches (Calendar's Week/Day/Agenda, Projects'
  All/Projects/Epics filter) — not page-level navigation, which lives in the shell sidebar instead.
- `Combobox` / `MultiCombobox` — searchable single/multi select (built on `cmdk` + `Popover`),
  the default for any "pick one of many" field with more than a handful of options (project/epic/
  parent-task linking, assignee/participant lists, public booking slot selection). Plain
  `<select>` is reserved for small fixed enums (status, priority, visibility, timezone list).
- `Command` / `CommandDialog` (`command.tsx`) — also backs the global Cmd+K/Ctrl+K search palette
  (`frontend/src/features/search/command-palette.tsx`), a lightweight jump-to-resource shell over
  already-loaded tasks/projects/events (not a full-text search backend).

## The resource editor: one form, four kinds

`frontend/src/features/details/detail-pages.tsx` implements Task/Event/Project/Epic
create/edit/detail through two generic components, `ResourceEditor` and `ResourceDetail`, rather
than four near-duplicate pages. Kind-specific fields (planned start/end for Task and Event,
project/epic linking for Task, start/due dates for Project/Epic, assignees vs. participants, ...)
are conditionally rendered based on `kind`. New resource kinds should extend this pattern rather
than fork a new page.

Two distinct date concepts on the form, deliberately separate fields:

- **Starts at / Ends at** (`datetime-local`) — Task/Event only, "when do I work on this", backed
  by a `CalendarBlock` and what the calendar grid renders.
- **Due date** (`date`) — Task and Project/Epic, the deadline, what the Timeline view keys off.

## Calendar visualization

`frontend/src/features/calendar/calendar-view.tsx` (authenticated) and
`frontend/src/features/public/public-calendar-page.tsx` (public) both render a day/hour grid:
absolutely-positioned blocks inside a day column, `top`/`height` computed from the item's
start/end time in minutes relative to the grid's first displayed hour, multiplied by a fixed
`hourHeight`. Overlapping items in the same day split into side-by-side columns (`layoutDay`) so
concurrent items stay individually readable instead of stacking on top of each other. Items whose
day, once converted to the viewer's selected timezone, falls outside the currently displayed week
are excluded rather than clamped onto the first visible day.

The public availability page (`PublicAvailabilityPage`) deliberately does *not* render every
fetched slot as a flat list — it groups slots by day, shows one day at a time via a day picker
(with a free-slot count per day), and lets the visitor page through weeks. Past days of the
current week are hidden from the day picker.

**Open item:** the visual treatment for clearly showing a time range's start-to-end span (and how
overlapping items should look side by side) on the main calendar is still pending a design
reference from the product owner — the positioning math is correct, but the polish pass hasn't
landed yet.

## Forms

`react-hook-form` + `zod` (`frontend/src/lib/schemas.ts`) for every form. Validation errors render
via `FieldError`. Mutations come from typed hooks in `frontend/src/lib/api.ts`
(`useResourceMutations`, `useWorkspaceSettingsMutation`, etc.) built on TanStack Query — a
mutation's `onSuccess` invalidates the specific query keys it affects rather than refetching
everything.

## i18n

`frontend/src/locales/{en,fr}.json` via `i18next`/`react-i18next`. New user-facing strings belong
in both files, not hardcoded in components.

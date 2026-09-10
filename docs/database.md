# Cloud workspace database

UI reads and saves through authenticated `/api/workspace`. Cloudflare D1 is the source of truth. Browser storage is a recovery cache, not a shared database. A single team workspace uses the existing Skill administrator password; the server issues a 24-hour HttpOnly session cookie. No passwords are bundled in the UI.

## Tables

`customers` contains stable IDs, name, website and core profile fields. `projects` references `products`. `project_customers` holds membership. `evidence`, `channels`, `contacts`, `assessments`, `followups`, `material_briefs` and `drafts` reference customers with foreign keys. Variable bilingual research payloads use JSON columns; relational IDs and source URLs remain queryable. The current UI keeps customer stage/notes global across projects. Per-product assessment assignment and independent project stages are not yet exposed.

## API for UI and Skill integrations

POST `/api/session` with `{password}` obtains a session cookie. GET `/api/workspace` returns `{revision,customers,projects,drafts}`. PUT the same structure with the revision read previously. Responses: 200 saved with new revision, 400 invalid references/input, 401 login required, 409 stale revision, 503 unavailable. All writes use a single transactional batch. A failed revision check rolls back the complete write. This initial implementation saves a complete workspace snapshot, appropriate to the current small customer list. It is not a high-volume row-level API.

The browser waits 650 ms after changes, serializes saves, and shows saved/pending/error status. Changes are not claimed saved until the server acknowledges. Refresh loads current cloud records. Concurrent modifications return a conflict rather than replacing another device's data. Export the unsaved page before refreshing on conflict.

## Migration and recovery

Schema: `migrations/0001_workspace.sql`. Apply using Wrangler D1 migrations. First empty workspace imports the shipped demo and researched customers, with demo markers retained. Existing browser records are backed up once under `tg-before-database`. The explicit import button merges old records by ID after confirmation; matching records use the old browser data. Cloud-only customers remain. Project deletion tombstones are retained.

Export backup downloads the current workspace JSON. D1 can also be exported through Wrangler or Cloudflare's dashboard. This release does not add a scheduler or claim Google/social integrations are complete.

Database: `find-prospects-db`. Binding: `DB`.

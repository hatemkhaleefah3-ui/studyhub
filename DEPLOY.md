# Deploying Study Hub to Cloudflare Pages + D1

## Prerequisites
- A Cloudflare account
- This repo pushed to a GitHub repository
- Node.js + `wrangler` CLI installed (`npm i -g wrangler`)

---

## 1 — Build the frontend locally (verify it works)

```bash
pnpm --filter @workspace/study-hub run build
# Output: artifacts/study-hub/dist/public/
```

---

## 2 — Create a Cloudflare D1 database

```bash
wrangler login
wrangler d1 create study-hub-db
```

Copy the `database_id` from the output and paste it into **`wrangler.toml`**:

```toml
[[d1_databases]]
binding = "DB"
database_name = "study-hub-db"
database_id = "YOUR_DATABASE_ID_HERE"   # ← replace this
```

---

## 3 — Apply the database schema

```bash
wrangler d1 execute study-hub-db --file=schema.sql
```

---

## 4 — Connect your GitHub repo to Cloudflare Pages

1. Go to **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**.
2. Select your GitHub repository.
3. Set build settings:
   | Setting | Value |
   |---|---|
   | **Framework preset** | None |
   | **Build command** | `pnpm --filter @workspace/study-hub run build` |
   | **Build output directory** | `artifacts/study-hub/dist/public` |
   | **Root directory** | `/` (repo root) |

---

## 5 — Bind the D1 database to your Pages project

1. In the Cloudflare Pages project → **Settings → Functions → D1 database bindings**.
2. Add a binding:
   - Variable name: `DB`
   - Database: `study-hub-db`

---

## 6 — Deploy

Push any commit to your main branch — Cloudflare Pages will auto-build and deploy.

The API is served by `functions/api/study/[[path]].ts` (Cloudflare Pages Functions).  
The frontend fetches `/api/study/*` which is automatically routed to the function.

---

## Local development (Replit preview)

In Replit, the frontend (`study-hub`) calls the same `/api/study/*` routes, but
they are handled by the Express API server (`artifacts/api-server`) connected to
the provisioned PostgreSQL database.

No environment variables need to be changed between local dev and production —
the routes are identical.

# v1 launch configuration and operational runbook

This document describes **production configuration** for the IRL **web application** hosted on **Vercel** with **Supabase** as the primary database. It is written for **operators** (plain steps) and **engineers** (technical detail). It is **not** an incident-response or rollback playbook.

**Secrets policy:** Never copy real API keys, tokens, or private keys into Linear, GitHub issues, or chat. In Vercel and local `.env.local`, store values only as **environment variables**. This document names variables and files; it does not contain production values.

**Primary env reference:** See [`.env.local.example`](../.env.local.example) for variable names, defaults, and inline comments.

---

## Quick path (operators)

1. **Configuration** lives in the [Vercel](https://vercel.com) project → **Settings → Environment Variables** (per environment: Production / Preview / Development).
2. **Deployments** tab: confirm the latest production deployment is **Ready** and matches the intended Git branch or commit.
3. **When something looks wrong**, the on-call engineer checks:
   - **Vercel:** Project → **Logs** (or **Runtime Logs**) for the production deployment and for **Cron** executions if applicable.
   - **Supabase:** Project → **Logs** (API, Postgres, Auth, Edge as relevant) for errors tied to the same time window.
4. **Full variable reference** is not duplicated here: open `.env.local.example` in the repo (or `vercel env pull` if you use the CLI—see below) and compare names to what is set in Vercel.

---

## Production architecture (v1 scope)

| Piece                | Role                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vercel**           | Hosts the Next.js app, serverless API routes, build pipeline, scheduled **Cron Jobs** from [`vercel.json`](../vercel.json).                                                 |
| **Supabase**         | PostgreSQL data, Row Level Security, and server-side access via keys configured in Vercel.                                                                                  |
| **Third-party APIs** | Privy (auth), Mapbox (maps), Mixpanel (analytics), Sentry (errors), and others as listed in `.env.local.example`. The web app calls these using env-configured credentials. |

Out of scope for this runbook: dedicated mobile apps, partner-specific operational runbooks, and deep on-call escalation trees. Product behavior and data rules are summarized in [`APP_OVERVIEW.md`](./APP_OVERVIEW.md).

---

## Vercel: builds, env, and logs

### Dashboard (no CLI)

- **Environment variables:** Project → **Settings → Environment Variables**. Ensure Production has the variables required for live traffic (see grouped checklist below).
- **Deployments:** Confirm status, build logs, and which commit is live.
- **Cron Jobs:** Project → **Settings → Cron Jobs** (or **Cron** in the sidebar, depending on Vercel UI). Execution history and failures appear alongside deployment/runtime logs.

### CLI (optional)

Install the [Vercel CLI](https://vercel.com/docs/cli), then link the repo to the team project as documented by Vercel. Common commands:

```bash
# Link local directory to a Vercel project (interactive, once per machine)
vercel link

# List environment variables for the linked project
vercel env ls

# Download env definitions to a local file (do not commit secrets)
vercel env pull .env.vercel.local

# Stream logs for a deployment or project (see Vercel CLI docs for current flags)
vercel logs
```

Operational verification in production is normally done in the **Vercel dashboard** (deployments + logs). Use the CLI when you already use it for your workflow.

### `vercel.json` (scheduled jobs)

[`vercel.json`](../vercel.json) defines:

| Path                             | Schedule (UTC)             | Notes                                                                                                                                                                                                                                                                          |
| -------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/api/update-airtable`           | `0 0 * * *` (daily)        | Scheduled in this repo. **Confirm in the deployed app** that this route exists and behaves as expected; if the handler is missing, cron requests may return **404** until the route is implemented or the cron entry is removed.                                               |
| `/api/cron/spend-rail-reconcile` | `* * * * *` (every minute) | **Requires** `CRON_SECRET` in Vercel. Cron requests use `Authorization: Bearer <CRON_SECRET>` when that secret is configured on the job (confirm in the Vercel cron / env UI for your project). Without `CRON_SECRET`, the handler returns **500** (“Cron is not configured”). |

Optional tuning for spend reconcile cron (see `.env.local.example`): `SPEND_RAIL_CRON_MIN_AGE_SECONDS`, `SPEND_RAIL_CRON_BACKOFF_SECONDS`, `SPEND_RAIL_CRON_BATCH_SIZE`. Because this job can run every minute, watch for overlapping runs if a single invocation exceeds one minute, and tune batch/backoff envs if logs show sustained DB or RPC pressure.

---

## Supabase

- **URLs and keys** are set via `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and optionally `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` for server routes (see `.env.local.example` and `lib/db/client.ts`).
- **Operational checks:** Supabase dashboard → **Logs** for failed API requests, database errors, or auth issues correlated with user reports or Vercel log timestamps.
- **Schema and migrations** live under [`database/`](../database/) in the repo; applying migrations is a deployment/change-management concern outside this short runbook.

---

## Environment variables (grouped checklist)

Use this as a **mental model** for Production; always reconcile against [`.env.local.example`](../.env.local.example).

### Must-have for a usable production web app

| Area      | Variables (names only)                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Auth      | `NEXT_PUBLIC_PRIVY_APP_ID` (+ Privy dashboard configuration aligned with your app URL)                                                |
| Data      | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; server routes may need `SUPABASE_SERVICE_ROLE_KEY`                       |
| Maps      | `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`                                                                                                     |
| Analytics | `NEXT_PUBLIC_MIXPANEL_TOKEN`; server tracking may use `MIXPANEL_SECRET` and optional `MIXPANEL_TOKEN` (see `lib/analytics/server.ts`) |

### Strongly recommended for production quality

| Area                   | Variables (names only)                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Errors                 | `NEXT_PUBLIC_SENTRY_DSN`, optional `SENTRY_DSN`, `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` |
| Cron (spend reconcile) | `CRON_SECRET`                                                                                                              |
| Base chain             | `BASE_RPC_URL`, `NEXT_PUBLIC_BASE_RPC`, `SERVER_WALLET_PRIVATE_KEY` or `SERVER_PRIVATE_KEY` (server-signed flows)          |

### Feature-specific (enable when the feature is live)

| Area               | Variables (names only)                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Zora               | `NEXT_PUBLIC_ZORA_API_KEY`                                                                                                                                   |
| WalletConnect Pay  | `NEXT_PUBLIC_WALLETCONNECT_*` (see `.env.local.example`)                                                                                                     |
| Spend rails        | `SPEND_RAIL_*`, Stellar-related `SPEND_RAIL_STELLAR_*`, `NEXT_PUBLIC_STELLAR_NETWORK`, etc. — **kill switches** default per comments in `.env.local.example` |
| Stellar claims     | `REWARDS_TOKEN_OWNER_SECRET_KEY` and optional contract overrides                                                                                             |
| Campaign Monitor   | `CAMPAIGN_MONITOR_API_KEY`, `CAMPAIGN_MONITOR_LIST_ID`                                                                                                       |
| Sentry source maps | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (build-time)                                                                                             |

**Never set in production:** `MOCK_CLAIM_NFT_OPEN` and any other variables explicitly marked for local testing in `.env.local.example`.

---

## Spend rails (high level)

Spend availability depends on env-backed **rail enablement** and validation in code under [`lib/spend-rail-config/`](../lib/spend-rail-config/). For detailed QA scenarios, use [`spend-rails-e2e-qa-matrix.md`](./spend-rails-e2e-qa-matrix.md).

---

## After deploy: light verification

1. Open the production site; confirm the home page loads without a client-side crash.
2. Sign in (Privy); confirm session establishment.
3. Open a map-heavy or data-heavy page; confirm no mass 401/500 from Supabase in browser devtools **Network** (quick signal).
4. In **Vercel logs**, confirm no spike of 500s on `/api/*` right after release.
5. If spend rails are enabled, spot-check **Cron** success for `/api/cron/spend-rail-reconcile` after `CRON_SECRET` is set.

---

## Related documentation

- [`APP_OVERVIEW.md`](./APP_OVERVIEW.md) — product flows and data source rules
- [`spend-rails-e2e-qa-matrix.md`](./spend-rails-e2e-qa-matrix.md) — spend rail QA
- [`stellar-baselines-and-chain-architecture.md`](./stellar-baselines-and-chain-architecture.md) — Stellar architecture context
- [`AGENTS.md`](../AGENTS.md) — contributor commands (local **Yarn** per `AGENTS.md`; Vercel install and build commands are declared in [`vercel.json`](../vercel.json) and follow the same Yarn 1 workflow as the repo)

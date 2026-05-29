# FLOAA Phase 1A Worker Setup

## 1. Objectives

Phase 1A introduces the first Cloudflare Worker for FLOAA.

This phase is intentionally narrow. Its purpose is not to deliver inventory, orders, or payments yet. Instead, it establishes the backend deployment foundation required for later Phase 1 ecommerce work.

The goals of Phase 1A are:

- deploy a basic Cloudflare Worker
- expose a simple health endpoint
- define a reliable deployment workflow
- establish environment variable handling
- prepare the Worker for future Google Sheets API integration

At the end of this phase, FLOAA should have:

- a live Worker endpoint
- a confirmed deployment process
- a clear environment configuration model
- a safe starting point for future backend features

## 2. Folder Structure

Phase 1A should keep the Worker structure simple and easy to operate.

A recommended repository structure is:

```text
/docs
  08-phase-1a-worker-setup.md

/worker
  package.json
  wrangler.toml
  src/
    index.js
```

### Purpose of each part

`/worker`

- contains the Cloudflare Worker implementation
- isolates backend logic from the static frontend files

`/worker/wrangler.toml`

- defines Worker project configuration
- controls Worker name, routes, and deployment settings

`/worker/src/index.js`

- contains the initial request handler
- exposes the basic health endpoint

`/docs`

- stores architecture and implementation documentation
- acts as the reference point for rollout and operational decisions

This structure keeps frontend hosting on GitHub Pages unchanged while introducing a clearly separated backend implementation area.

## 3. Worker Architecture

The first Worker should be minimal.

It should act as a single lightweight HTTP service that can later grow into the Phase 1 backend orchestration layer.

### Phase 1A responsibilities

The initial Worker should handle:

- incoming HTTP requests
- a health check endpoint
- basic route handling
- environment variable access validation

### Initial endpoint

Recommended initial endpoint:

- `GET /health`

Expected purpose:

- confirm the Worker is deployed
- confirm requests reach the Worker successfully
- confirm environment configuration is available if needed

### Response expectation

The health endpoint should provide a simple operational signal such as:

- service is reachable
- Worker version or environment name
- current timestamp

This phase should not yet implement:

- Google Sheets reads or writes
- order creation
- payment integration
- reservation logic
- notification delivery

Those capabilities should be added only after the Worker deployment path is stable.

## 4. Deployment Flow

Phase 1A should establish a simple and repeatable deployment flow.

### Recommended flow

1. Developer updates Worker code locally
2. Developer validates configuration locally
3. Developer deploys the Worker using Cloudflare tooling
4. Cloudflare publishes the Worker
5. Developer verifies the `/health` endpoint
6. Deployment is considered successful only after health verification passes

### Deployment expectations

The deployment process should be:

- simple enough for repeat use
- documented clearly
- independent from GitHub Pages deployment
- safe to roll back if needed

### Domain strategy

The frontend should continue to be served by GitHub Pages.

Temporary Phase 1A endpoint:

- `<worker-name>.<subdomain>.workers.dev`

Future production endpoint:

- `api.floaa.in`

The initial Worker should be deployed and verified on the Cloudflare `workers.dev` domain before introducing the custom `api.floaa.in` route.

This keeps the frontend and backend responsibilities separated from the start.

## 5. Environment Variables

Phase 1A should establish the environment variable model even if some values are not yet used in production logic.

The initial Worker should be prepared to support environment-based configuration for later phases.

### Immediately Required (Phase 1A)

- `ENVIRONMENT`
- `APP_NAME`

Only `ENVIRONMENT` and `APP_NAME` are required for the first Worker deployment.

### Future Variables (Phase 1B+)

- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `FLOAA_ADMIN_EMAIL`
- `FLOAA_ADMIN_WHATSAPP`

### Environment principles

- secrets must never be stored in frontend code
- secrets must never be committed into static site files
- Worker secrets should be managed through Cloudflare environment configuration
- production and non-production environments should remain separable

## 6. Verification Steps

Phase 1A should include simple operational verification after deployment.

### Basic verification checklist

1. Confirm the Worker deploys successfully
2. Confirm the public Worker URL resolves
3. Confirm `GET /health` returns a successful response
4. Confirm the response reflects the intended environment
5. Confirm no frontend files or GitHub Pages routes were affected

### Suggested verification focus

- deployment success
- routing success
- endpoint availability
- configuration presence

### Verification outcome

Phase 1A is successful when:

- the Worker is reachable
- the health endpoint is stable
- deployment can be repeated reliably

## 7. Rollback Plan

Phase 1A should have a very simple rollback model.

Because this phase introduces only a basic Worker and does not yet handle production transactions, rollback should be straightforward.

### Rollback options

- redeploy the last known good Worker version
- temporarily remove the custom route
- leave GitHub Pages frontend untouched while Worker issues are resolved

### Rollback principles

- frontend storefront must continue working independently
- Worker rollout must not break the existing static site
- rollback should be fast and low-risk

### Practical rollback outcome

If the Worker deployment fails:

- the static site should still function in its current non-backend mode
- the Worker can be disabled or reverted without affecting the product catalog or WhatsApp ordering flow

## 8. Future Extensions

Phase 1A is the foundation for later backend work.

Once the Worker deployment and health verification path is stable, the Worker can be extended incrementally.

### Planned next extensions

- Google Sheets API integration
- product availability endpoint
- reservation creation logic
- reservation expiry handling
- Razorpay Payment Link creation
- payment confirmation handling
- order creation
- notification delivery

### Extension principle

Each new capability should be added in small steps rather than introducing all backend behavior at once.

The Worker should evolve from:

- health endpoint

to:

- read-only product and configuration access

then to:

- reservation and payment orchestration

then to:

- order and notification flows

This incremental path keeps Phase 1 aligned with the overall FLOAA architecture strategy:

- preserve GitHub Pages
- introduce only one lightweight backend service
- keep Google Sheets as the initial operational source of truth
- minimize rollout risk while building toward ecommerce functionality

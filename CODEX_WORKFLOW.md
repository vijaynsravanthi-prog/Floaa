# FLOAA Codex Working Agreement

## Project Context

FLOAA is a production ecommerce jewelry site.

Production stack:

* Static storefront
* Cloudflare Worker API
* Razorpay Payment Links
* Google Sheets order store
* WhatsApp Cloud API

## Source of Truth

Payment completion is determined by:

1. Razorpay webhook
2. PaymentStatus = Paid in Google Sheets
3. Customer WhatsApp
4. Admin WhatsApp

Browser redirect is UX only.

## Production-Critical Files

Worker:

* worker/src/index.js
* worker/wrangler.toml

Frontend:

* script.js
* index.html
* styles.css
* order-success/index.html

## Change Rules

Before changing code:

1. Show findings
2. Show exact files impacted
3. Show risk assessment
4. Show exact diff plan
5. Wait for approval

Never implement first and explain later.

## Commit Rules

Separate commits by purpose:

* Runtime fixes
* Tooling changes
* Documentation
* Repository hygiene

Do not mix them.

## Deployment Rules

Before deployment:

* verify git status
* identify staged files
* identify runtime files
* identify non-runtime files

Never deploy unknown changes.

## Repository Hygiene

Never commit:

* backups/
* traces
* temp HTML dumps
* screenshots
* logs
* cache files

Review before staging.

## Expected Output Format

For every requested change:

1. Findings
2. Files affected
3. Exact diff summary
4. Risk assessment
5. Validation plan
6. Wait for approval

Do not skip any step.

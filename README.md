# FLOAA

FLOAA is a production jewellery storefront built as a static frontend backed by a Cloudflare Worker. The storefront serves the browsing experience, while the Worker handles product API access, order intake, Razorpay Payment Link creation, webhook processing, Google Sheets order updates, and WhatsApp notifications.

## Current Architecture

- Storefront: static HTML, CSS, and vanilla JavaScript
- Product API: storefront reads products from `https://floaa-api.floaa.workers.dev/api/products`
- Brand content: storefront reads BrandContent from OpenSheet
- Backend: Cloudflare Worker in `worker/src/index.js`
- Order storage: Google Sheets `Orders` tab via Google Sheets API
- Payments: Razorpay Payment Links with webhook-driven confirmation
- Notifications: WhatsApp Cloud API templates for customer and admin updates

## Key Files

- `script.js`: frontend behavior, product rendering, checkout initiation, and success snapshot handling
- `worker/src/index.js`: Worker endpoints, payment flow, webhook handling, and notification logic
- `worker/wrangler.toml`: local Worker configuration
- `order-success/index.html`: customer-facing payment success page
- `docs/`: architecture, runbook, operations, and configuration documentation

## Local Development

1. Clone the repository.
2. Start the local static server with `server.ps1` if needed.
3. Open the storefront locally in a browser.

## Notes

- Payment completion is determined by Razorpay webhook processing and Google Sheets state, not browser redirect completion.
- The customer success page is a UX layer only.

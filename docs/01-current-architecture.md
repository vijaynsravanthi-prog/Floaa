# FLOAA Current Architecture

> Status: Current Production Architecture
>
> Last Updated: 2026-06-05
> Version: 1.1
>
> This document describes the architecture currently running in production.
> Future-state and planned enhancements belong in `02-target-architecture.md`.

## 1. Overview

FLOAA is currently implemented as a static storefront backed by a Cloudflare Worker that handles order intake, Razorpay Payment Link creation, Razorpay webhook processing, Google Sheets persistence, and Meta WhatsApp notifications.

The production experience centers around:

- static marketing and collection pages
- client-side product loading from Google Sheets via OpenSheet
- `Buy Now` order capture through the Worker
- Razorpay Payment Links for payment collection
- webhook-driven payment confirmation
- Google Sheets as the operational datastore
- customer and admin WhatsApp notifications through Meta-approved Utility templates

The frontend remains concentrated in `script.js`, while the transactional backend lives in `worker/src/index.js`.

## 2. Technology Stack

The current production stack is intentionally lightweight:

- Frontend markup: static HTML
- Styling: custom CSS in `styles.css`
- Interactivity: vanilla JavaScript in `script.js`
- Backend runtime: Cloudflare Worker in `worker/src/index.js`
- Product and brand content source: Google Sheets exposed through OpenSheet
- Orders datastore: Google Sheets `Orders` tab via Google Sheets API
- Payments: Razorpay Payment Links
- Notifications: Meta WhatsApp Cloud API
- Local development server: PowerShell-based static server in `server.ps1`

There is still no framework-based frontend or separate application server. The Worker is the production backend control plane.

## 3. Hosting Architecture

Current hosting characteristics:

- storefront pages are static HTML
- shared assets are delivered directly from the repository
- shared frontend logic is loaded through `script.js`
- shared styling is loaded through `styles.css`
- the static site is served from `floaa.in`
- the backend API is served by the Cloudflare Worker `floaa-api`

Current responsibilities are split as follows:

- Frontend:
  - browse products
  - capture customer details
  - call the Worker to create orders and payment links
  - show customer-facing success UI after redirect when available
- Worker:
  - create order rows
  - create Razorpay payment links
  - process Razorpay webhooks
  - update Google Sheets
  - send customer and admin WhatsApp notifications

## 4. Runtime Components

### Storefront

Primary files:

- `index.html`
- `shop.html`
- category and content pages
- `script.js`
- `styles.css`

Key frontend behaviors:

- reads products and brand content from OpenSheet
- renders product cards and detail flows
- captures customer order input
- calls the Worker for `POST /create-payment-link`
- stores an order-success snapshot in `sessionStorage` before redirecting to Razorpay

### Worker

Primary source:

- `worker/src/index.js`

Key runtime endpoints:

- `POST /orders`
- `POST /create-payment-link`
- `POST /razorpay-webhook`
- `GET /whatsapp-webhook`
- `POST /whatsapp-webhook`
- `POST /test-whatsapp`
- `GET /test-whatsapp-status`

The Worker owns all payment and notification orchestration.

## 5. Product and Brand Data Flow

Product and brand content are still loaded client-side at runtime from Google Sheets using OpenSheet.

### Source

`script.js` defines:

- `SHEET_ID`
- `PRODUCTS_URL = https://opensheet.elk.sh/{SHEET_ID}/1`
- `BRAND_CONTENT_URL = https://opensheet.elk.sh/{SHEET_ID}/BrandContent`

### Flow

1. `initializePage()` runs on page load.
2. `fetchProducts()` requests the products sheet from OpenSheet.
3. Each row is transformed by `transformProduct()` into a frontend-friendly product object.
4. Product data is filtered based on page context.
5. Product cards are rendered into the active page grids.

The product feed is also used by the Worker during payment-link creation and admin notification enrichment.

## 6. Payment Flow

Razorpay Payment Links are implemented and operational.

### Production payment flow

1. Customer selects `Buy Now` on the storefront.
2. Frontend sends order details to `POST /create-payment-link`.
3. Worker validates the product and creates a Google Sheets order row.
4. Worker requests a Razorpay Payment Link.
5. Frontend stores a local order-success snapshot in `sessionStorage`.
6. Frontend redirects the customer to Razorpay.
7. Customer completes payment.
8. Razorpay sends `payment_link.paid` webhook to the Worker.
9. Worker updates Google Sheets:
   - `OrderStatus = Confirmed`
   - `PaymentStatus = Paid`
   - `PaymentId`
   - `PaymentCapturedAt`
10. Worker sends customer WhatsApp confirmation.
11. Worker sends admin WhatsApp alert.
12. If Razorpay successfully redirects the browser, the customer sees the success page UX.

### Payment source of truth

Successful payment is determined by successful Razorpay webhook processing, not by browser redirect completion.

Operationally authoritative indicators are:

- webhook received and signature verified
- `PaymentStatus = Paid` in Google Sheets
- `PaymentCapturedAt` populated

The customer success page is a UX layer only.

### Callback URL behavior

`/create-payment-link` generates a `callback_url` for Razorpay using:

1. request `Origin` if it matches an allowed origin
2. otherwise `PUBLIC_SITE_URL`
3. otherwise the production fallback `https://floaa.in`

For local testing this can produce:

- `http://localhost:8000/order-success/index.html`

Known implication:

- successful payment can still complete server-side even if the browser does not land on the success page

### Known localhost and mobile-emulation limitations

The following are known testing limitations, not payment failures:

- localhost callback targets can be fragile in cross-app return flows
- browser redirect completion is less reliable than webhook processing
- mobile browser plus GPay app handoff behaves differently from desktop testing
- desktop mobile-emulation with GPay can show false callback issues because `gpay://` handlers are not available like they are on a real phone
- desktop page plus QR scan on a real phone can leave the original Razorpay page on `Processing your payment` or Razorpay’s own `Paid` page even after backend completion

## 7. WhatsApp Notification Architecture

### Customer notifications

Customer payment confirmations use the Meta-approved Utility template:

- `floaa_order_confirmation`

Language is configurable through:

- `WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_LANGUAGE`

Default code-level language fallback:

- `en_US`

### Admin notifications

Admin payment alerts use the Meta-approved Utility template:

- `floaa_admin_order_alert`

Admin notifications no longer use plain-text WhatsApp messages.

Language is configurable through:

- `WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_LANGUAGE`

### Admin template body field order

The approved field order is:

1. `OrderId`
2. `CustomerName`
3. `Phone`
4. `Email`
5. `ProductId`
6. `ProductName`
7. `ProductLink`
8. `Amount`
9. `AddressLine1`
10. `City`

### Notification idempotency

Notification sends are guarded by Google Sheets audit fields:

- `CustomerWhatsAppSentAt`
- `AdminWhatsAppSentAt`

These fields act as:

- audit markers
- idempotency guards
- notification delivery indicators at API-acceptance level

If a duplicate webhook arrives after those fields are populated, the Worker logs `already sent` and skips duplicate sends.

## 8. Google Sheets Operational Schema

The `Orders` sheet is the operational datastore for order and payment state.

Important runtime fields include:

- `OrderId`
- `ProductId`
- `ProductName`
- `CustomerName`
- `Phone`
- `Email`
- `AddressLine1`
- `AddressLine2`
- `Landmark`
- `Pincode`
- `City`
- `State`
- `OrderStatus`
- `PaymentStatus`
- `CreatedAt`
- `UpdatedAt`
- `Notes`
- `Source`
- `Amount`
- `Currency`
- `PaymentProvider`
- `PaymentLink`
- `PaymentLinkId`
- `PaymentId`
- `PaymentCapturedAt`
- `CustomerWhatsAppSentAt`
- `AdminWhatsAppSentAt`
- `LastUpdatedBy`
- `LastUpdatedAt`
- `FulfillmentStatus`
- `Courier`
- `TrackingNumber`
- `DispatchDate`
- `DeliveryDate`
- `Remarks`

Operational meanings:

- `PaymentStatus`
  - authoritative payment state for the order
- `PaymentCapturedAt`
  - timestamp written when paid webhook processing succeeds
- `CustomerWhatsAppSentAt`
  - customer notification audit marker and idempotency guard
- `AdminWhatsAppSentAt`
  - admin notification audit marker and idempotency guard

## 9. Repository Structure

### `/assets`

Stores static brand and product media used by the storefront.

### `/docs`

Houses project documentation and operational references.

### `/script.js`

Primary frontend application logic file.

### `/worker`

Contains the Cloudflare Worker implementation and Wrangler configuration.

### `/server.ps1`

Local development-only static file server.

It serves the repository on `localhost:8000` and is not a production backend.

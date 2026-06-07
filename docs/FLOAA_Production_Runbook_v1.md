# FLOAA Production Runbook v1

## Executive Summary

FLOAA is a static jewellery storefront backed by a Cloudflare Worker that handles:

- order intake
- Razorpay payment-link creation
- Razorpay webhook processing
- Google Sheets order persistence
- customer WhatsApp confirmations
- admin WhatsApp alerts

## Current Production Status

- Date: `2026-06-05`
- Status: `Working Production Implementation`
- Current implementation mode:
  - static storefront on `floaa.in`
  - transactional backend in `floaa-api`
  - Google Sheets as operational datastore
  - Razorpay Payment Links as payment rail
  - Meta-approved Utility templates for customer and admin notifications

## Architecture Summary

### Runtime components

- Frontend:
  - static HTML/CSS/JS
  - product browsing
  - order details capture
  - redirect to Razorpay
- Worker:
  - `GET /`
  - `GET /products`
  - `GET /api/products`
  - `POST /orders`
  - `POST /create-payment-link`
  - `POST /razorpay-webhook`
  - `GET/POST /whatsapp-webhook`
- Data sources:
  - Worker `/api/products` for storefront product reads
  - OpenSheet for BrandContent
  - Google Sheets API for `Orders`
- External services:
  - Razorpay Payment Links
  - Meta WhatsApp Cloud API

## Source of Truth Model

### Payment truth

Payment completion is determined by successful Razorpay webhook processing.

Authoritative indicators:

- webhook received
- webhook signature verified
- `PaymentStatus = Paid`
- `PaymentCapturedAt` populated

Browser redirect completion is not the source of truth.

### Payment Success Source of Truth

Use this exact operational order:

1. Razorpay webhook received
2. `PaymentStatus = Paid` in Google Sheets
3. `CustomerWhatsAppSentAt` populated
4. `AdminWhatsAppSentAt` populated

### Notification truth

Notification success is tracked operationally through:

- `CustomerWhatsAppSentAt`
- `AdminWhatsAppSentAt`

These fields act as:

- audit markers
- idempotency guards
- notification delivery indicators at API-acceptance level

## Webhook Flow

The production source-of-truth order is:

1. Razorpay webhook received
2. Payment status updated to `Paid`
3. Customer WhatsApp sent
4. Admin WhatsApp sent
5. Customer success page displayed when redirect succeeds

Duplicate webhooks are expected. Idempotency prevents duplicate customer or admin sends.

## Payments

### Working production flow

1. Frontend calls `POST /create-payment-link`
2. Worker validates product and creates order row
3. Worker creates Razorpay Payment Link
4. Frontend stores a success snapshot in `sessionStorage`
5. Frontend redirects to Razorpay
6. Customer completes payment
7. Razorpay sends webhook
8. Worker updates Google Sheets and sends WhatsApp templates
9. Browser may or may not land on `/order-success/index.html`

### Storefront data flow

- storefront product reads go through the Worker `GET /api/products` endpoint
- the Worker fetches the upstream products sheet from OpenSheet
- BrandContent is loaded directly from OpenSheet by the storefront
- Orders are written to Google Sheets through the Worker

### Callback and redirect behavior

`callback_url` is generated from:

1. allowed request `Origin`
2. otherwise `PUBLIC_SITE_URL`
3. otherwise `https://floaa.in`

Known behavior:

- localhost testing can generate `http://localhost:8000/order-success/index.html`
- successful payment can complete even if the browser never lands on the success page
- the customer success page is UX only

### Known payment UX limitations

The following are known non-fatal testing limitations:

- localhost callback return inconsistency
- mobile browser plus GPay app handoff behaving differently from desktop
- desktop mobile-emulation plus GPay showing false callback issues
- desktop mobile-emulation using `gpay://` deep-link flow failing because the desktop browser has no registered handler
- desktop page plus QR scan on a real phone leaving the originating Razorpay page on `Processing your payment` or Razorpay `Paid` view

## WhatsApp

### Customer notifications

Template:

- `floaa_order_confirmation`

Type:

- Meta-approved, active Utility template

Language configuration:

- `WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_LANGUAGE`

### Admin notifications

Template:

- `floaa_admin_order_alert`

Type:

- Meta-approved, active Utility template

Language configuration:

- `WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_LANGUAGE`

Admin notifications no longer use plain-text messages.

### Admin template body field order

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

## Google Sheets

### Operationally important fields

- `PaymentStatus`
- `PaymentCapturedAt`
- `CustomerWhatsAppSentAt`
- `AdminWhatsAppSentAt`
- `PaymentLinkId`
- `PaymentId`
- `OrderStatus`
- `LastUpdatedBy`
- `LastUpdatedAt`

### Meanings

- `PaymentStatus = Paid`
  - authoritative payment success state
- `PaymentCapturedAt`
  - timestamp written when the paid webhook succeeds
- `CustomerWhatsAppSentAt`
  - customer notification audit marker and idempotency guard
- `AdminWhatsAppSentAt`
  - admin notification audit marker and idempotency guard

## Meta and WhatsApp Configuration

Required operationally important values:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ADMIN_PHONE`
- `WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_NAME`
- `WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_LANGUAGE`
- `WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_NAME`
- `WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_LANGUAGE`
- `WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_FIELDS`

## Meta Troubleshooting

Use this path for `OAuthException` or `API access blocked`:

1. validate access token
2. validate Meta Developer App
3. validate WABA assignment
4. validate Phone Number ID
5. validate system user access
6. validate published app state
7. validate template active status

## Production Smoke Test Checklist

- □ Place a test order
- □ Complete payment
- □ Verify `PaymentStatus = Paid`
- □ Verify `PaymentCapturedAt`
- □ Verify `CustomerWhatsAppSentAt`
- □ Verify `AdminWhatsAppSentAt`
- □ Verify customer WhatsApp received
- □ Verify admin WhatsApp received
- □ Verify Google Sheets row integrity

## Go-Live Checklist

1. Confirm current Worker deployment is healthy
2. Confirm Razorpay payment-link creation works
3. Confirm webhook secret is correct
4. Confirm both WhatsApp templates are active
5. Confirm `WHATSAPP_ADMIN_PHONE` is correct
6. Confirm Google Sheets writes work
7. Run the production smoke test

## Post-Deployment Smoke Test Procedure

1. Create one new test order
2. Complete payment
3. Tail Worker logs and verify:
   - `payment link created`
   - `webhook received`
   - `webhook signature verified`
   - `payment status updated`
4. Verify Sheets:
   - `PaymentStatus = Paid`
   - `PaymentCapturedAt`
   - `CustomerWhatsAppSentAt`
   - `AdminWhatsAppSentAt`
5. Verify customer and admin templates are actually received

## Recovery Steps for WhatsApp Failures

If payment is successful but WhatsApp timestamps are missing:

1. Check `PaymentStatus`
2. Check `CustomerWhatsAppSentAt`
3. Check `AdminWhatsAppSentAt`
4. Check Worker logs
5. Check Meta template status
6. Check Meta access token and app access

## Known Risks

- OpenSheet dependency for product and brand-content reads
- Google Sheets as operational datastore
- manual fulfillment process
- browser callback UX is weaker than webhook truth

## Manual Inputs Still Recommended

- secret rotation owner and cadence
- backup cadence and restore SLA
- production alerting/log-retention ownership
- custom API hostname confirmation if introduced later

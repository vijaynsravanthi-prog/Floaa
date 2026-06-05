# FLOAA Backup and Recovery Guide

## Purpose

This document defines the recommended backup and recovery approach for FLOAA based on the current architecture, Worker implementation, and production runbook.

It is intended to protect the business against:

- accidental Google Sheets changes
- deletion of operational data
- Worker deployment regressions
- integration failures in WhatsApp and Razorpay

## Critical Assets

### Orders data

Critical operational data stored in Google Sheets includes:

- order records
- payment status
- payment identifiers
- customer details
- shipping address details
- WhatsApp audit fields
- manual fulfillment fields

Important fields include:

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

### Cloudflare Worker code

The Worker contains:

- order creation endpoint
- payment-link creation endpoint
- Razorpay webhook verification and processing
- customer WhatsApp template logic
- admin WhatsApp template logic
- Google Sheets write and update logic

### Documentation

Operational and recovery knowledge is stored in:

- `docs/01-current-architecture.md`
- `docs/FLOAA_Production_Runbook_v1.md`
- `docs/OPERATIONS.md`
- `docs/RELEASES.md`

## Backup Strategy

### Recommended frequency

Google Sheets:

- Orders sheet: daily export minimum
- before any schema change: immediate manual backup
- before major release: immediate manual backup

Repository:

- continuous backup via remote git hosting
- tag or otherwise mark release candidate revisions

### Storage locations

Recommended storage locations:

- Google Drive export folder for spreadsheet backups
- organization-controlled shared drive or cloud storage
- git remote hosting provider

## Recovery Flow

Use this sequence for payment and notification recovery:

`Payment successful`
`-> Check PaymentStatus`
`-> Check CustomerWhatsAppSentAt`
`-> Check AdminWhatsAppSentAt`
`-> Check Worker logs`
`-> Check Meta template status`
`-> Check Meta access/token status`

## Payment Recovery

### If customer reports successful payment

1. Find the order row using:
   - `OrderId`
   - `PaymentLinkId`
   - `Phone`
2. Check whether:
   - `PaymentStatus = Paid`
   - `PaymentCapturedAt` is populated
3. If yes:
   - treat the payment as successful
   - continue to notification validation

### Important note

Browser redirect completion is not the source of truth.

If Razorpay UI is stuck, but webhook processing updated:

- `PaymentStatus = Paid`
- `PaymentCapturedAt`

then the payment is complete and recovery should focus on UX or notification issues, not payment collection.

## WhatsApp Recovery

### Customer WhatsApp missing

If `PaymentStatus = Paid` but `CustomerWhatsAppSentAt` is blank:

1. Check Worker logs around the paid webhook
2. Check `floaa_order_confirmation` template status
3. Check access token, app, WABA, and phone number ID
4. Validate customer phone formatting

### Admin WhatsApp missing

If `PaymentStatus = Paid` and `CustomerWhatsAppSentAt` exists but `AdminWhatsAppSentAt` is blank:

1. Check Worker logs
2. Check `floaa_admin_order_alert` template status
3. Check `WHATSAPP_ADMIN_PHONE`
4. Check admin template field order
5. Check Meta access token, app, WABA, and phone number ID

### Meta recovery checks

Use this sequence for `OAuthException` or `API access blocked`:

1. Validate access token
2. Validate Meta Developer App
3. Validate WABA
4. Validate Phone Number ID
5. Validate system user access
6. Validate published app state
7. Validate template active status

## Worker Recovery

If webhook logs show failures:

1. Check deployment health
2. Check Razorpay webhook secret
3. Check Google auth
4. Check Sheets write path
5. Re-run a controlled smoke test

## Post-Recovery Verification

After recovery work:

1. Place a test order
2. Complete payment
3. Confirm `PaymentStatus = Paid`
4. Confirm `PaymentCapturedAt`
5. Confirm `CustomerWhatsAppSentAt`
6. Confirm `AdminWhatsAppSentAt`
7. Confirm customer template received
8. Confirm admin template received

## Known Test-Only Caveats

The following do not by themselves indicate production failure:

- localhost callback return issues
- desktop mobile-emulation with GPay
- `gpay://` deep-link failure in desktop browsers
- desktop page plus QR scan on phone leaving the original Razorpay page on `Processing your payment`

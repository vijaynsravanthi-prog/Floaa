# FLOAA Operations Handbook

## Purpose

This handbook describes the day-to-day business operations required to run FLOAA using the current working production implementation.

It is intended for operational use rather than system design. For technical implementation details, also refer to:

- [FLOAA_Production_Runbook_v1.md](./FLOAA_Production_Runbook_v1.md)
- [09-order-lifecycle.md](./09-order-lifecycle.md)
- [SECRETS_AND_CONFIG.md](./SECRETS_AND_CONFIG.md)

## Daily Operations

### Order monitoring

Review the `Orders` sheet throughout the day for:

- new rows with `OrderStatus = Created`
- newly paid rows with `OrderStatus = Confirmed`
- rows needing manual fulfillment progression
- rows marked `PaymentStatus = Expired`
- rows missing expected audit fields

Primary fields to monitor:

- `OrderId`
- `ProductId`
- `ProductName`
- `CustomerName`
- `Phone`
- `Email`
- `OrderStatus`
- `PaymentStatus`
- `PaymentLinkId`
- `PaymentId`
- `PaymentCapturedAt`
- `CustomerWhatsAppSentAt`
- `AdminWhatsAppSentAt`
- `LastUpdatedBy`
- `LastUpdatedAt`
- `UpdatedAt`

## Payment Monitoring

Payment-link orders should follow this expected pattern:

1. Row is created with:
   - `OrderStatus = Created`
   - `PaymentStatus = Created`
2. After successful Razorpay webhook processing:
   - `OrderStatus = Confirmed`
   - `PaymentStatus = Paid`
   - `PaymentId` populated
   - `PaymentCapturedAt` populated
3. If payment link expires:
   - `PaymentStatus = Expired`

### Source of truth

Successful payment is determined by successful Razorpay webhook processing, not by browser redirect completion.

Operationally authoritative payment indicators are:

- `PaymentStatus = Paid`
- `PaymentCapturedAt` populated
- matching Worker logs for `payment status updated`

If a browser remains on Razorpay’s processing page, but the webhook has updated the row to `Paid`, the payment should be treated as successful and the issue should be investigated as callback or redirect UX only.

### Payment Success Source of Truth

Use this exact operational order:

1. Razorpay webhook received
2. `PaymentStatus = Paid` in Google Sheets
3. `CustomerWhatsAppSentAt` populated
4. `AdminWhatsAppSentAt` populated

## WhatsApp Monitoring

### Customer notification

Customer notifications use the Meta-approved, active Utility template:

- `floaa_order_confirmation`

For paid orders, confirm that:

- `CustomerWhatsAppSentAt` is populated
- `LastUpdatedBy` and `LastUpdatedAt` were updated
- no duplicate customer send occurred for the same `PaymentLinkId`

### Admin notification

Admin notifications use the Meta-approved, active Utility template:

- `floaa_admin_order_alert`

Admin notifications no longer use plain-text messages.

For paid orders, confirm that:

- `AdminWhatsAppSentAt` is populated
- `LastUpdatedBy` and `LastUpdatedAt` were updated after admin notification
- no duplicate admin send occurred for the same `PaymentLinkId`

### Operational meaning of audit fields

`CustomerWhatsAppSentAt` and `AdminWhatsAppSentAt` are:

- audit markers
- idempotency guards
- notification delivery indicators at API-acceptance level

If `PaymentStatus = Paid` but either WhatsApp timestamp is blank, operators should investigate WhatsApp delivery or configuration.

## Google Sheets Operational Field Meanings

### `PaymentStatus`

Authoritative payment state for the order:

- `Created`
- `Paid`
- `Expired`

### `PaymentCapturedAt`

Timestamp written when the paid Razorpay webhook is processed successfully.

### `CustomerWhatsAppSentAt`

Indicates the Worker accepted the customer WhatsApp send and wrote the audit marker.

### `AdminWhatsAppSentAt`

Indicates the Worker accepted the admin WhatsApp send and wrote the audit marker.

## Order Processing Workflow

Operational workflow:

`Order Created`
`-> Payment Received`
`-> Confirmed`
`-> Processing`
`-> Packed`
`-> Shipped`
`-> Delivered`

### Runtime vs operational states

The Worker automatically manages:

- `OrderStatus = Created`
- `OrderStatus = Confirmed`
- `PaymentStatus = Created`
- `PaymentStatus = Paid`
- `PaymentStatus = Expired`

The operational process additionally uses fulfillment progression in the sheet:

- `FulfillmentStatus = Processing`
- `FulfillmentStatus = Packed`
- `FulfillmentStatus = Shipped`
- `FulfillmentStatus = Delivered`
- `FulfillmentStatus = Cancelled`

### Recommended operational progression

1. `Created`
   - Payment link created
   - Waiting for customer payment

2. `Confirmed`
   - Paid webhook processed
   - Customer and admin notifications should have been attempted
   - Order is ready for fulfillment handling

3. `Processing`
   - Team has acknowledged the paid order

4. `Packed`
   - Order is packed and ready for courier handoff

5. `Shipped`
   - Courier booked or parcel dispatched

6. `Delivered`
   - Courier confirmed delivery

7. `Cancelled`
   - Order will not be fulfilled

## Troubleshooting Matrix

### Payment successful but Sheet not updated

Check:

- Razorpay webhook delivery
- webhook signature verification
- Worker logs around `/razorpay-webhook`
- Google auth and Sheets write path

### Sheet updated but Customer WA missing

Check:

- `floaa_order_confirmation` template status
- customer template language configuration
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- customer phone normalization

### Customer WA received but Admin WA missing

Check:

- `floaa_admin_order_alert` template status
- admin template language configuration
- `WHATSAPP_ADMIN_PHONE`
- `WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_FIELDS` order

### OAuthException API access blocked

Check:

- Meta access token
- Meta app access
- WABA assignment
- phone number ID
- system user access
- published app status

### Payment successful but browser remains on Razorpay page

Check:

- whether webhook updated `PaymentStatus = Paid`
- whether `PaymentCapturedAt` is present
- whether this is localhost, mobile-emulation, or cross-device GPay/QR testing

Treat this as callback or redirect UX unless webhook processing also failed.

## Production Smoke Test Checklist

Use this after major config changes or before declaring a deployment healthy:

- □ Place test order
- □ Complete payment
- □ Verify `PaymentStatus = Paid`
- □ Verify `PaymentCapturedAt`
- □ Verify `CustomerWhatsAppSentAt`
- □ Verify `AdminWhatsAppSentAt`
- □ Verify customer WhatsApp received
- □ Verify admin WhatsApp received
- □ Verify Google Sheets row integrity

## Go-Live Checklist

1. Confirm Worker deployment is current
2. Confirm Razorpay payment-link creation works
3. Confirm webhook secret is correct
4. Confirm both WhatsApp templates are active
5. Confirm `WHATSAPP_ADMIN_PHONE` points to the intended admin recipient
6. Confirm Google Sheets writes succeed
7. Run the production smoke test

## Post-Deployment Smoke Test Procedure

1. Create one fresh test order
2. Complete a successful payment
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

If `PaymentStatus = Paid` but WhatsApp timestamps are missing:

1. Check Worker logs for WhatsApp errors
2. Validate Meta access token and phone number ID
3. Validate template status in WhatsApp Manager
4. Validate app, WABA, and system user access
5. If customer flow is healthy but admin flow fails, inspect:
   - admin phone number
   - admin template status
   - admin template field order

## Known Test Limitations

The following are known test-environment caveats and do not by themselves indicate payment failure:

- localhost callback URLs
- desktop mobile-emulation with GPay
- `gpay://` handler failure in desktop browsers
- desktop page plus QR scan on a real phone leaving the original Razorpay page on `Processing your payment`

When in doubt, trust:

1. webhook processing
2. `PaymentStatus = Paid`
3. `PaymentCapturedAt`
4. WhatsApp audit timestamps

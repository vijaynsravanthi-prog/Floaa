# FLOAA Order Lifecycle

This document defines the order, payment, and notification lifecycle used in the FLOAA Google Sheets workflow.

## OrderStatus values

Allowed values:

- `Created`
- `Confirmed`
- `Shipped`
- `Delivered`
- `Cancelled`

### When to use each OrderStatus

`Created`

- Use when an order row is first created.
- This is the default state before successful payment confirmation for payment-link orders.

`Confirmed`

- Use after Razorpay confirms a successful payment through the `payment_link.paid` webhook.
- This means the order is valid and ready for fulfillment.

`Shipped`

- Use when the package has been dispatched to the customer.

`Delivered`

- Use when the package has been delivered successfully.

`Cancelled`

- Use when the order will no longer be fulfilled.

## PaymentStatus values

Allowed values:

- `Created`
- `Paid`
- `Expired`

### When to use each PaymentStatus

`Created`

- Use when a payment-link order is created but payment is not yet completed.

`Paid`

- Use when Razorpay sends a successful `payment_link.paid` webhook and the Worker updates the row successfully.

`Expired`

- Use when Razorpay sends `payment_link.expired`.

## Automatic status updates by Worker

The current Worker updates statuses automatically in these cases:

1. When an order is created:
   - `OrderStatus = Created`
   - `PaymentStatus = Created`

2. When Razorpay sends `payment_link.paid`:
   - `OrderStatus = Confirmed`
   - `PaymentStatus = Paid`
   - `PaymentCapturedAt` populated

3. When Razorpay sends `payment_link.expired`:
   - `PaymentStatus = Expired`

## Source of truth order

The production source-of-truth flow is:

1. Razorpay webhook received
2. `PaymentStatus` updated to `Paid`
3. customer WhatsApp template sent
4. admin WhatsApp template sent
5. browser success page shown if redirect succeeds

The browser success page is not authoritative for lifecycle state.

## Notification audit fields

While notifications are not lifecycle statuses, they are operationally part of the paid-order flow.

### `CustomerWhatsAppSentAt`

Operational meaning:

- customer notification audit marker
- idempotency guard
- delivery indicator at API-acceptance level

### `AdminWhatsAppSentAt`

Operational meaning:

- admin notification audit marker
- idempotency guard
- delivery indicator at API-acceptance level

If `PaymentStatus = Paid` but either WhatsApp timestamp is blank, operators should investigate WhatsApp delivery or configuration.

## Manual update process in Google Sheets

Use the `Orders` sheet for manual lifecycle updates.

### Recommended manual update flow

1. Find the order row using one of:
   - `OrderId`
   - `Phone`
   - `PaymentLinkId`
2. Update `OrderStatus` only with approved values.
3. Update `UpdatedAt` with the current ISO timestamp when making a manual change.

### Common manual scenarios

Mark as shipped:

- Set `OrderStatus = Shipped`
- Update `UpdatedAt`

Mark as delivered:

- Set `OrderStatus = Delivered`
- Update `UpdatedAt`

Cancel an order:

- Set `OrderStatus = Cancelled`
- Update `UpdatedAt`

## Notes

- Customer and admin WhatsApp notifications are part of the operational paid-order flow.
- Payment success remains determined by webhook processing, not browser redirect completion.
- Inventory updates are outside the scope of this lifecycle document.

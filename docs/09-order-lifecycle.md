# FLOAA Order Lifecycle

This document defines the allowed order and payment statuses used in the FLOAA Google Sheets order workflow.

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
- This is also the initial state for manual order entries.

`Confirmed`

- Use after Razorpay confirms a successful payment through the `payment_link.paid` webhook.
- This means the order is valid and ready for fulfillment.

`Shipped`

- Use when the package has been dispatched to the customer.
- Update this manually in Google Sheets after the courier pickup or shipment booking is complete.

`Delivered`

- Use when the package has been delivered successfully.
- Update this manually in Google Sheets after delivery is confirmed.

`Cancelled`

- Use when the order will no longer be fulfilled.
- Typical reasons: customer cancellation, duplicate order, operational issue, or refund case handled offline.

## PaymentStatus values

Allowed values:

- `Created`
- `Paid`
- `Expired`

### When to use each PaymentStatus

`Created`

- Use when a payment link order is created but payment is not yet completed.
- This is the initial payment state.

`Paid`

- Use when Razorpay sends a successful `payment_link.paid` webhook.
- This is set automatically by the Worker.

`Expired`

- Use when Razorpay sends a `payment_link.expired` webhook.
- This is set automatically by the Worker.

## Future statuses (not yet implemented)

PaymentStatus:

- `Failed`

Reason:
Razorpay `payment.failed` webhook does not currently provide a reliable `PaymentLinkId` mapping for our implementation.
This status will be added in a future release after payload validation.

## Automatic status updates by Worker

The current Worker updates statuses automatically in these cases:

1. When an order is created:
   - `OrderStatus = Created`
   - `PaymentStatus = Created`

2. When Razorpay sends `payment_link.paid`:
   - `OrderStatus = Confirmed`
   - `PaymentStatus = Paid`

3. When Razorpay sends `payment_link.expired`:
   - `PaymentStatus = Expired`

## Manual update process in Google Sheets

Use the `Orders` sheet for manual lifecycle updates.

### Recommended manual update flow

1. Find the order row using one of:
   - `OrderId`
   - `Phone`
   - `PaymentLinkId`

2. Update `OrderStatus` only with one of the approved values:
   - `Created`
   - `Confirmed`
   - `Shipped`
   - `Delivered`
   - `Cancelled`

3. Update `PaymentStatus` only with one of the approved values:
   - `Created`
   - `Paid`
   - `Expired`

4. Always update `UpdatedAt` with the current ISO timestamp when making a manual change.

Example:

`2026-06-01T14:25:00.000Z`

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

- No email notifications are part of this lifecycle document.
- No WhatsApp notifications are part of this lifecycle document.
- No inventory updates are part of this lifecycle document.
- Payment behavior remains unchanged by this status standardization.

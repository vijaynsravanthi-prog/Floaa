# FLOAA Phase 1 Inventory Management

## 1. Inventory Overview

Phase 1 inventory management for FLOAA is intentionally simple.

The goal is to introduce a minimal inventory control model that works with the existing storefront and Google Sheets-driven workflow without adding unnecessary infrastructure.

In Phase 1:

- Google Sheets remains the inventory source of truth
- the existing `Products` sheet remains largely unchanged
- only a small number of new inventory fields are introduced
- inventory is designed for single-item product handling
- only the Cloudflare Worker is allowed to update inventory state

This model is designed to support:

- product availability checks
- 15-minute reservation handling
- automatic return of expired reservations to inventory
- final stock updates after successful payment

It is not intended to support complex inventory logic such as multi-warehouse stock, batch stock tracking, or advanced allocation rules.

## 2. Products Sheet Structure

The existing `Products` sheet already contains the product catalog used by the current FLOAA storefront.

For Phase 1, the sheet should remain mostly unchanged so that current operational workflows are preserved.

The `Products` sheet continues to hold existing product information such as:

- product name
- category
- description
- price
- image fields
- status and display metadata

Phase 1 inventory management should extend this sheet with only the minimum additional inventory columns required for reservation and stock tracking.

## 3. New Columns

Only the following new columns should be added to the existing `Products` sheet:

- `ProductID`
- `StockState`
- `CurrentReservationID`
- `ReservationExpiryAt`

### ProductID

Purpose:

- provides a stable product identifier for backend operations
- allows the Worker to reference products safely
- supports linking product records to orders and inventory events

### StockState

Purpose:

- stores the current inventory state of the product
- controls whether a product may be reserved or purchased

### CurrentReservationID

Purpose:

- stores the active reservation identifier while a product is reserved
- links the current reserved product state to a specific backend reservation
- helps the Worker determine whether a reservation is still the valid holder of the product

This field should be blank when no active reservation exists.

### ReservationExpiryAt

Purpose:

- stores the timestamp at which an active reservation expires
- allows expired reservations to be returned to inventory

If a product is not currently reserved, this field should be blank.

## 4. Stock States

Phase 1 supports only three stock states:

- `in stock`
- `reserved`
- `sold out`

### in stock

The product is available to be reserved and purchased.

### reserved

The product is temporarily held for a customer who has submitted the required customer details and has been issued a payment link.

This state is temporary and must not remain indefinitely.

### sold out

The product has been successfully purchased and is no longer available for reservation or payment.

## 5. State Transition Diagram

```text
in stock
   |
   | customer submits details form and Worker confirms availability
   v
reserved
   | \
   |  \
   |   \ reservation expires after 15 minutes without payment
   |    \
   |     v
   |   in stock
   |
   | payment succeeds
   v
sold out
```

Allowed transitions:

- `in stock` -> `reserved`
- `reserved` -> `in stock`
- `reserved` -> `sold out`

Disallowed direct transitions:

- `in stock` -> `sold out` without successful payment finalization
- `sold out` -> `in stock` except through explicit manual recovery
- `sold out` -> `reserved`

## 6. Reservation Rules

Phase 1 reservations should follow strict rules so inventory remains understandable and safe.

### Reservation creation rule

A reservation may be created only when:

- the customer has submitted the required customer details form
- the Worker confirms the product exists
- the Worker confirms the product `StockState` is `in stock`

### Reservation duration

- `15 minutes`

### Reservation behavior

When a reservation is created, the Cloudflare Worker must:

- verify the product is currently `in stock`
- set `StockState` to `reserved`
- set `CurrentReservationID` to the active reservation identifier
- set `ReservationExpiryAt` to the current time plus 15 minutes
- continue the payment initiation flow

### Reservation ownership

Reservations are backend-controlled operational states.

The frontend may request a reservation, but it must not decide or store final reservation truth.

## 7. Reservation Expiry Rules

Reservation expiry must be automatic and predictable.

### Expiry rule

If payment is not successfully completed before the reservation expires, the reservation must be released.

### Expiry behavior

When a reservation expires, the Cloudflare Worker must:

- confirm the product is still in `reserved` state
- confirm the product is still associated with the expected `CurrentReservationID`
- confirm the reservation has passed `ReservationExpiryAt`
- set `StockState` back to `in stock`
- clear `CurrentReservationID`
- clear or reset `ReservationExpiryAt`

### Expiry timing

Reservations expire after:

- `15 minutes`

### Expiry handling approach

Phase 1 may handle expiry through:

- a scheduled Worker job
- a lightweight reconciliation check during relevant API requests

The implementation should remain simple, but it must ensure expired reservations do not leave products stuck in `reserved`.

## 8. Inventory Validation Rules

All inventory checks must be performed by the Cloudflare Worker.

### Validation rules

- the frontend must never be treated as the source of inventory truth
- product availability must always be checked against the current `Products` sheet state
- a product in `reserved` state must not be reservable again
- a product in `sold out` state must not be reservable or purchasable
- successful payment must be validated by the Worker before inventory moves to `sold out`
- expired reservations must not remain active after their expiry timestamp

### Single-writer principle

Only the Cloudflare Worker may update:

- `StockState`
- `CurrentReservationID`
- `ReservationExpiryAt`

Manual edits should be used only for recovery or operational correction.

## 9. Worker Responsibilities

In Phase 1, the Cloudflare Worker is the only system responsible for inventory state transitions.

The Worker should:

- validate product availability before reservation
- create reservations only for `in stock` products
- assign and persist the active `CurrentReservationID`
- set the 15-minute reservation expiry timestamp
- generate the payment initiation flow after reservation creation
- validate payment success before finalizing inventory
- move products from `reserved` to `sold out` after successful payment
- move products from `reserved` back to `in stock` after expiry
- prevent invalid inventory transitions
- ensure inventory updates are applied consistently to Google Sheets

The Worker should not rely on the frontend for:

- inventory truth
- payment truth
- final order state

## 10. Failure Scenarios

Phase 1 should explicitly account for simple but realistic failure cases.

### Product already reserved

Scenario:

- customer submits the details form
- Worker checks inventory
- product is already `reserved`

Expected behavior:

- Worker rejects reservation creation
- frontend informs the customer the product is temporarily unavailable

### Product already sold out

Scenario:

- customer attempts to reserve a product that is `sold out`

Expected behavior:

- Worker rejects reservation creation
- frontend informs the customer the product is unavailable

### Reservation expires before payment

Scenario:

- reservation is created
- customer does not complete payment within 15 minutes

Expected behavior:

- Worker returns the product to `in stock`
- reservation is treated as expired

### Payment succeeds after expiry

Scenario:

- payment is completed after the reservation has already expired

Expected behavior:

- Worker must validate whether the reservation is still valid before finalizing inventory
- do not automatically move inventory to `sold out`
- create an `OrderEvent`
- send a WhatsApp notification to FLOAA
- send an email notification to FLOAA
- flag the order for manual review

### Worker fails during inventory update

Scenario:

- reservation or payment succeeds logically
- sheet update fails or partially completes

Expected behavior:

- failure is logged operationally
- product is reviewed manually
- inventory state is corrected before the product is offered again

### Reservation remains stuck

Scenario:

- product remains in `reserved` after expiry because cleanup did not run

Expected behavior:

- Worker reconciliation or manual review returns the product to the correct state

## 11. Manual Recovery Procedures

Phase 1 should include simple manual recovery steps because Google Sheets is the operational source of truth.

### When manual recovery is needed

Manual recovery may be required when:

- a reservation remains stuck in `reserved`
- a payment succeeds but the product was not moved to `sold out`
- a product was incorrectly moved to `sold out`
- a webhook or payment confirmation arrives too late
- sheet updates fail or conflict

### Manual recovery principles

- confirm payment status before changing stock manually
- confirm the latest reservation status before releasing inventory
- keep changes minimal and traceable
- use the Worker flow for normal operation and manual edits only for exceptions

### Manual recovery actions

If a product should be released back to inventory:

- set `StockState` to `in stock`
- clear `CurrentReservationID`
- clear `ReservationExpiryAt`

If a product was successfully purchased and should be closed:

- set `StockState` to `sold out`
- ensure the corresponding order record exists

If a reservation is still valid:

- keep `StockState` as `reserved`
- ensure `CurrentReservationID` matches the active reservation
- ensure `ReservationExpiryAt` reflects the correct expiry time

### Operational recommendation

Any manual recovery action should be performed carefully and only after confirming:

- current product state
- payment outcome
- whether an order was created
- whether the reservation has expired

This keeps the Phase 1 inventory model simple, understandable, and safe for a low-complexity storefront.

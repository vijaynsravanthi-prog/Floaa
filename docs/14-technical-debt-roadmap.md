# FLOAA Technical Debt & Future Enhancements

## Engineering Philosophy

- FLOAA intentionally prefers simple architecture.
- Google Sheets is the single source of truth.
- Complexity should only be introduced after a proven business need.
- YAGNI (You Aren't Gonna Need It) is a guiding principle.

## TD-001 - Inventory Reservation During Checkout

### Status

Deferred

### Priority

Medium

### Decision

Inventory reservation will NOT be implemented in V1.

### Current Architecture

- Google Sheets is the only business data source.
- Buy Now and Bag Checkout create payment links directly.
- Orders are persisted after payment.
- Product status is manually updated in Google Sheets.

### Known Limitation

Two customers could theoretically purchase the same unique product if they start checkout at nearly the same time.

### Business Assessment

This risk is accepted because:

- Boutique jewellery business
- Low expected concurrent traffic
- Manual fulfillment
- Immediate WhatsApp notifications
- Simple architecture is preferred

### Current Mitigation

If a duplicate purchase occurs:

1. Contact the second customer.
2. Issue a refund.
3. Offer an alternative product or discount.

### Future Enhancement

If required, implement a lightweight Google Sheets reservation model:

```text
ACTIVE
↓

RESERVED (15-20 minutes)
↓

SOLD_OUT
```

without introducing D1, KV, Durable Objects, or additional databases unless there is a proven need.

### Revisit Criteria

Re-evaluate ONLY if:

- Duplicate purchases occur more than twice.
- Order volume exceeds approximately 500 orders.
- Manual handling becomes operationally painful.
- Business explicitly requests automatic inventory locking.

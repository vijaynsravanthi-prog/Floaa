# FLOAA Releases

## 2026-06-05 - June 2026 Production Stabilization

Summary:

- Razorpay payment-link stabilization
- webhook validation improvements
- customer WhatsApp diagnostics
- Meta `OAuthException` investigation
- Meta application publication
- admin notification migration from text to template
- admin template approval
- message ID logging
- mobile GPay callback investigation
- confirmation that webhook processing is authoritative for payment completion

Changes:

- documented webhook-first payment truth
- migrated admin notifications to `floaa_admin_order_alert`
- confirmed customer notifications on `floaa_order_confirmation`
- documented admin template field order
- documented callback URL and mobile-emulation limitations
- documented notification audit fields and idempotency behavior

Validated:

- payment-link creation
- Razorpay webhook processing
- customer WhatsApp template delivery
- admin WhatsApp template delivery
- Google Sheets audit field population
- duplicate webhook idempotency behavior

Known Risks:

- OpenSheet dependency for product and brand-content reads
- Google Sheets as operational datastore
- localhost and mobile-emulation callback UX can differ from real-device behavior

## 2026-06-03 - Launch Candidate

Worker Version:
`007c39e1-dabb-4f04-886f-cf975ba47848`

Changes:

- customer WhatsApp confirmation
- admin WhatsApp notification
- canonical product URLs
- Razorpay prefill support
- audit trail fields
- idempotent notification handling

Validated:

- payment flow
- webhook processing
- customer WhatsApp
- admin WhatsApp
- failed payment flow

Known Risks:

- OpenSheet dependency
- Google Sheets datastore
- manual fulfillment

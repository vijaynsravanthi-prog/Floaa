# FLOAA Phase 1 Target Architecture

> Planning note:
>
> This document remains a future-state architecture reference.
> Where production has already implemented parts of this design, those sections are called out explicitly so this document does not conflict with `01-current-architecture.md`.

## 1. Architecture Overview

Phase 1 of FLOAA ecommerce introduced a small transactional backend while preserving the static storefront.

The original target was to add:

- inventory-aware ordering
- reservation handling
- Razorpay Payment Links
- order creation
- customer and admin notifications

### Current production alignment

The following parts of this target architecture are already implemented in production:

- Cloudflare Worker backend
- Razorpay Payment Links
- order creation
- Google Sheets order persistence
- customer WhatsApp notifications
- admin WhatsApp notifications

### Still-target or partially-target areas

These items remain future-state or only partially realized:

- stronger inventory-aware reservation logic
- scheduled reservation expiry orchestration
- broader operational event logging model
- any email notification channel

## 2. High-Level Architecture Diagram

```text
Customer Browser
      |
      v
Static FLOAA Frontend
  - Static HTML/CSS/JS
  - Product browsing
  - Buy Now action
      |
      v
Cloudflare Worker
  - Product availability check
  - Payment Link creation
  - Order creation
  - Webhook processing
  - Notification triggers
      |
      v
Google Spreadsheet
  - Products
  - BrandContent
  - Orders
  - Future operational/event sheets
      |
      +----------------------+
      |                      |
      v                      v
Razorpay Payment Links   Notification Channels
  - Payment collection     - WhatsApp (implemented)
  - Webhook status         - Email (future)
```

## 3. Current Production Delta

To avoid confusion, the current production implementation differs from the older target architecture in these important ways:

- payment completion is determined by Razorpay webhook processing, not browser redirect completion
- Google Sheets `Orders` sheet is the operational source of truth
- customer success page is a UX layer only
- both customer and admin notifications use Meta-approved Utility templates
- admin notifications no longer use plain text
- email notifications are not implemented in the current production flow

## 4. Google Sheet Structure

Google Sheets remains the central operational data layer.

### Implemented today

- `Products`
- `BrandContent`
- `Orders`

### Future or optional operational expansion

- `OrderEvents`
- more explicit inventory-reservation tracking sheets if needed

## 5. Product and Reservation Lifecycle

This document still treats reservation logic as a future-state refinement area.

### Production reality today

- payment-link orders are created directly in the `Orders` sheet
- payment status is driven by Razorpay webhooks
- inventory enforcement is not the authoritative production gate today

### Future-state direction

Potential future enhancements still include:

- reservation windows
- reservation expiry automation
- stock-state transitions beyond current product feed status labels

## 6. Payment Flow

### Production reality

The implemented flow is:

1. customer clicks `Buy Now`
2. frontend submits details to the Worker
3. Worker creates order row
4. Worker generates Razorpay Payment Link
5. frontend redirects customer to Razorpay
6. Razorpay webhook confirms payment
7. Worker marks `PaymentStatus = Paid`
8. Worker sends customer and admin WhatsApp templates

### Future-state improvements

Future documentation can expand this architecture with:

- cleaner reservation semantics
- stronger payment-event modeling
- richer post-payment customer experience

## 7. Notifications

### Implemented today

- customer WhatsApp template: `floaa_order_confirmation`
- admin WhatsApp template: `floaa_admin_order_alert`

### Not implemented today

- email notifications

## 8. How to Read This Document

Use this file for:

- future-state planning
- inventory and reservation evolution
- architectural gaps not yet implemented

Use `01-current-architecture.md` for:

- the current working production truth

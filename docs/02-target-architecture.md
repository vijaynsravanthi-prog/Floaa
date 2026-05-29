# FLOAA Phase 1 Target Architecture

## 1. Architecture Overview

Phase 1 of FLOAA ecommerce should introduce a very small transactional backend while preserving the current static storefront and operating model.

The goal is to add:

- Inventory-aware ordering
- 15-minute product reservation
- Razorpay Payment Links
- Order creation
- Basic customer and admin notifications

The architecture should remain intentionally simple:

- GitHub Pages continues to host the frontend
- A single Cloudflare Worker acts as the backend API and orchestration layer
- Google Sheets remains the operational source of truth
- Razorpay Payment Links are used for payment collection
- WhatsApp and email are used for notifications

This phase is not intended to become a complete commerce platform. It is a lightweight bridge from the current WhatsApp-only model to a structured order and payment flow.

## 2. High-Level Architecture Diagram

```text
Customer Browser
      |
      v
GitHub Pages Frontend
  - Static HTML/CSS/JS
  - Product browsing
  - Buy Now action
      |
      v
Cloudflare Worker
  - Product availability check
  - Reservation creation
  - Payment Link creation
  - Order creation
  - Notification triggers
  - Reservation expiry handling
      |
      v
Google Spreadsheet
  - Products
  - BrandContent
  - Orders
  - OrderEvents
      |
      +----------------------+
      |                      |
      v                      v
Razorpay Payment Links   Notification Channels
  - Payment collection     - WhatsApp
  - Payment status         - Email
```

## 3. Google Sheet Structure

Google Sheets remains the central operational data layer in Phase 1.

The spreadsheet should contain the following sheets:

### Products

Purpose:

- Product catalog
- Current stock state
- Product visibility and commerce status

Suggested fields:

- `ProductID`
- `StockState`
- `ReservationExpiryAt`

The existing `Products` sheet should remain largely unchanged.

For Phase 1, only the following new columns should be added:

- `ProductID`
- `StockState`
- `ReservationExpiryAt`

Phase 1 stock states:

- `in stock`
- `reserved`
- `sold out`

### BrandContent

Purpose:

- Existing dynamic content source for brand-managed content
- Hero content
- Brand messaging
- Contact details
- WhatsApp number and default message

This sheet continues unchanged in Phase 1.

### Orders

Purpose:

- Stores created orders after successful payment or completed purchase flow

Suggested fields:

- `OrderID`
- `ProductID`
- `ProductName`
- `CustomerName`
- `CustomerPhone`
- `CustomerEmail`
- `AddressLine1`
- `AddressLine2`
- `City`
- `State`
- `Pincode`
- `Amount`
- `Currency`
- `PaymentLinkID`
- `PaymentStatus`
- `OrderStatus`
- `CreatedAt`
- `PaidAt`
- `ReservationCreatedAt`
- `ReservationExpiresAt`

### OrderEvents

Purpose:

- Append-only event log for operational visibility
- Useful for troubleshooting and notification tracking

Suggested fields:

- `EventID`
- `OrderID`
- `ProductID`
- `EventType`
- `EventStatus`
- `Message`
- `CreatedAt`

Examples of event types:

- `ReservationCreated`
- `PaymentSuccess`
- `ReservationExpired`
- `OrderCreated`
- `NotificationSent`

## 4. Product Lifecycle

In Phase 1, product stock handling is simplified to a small number of business states.

### Product states

- `in stock`
- `reserved`
- `sold out`

### Product lifecycle flow

1. Product starts as `in stock`
2. Customer clicks `Buy Now`
3. Customer submits the required details form
4. Worker marks product as `reserved`
5. Worker records a reservation expiry time 15 minutes in the future
6. Worker generates a Razorpay Payment Link
7. If payment succeeds before expiry:
   - order is created
   - product moves to `sold out`
8. If payment does not succeed before expiry:
   - reservation expires
   - product returns to `in stock`

This lifecycle is intentionally simple and designed for single-item, low-complexity inventory handling.

## 5. Reservation Lifecycle

Reservation logic is the core transactional addition in Phase 1.

### Reservation rule

A reservation is created after the customer submits the required customer details form and the product is confirmed to be available.

### Reservation duration

- `15 minutes`

### Reservation lifecycle

1. Customer clicks `Buy Now`
2. Customer submits:
   - Name
   - Phone
   - Email
   - Address Line 1
   - Address Line 2
   - City
   - State
   - Pincode
3. Cloudflare Worker checks product state in `Products`
4. If product is `in stock`, Worker:
   - changes `StockState` to `reserved`
   - sets `ReservationExpiryAt`
   - records event in `OrderEvents`
5. Worker creates a payment link flow for the reservation
6. One of two outcomes occurs:

#### Successful payment

- Reservation is considered completed
- Product moves to `sold out`
- Order is written to `Orders`
- `PaymentSuccess` event is recorded

#### Reservation expiry

- Reservation expires after 15 minutes if unpaid
- Worker changes `StockState` back to `in stock`
- `ReservationExpired` event is recorded

### Expiry handling

Expired reservations should be cleaned up automatically by backend logic. The implementation may use a scheduled Worker trigger or a lightweight reconciliation pass during relevant API calls.

## 6. Payment Flow

Phase 1 should use Razorpay Payment Links rather than a more advanced checkout integration.

### Payment flow

1. Customer clicks `Buy Now`
2. Frontend presents a customer details form
3. Customer submits:
   - Name
   - Phone
   - Email
   - Address Line 1
   - Address Line 2
   - City
   - State
   - Pincode
4. Worker creates reservation
5. Worker generates a Razorpay Payment Link
6. Frontend redirects customer to the Razorpay Payment Link
7. Customer completes payment
8. Razorpay notifies the Worker through a callback or webhook-based confirmation path
9. Worker verifies payment outcome
10. Worker updates:
   - `Orders`
   - `Products`
   - `OrderEvents`
11. Worker triggers notifications

### Payment responsibility split

Frontend:

- collect customer details
- initiate the backend flow
- redirect user to payment
- display status feedback

Worker:

- validate the request
- create reservation
- create payment link
- verify payment result
- finalize order state
- update stock state

## 7. Order Flow

Order creation should happen only after successful payment.

### Order flow

1. Customer clicks `Buy Now`
2. Customer completes the details form
3. Reservation is created
4. Payment Link is generated
5. Customer completes payment
6. Worker confirms payment success
7. Worker creates an order row in `Orders`
8. Worker marks product as `sold out`
9. Worker records `PaymentSuccess` and `OrderCreated` in `OrderEvents`
10. Worker sends notifications

### Phase 1 order characteristics

Orders should be simple and operationally focused.

They should track:

- who placed the order
- what product was purchased
- how much was paid
- when the order was created
- which payment link was used
- current order/payment status

Phase 1 does not need advanced order administration, fulfillment workflows, or order editing capabilities.

## 8. Notification Flow

Notifications in Phase 1 should be event-driven and lightweight.

### Notification channels

- WhatsApp
- Email

### Notification events

- `Reservation Created`
- `Payment Success`
- `Reservation Expired`

### Notification flow

1. Worker performs a business action
2. Worker records an event in `OrderEvents`
3. Worker triggers the corresponding notification

### Notification targets

Admin notifications:

- new reservation
- successful payment
- expired reservation

Customer notifications:

- reservation confirmation
- payment success confirmation
- reservation expiry message if needed

In Phase 1, notifications should be delivered through both channels:

- WhatsApp
- Email

This applies to both admin notifications and customer notifications.

The notification layer should remain simple in Phase 1 and may rely on basic third-party delivery mechanisms rather than a dedicated messaging system.

## 9. Design Principles

Phase 1 should follow a small set of strict design principles.

### Keep the architecture simple

The architecture should be understandable and operable by a small team without introducing unnecessary infrastructure.

### Preserve the current frontend

GitHub Pages remains the frontend host, and the static site continues to serve as the customer-facing experience.

### Use one lightweight backend layer

A single Cloudflare Worker should handle business logic for reservations, payments, orders, and notifications.

### Keep Google Sheets as the source of truth

Google Sheets remains the operational source of truth for this phase, including product and order visibility.

### Design for incremental rollout

New commerce behavior should be introduced in a way that allows:

- partial rollout
- safe rollback
- low operational risk

### Prefer operational clarity over complexity

The architecture should make it easy to inspect and understand what happened to a product, reservation, or order by reading sheet data and event history.

### Never trust frontend inventory state or payment status

All inventory and payment decisions must be validated and finalized by the Cloudflare Worker. The frontend may initiate flows and display status, but it must not be treated as a trusted source for stock or payment truth.

## 10. Phase 1 Scope

Phase 1 includes:

- GitHub Pages frontend remains active
- Cloudflare Worker backend introduced
- Product inventory state in Google Sheets
- Reservation creation on `Buy Now`
- 15-minute reservation expiry
- Automatic inventory restoration after expiry
- Razorpay Payment Links
- Order creation after successful payment
- `Orders` and `OrderEvents` sheets
- WhatsApp and email notifications

This phase is intended to deliver a working, minimal ecommerce transaction layer without restructuring the entire platform.

## 11. Out of Scope for Phase 1

The following are explicitly out of scope:

- Databases
- Durable Objects
- D1
- Admin dashboards
- Complex inventory systems
- Microservices
- Advanced cart and checkout systems
- Multi-item order orchestration
- Advanced shipping integrations
- Full fulfillment management
- Complex stock forecasting or allocation logic

Phase 1 is deliberately narrow: it should add just enough backend capability to support reservations, payment links, order recording, and basic notifications while keeping the system easy to operate.

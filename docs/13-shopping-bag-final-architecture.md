# FLOAA Shopping Bag Architecture

## Status

Current and authoritative as of 2026-06-09.

This document reflects the live Shopping Bag implementation across:

- `script.js`
- `bag.html`
- `styles.css`
- `worker/src/index.js`

`docs/12-shopping-bag-checkout-implementation.md` is retained only as archived planning history and is not authoritative.

## 1. Frontend Architecture

### Bag page shell

- `bag.html` provides the static page shell and a single render target: `#bag-page-content`
- `script.js` renders all bag items, totals, empty state, and the checkout CTA at runtime
- `styles.css` contains the Bag-specific UI styles for:
  - badge
  - toast
  - bag page layout
  - bag item cards
  - bag checkout modal

### Client storage

Bag state is stored only in `localStorage`.

Current storage key:

- `floaa_bag`

Current stored structure:

```json
[
  {
    "productId": "FLO-EAR-101",
    "name": "Pearl Drop Earrings",
    "image": "assets/floaa-jew-pics/pearl-drop.png",
    "price": "INR 1299",
    "addedAt": "2026-06-09T10:15:30.000Z"
  }
]
```

Notes:

- the live write format is a plain array, not an object wrapper
- the frontend still reads the legacy `{ items: [...] }` shape as a compatibility fallback
- duplicate `productId` entries are not added
- quantity is not supported

### Bag rendering model

- the bag page renders from the locally stored item snapshot
- it does not re-fetch live product data before showing bag contents
- checkout sends only `productId` values to the Worker
- the Worker performs the authoritative product validation during checkout

### Browser-back and return behavior

- a `pageshow` listener resets Buy Now and Bag modal submitting states
- the same listener refreshes the bag badge count after back/forward navigation
- the order-success flow stores a `sessionStorage` snapshot under `floaa-order-success`
- when the success page is loaded for a Bag order, the frontend clears `floaa_bag`

## 2. Bag Checkout Flow

### Frontend request

Bag checkout opens a dynamically injected modal from `script.js`.

The frontend posts to:

- `POST /create-bag-payment-link`

Request body:

```json
{
  "items": [
    { "productId": "FLO-EAR-101" },
    { "productId": "FLO-NEC-302" }
  ],
  "customerName": "Aisha Khan",
  "phone": "9876543210",
  "email": "aisha@example.com",
  "addressLine1": "12 Palm Residency",
  "addressLine2": "Baner Road",
  "landmark": "Near Orchid Hotel",
  "city": "Pune",
  "state": "Maharashtra",
  "pincode": "411045"
}
```

### Frontend success handling

On success, the frontend expects:

```json
{
  "success": true,
  "orderId": "FLOAA-20260609-123456-abcd1234",
  "amountPaid": 2798,
  "paymentUrl": "https://rzp.io/i/..."
}
```

Before redirecting to Razorpay, the frontend stores:

```json
{
  "orderId": "FLOAA-20260609-123456-abcd1234",
  "amountPaid": "2798",
  "createdSource": "BAG"
}
```

Then it redirects the browser to `paymentUrl`.

## 3. Worker Architecture

### Product source and cache

The Worker fetches products from the Google Sheets JSON feed and caches the raw product payload in `caches.default`.

Current cache behavior:

- upstream source: `opensheet.elk.sh`
- cache key: internal Worker request to `https://floaa-worker-cache.internal/products`
- TTL: `300` seconds

The browser requests `/api/products` with `cache: "no-store"`, but Bag checkout validation still depends on the Worker-side cache freshness window.

### Bag validation

`POST /create-bag-payment-link`:

- normalizes and de-duplicates requested `productId` values
- requires at least one item
- validates phone and pincode formats
- validates every requested product against the current product dataset
- rejects the whole request if any item is:
  - not found
  - inactive
  - unavailable / sold out
  - missing a valid price

### Payment link and row creation order

The current implementation creates the Razorpay Payment Link before writing Orders rows.

Sequence:

1. validate request
2. fetch and validate bag products
3. generate one `OrderId`
4. calculate total amount across all matched products
5. create one Razorpay Payment Link using a synthetic summary product:
   - `productId = "BAG-ORDER"`
   - `productName = "<N> FLOAA Items"`
6. append one Orders row per product with the same:
   - `OrderId`
   - `PaymentLink`
   - `PaymentLinkId`
   - customer and shipping details
   - `CreatedSource = BAG`
7. return `orderId`, `amountPaid`, and `paymentUrl`

### Orders row behavior

Each purchased product creates one sheet row.

Per-row values:

- `Quantity = 1`
- `Amount` is the line item amount, not the grouped total
- `CreatedSource = BAG`
- `PaymentStatus = Created` until webhook confirmation

## 4. Webhook and Grouped Order Handling

The live Worker does not maintain separate Bag-specific and Buy Now-specific webhook handlers.

Instead it uses one shared webhook flow:

1. verify Razorpay signature
2. find all Orders rows matching `PaymentLinkId`
3. update every matched row for paid or expired events
4. build a grouped order view when `CreatedSource = BAG`
5. send WhatsApp notifications once per payment link

### Paid updates

For `payment_link.paid`, all matched rows are updated with:

- `OrderStatus = Confirmed`
- `PaymentStatus = Paid`
- `PaymentId`
- `PaymentCapturedAt`
- `UpdatedAt`

### Expired updates

For `payment_link.expired`, all matched rows are updated with:

- `PaymentStatus = Expired`
- `UpdatedAt`

### Google Sheets retry behavior

The shared row update path retries Google Sheets batch updates on HTTP `429` using delays of:

- `0ms`
- `1000ms`
- `2000ms`

The Bag append path does not have a separate retry layer.

## 5. WhatsApp Behavior

### Customer confirmation

The customer confirmation reuses:

- `floaa_order_confirmation`

For Bag orders, the Worker builds a grouped order record and uses:

- the shared `OrderId`
- the shared customer details
- `Amount` as the sum of all line-item rows in the order group

`CustomerWhatsAppSentAt` prevents duplicate sends.

### Admin notification

The admin notification reuses:

- `floaa_admin_order_alert`

For Bag orders, the grouped payload is transformed to:

- `ProductId = "<N> Products"`
- `ProductName = "Item 1, Item 2, Item 3"`
- `ProductLink = "Bag Order"`
- `Quantity = "<N>"`

Formatting details:

- the item summary is comma-separated, not multiline
- a maximum of 5 product names are included
- if more than 5 items exist, the summary ends with `+N more`

`AdminWhatsAppSentAt` prevents duplicate sends.

If `WHATSAPP_ADMIN_PHONE` is not configured, admin notification is skipped.

## 6. Order Success Behavior

The success page reads values from:

- Razorpay callback query params when present
- otherwise `sessionStorage`

Supported values:

- `orderId`
- `amountPaid`

For Bag orders only:

- the frontend clears `localStorage["floaa_bag"]`
- the stored `createdSource` marker is removed after the clear

## 7. Buy Now Relationship

Buy Now and Bag remain separate checkout entry points:

- Buy Now: `POST /create-payment-link`
- Bag: `POST /create-bag-payment-link`

However, the live Worker now shares more internals than the original planning docs assumed:

- shared product cache
- shared grouped row lookup by `PaymentLinkId`
- shared row update helper
- shared customer WhatsApp sender
- shared admin WhatsApp sender

The main Bag-specific distinctions are:

- request validation for bag items
- multi-row order creation
- grouped order shaping for notifications
- Bag clearing on the success page

## Final Principle

One Bag checkout creates one customer payment transaction, one `OrderId`, one Razorpay Payment Link, and one Orders row per purchased product.

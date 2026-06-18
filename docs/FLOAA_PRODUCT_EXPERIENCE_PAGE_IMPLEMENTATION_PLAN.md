# FLOAA Product Experience Page Implementation Plan

Status: Planning document only

Last updated: 2026-06-16

Purpose: This document explains exactly how the approved Product Experience Page will be implemented using the current FLOAA architecture. It is intentionally implementation-ready, but it does not introduce code, deployment steps, or speculative backend changes.

## 1. Planning Basis

This implementation plan is based on:
- `docs/FLOAA_PRODUCT_EXPERIENCE_PAGE_V1.md`
- existing architecture documentation under `/docs`
- current frontend behavior in `script.js`
- current Worker behavior in `worker/src/index.js`
- current product rendering model
- current gallery implementation
- current Google Sheets mapping

This plan reflects the live implementation, not assumptions.

## 2. Implementation Principle

The approved PDP should be implemented with the smallest possible change surface.

That means:
- reuse the existing Worker-backed `/api/products` endpoint
- reuse the existing frontend `transformProduct()` flow
- reuse the existing image normalization and gallery logic
- reuse the existing Buy Now flow
- reuse the existing Add to Bag flow
- avoid Worker changes
- avoid Google Sheets schema changes
- avoid collection page changes until the PDP is approved in isolation

Architectural conclusion:
- the simplest implementation aligned with the current codebase is a new static page shell plus targeted updates to shared frontend files
- a separate `product.js` or `product.css` file is not required for V1 unless shared-file size becomes operationally difficult during implementation

## 3. Files to Create

## 3.1 `product.html`

Purpose:
- provides the static shell for the Product Experience Page
- follows the same site structure as the rest of FLOAA
- loads the existing shared `script.js`
- loads the existing shared `styles.css`
- exposes a dedicated PDP render surface

Why this file is required:
- the current storefront has no dedicated PDP route
- the approved architecture requires an independent PDP
- a static shell matches the current FLOAA page architecture

## 3.2 No additional JS or CSS files required for V1

Recommended V1 decision:
- do not create `product.js`
- do not create `product.css`

Why:
- the current site is built around shared `script.js` and shared `styles.css`
- adding page-specific asset files would create a new pattern not required by the current architecture
- the simplest aligned implementation is to add PDP logic behind `data-page="product"` inside the shared frontend runtime

Possible future exception:
- if `script.js` or `styles.css` becomes too hard to maintain during implementation, the team may revisit file-splitting later
- that is not the recommended V1 starting point

## 4. Files to Modify

## 4.1 `script.js`

Why it must change:
- the PDP needs to fetch product data using the existing product flow
- the PDP needs to resolve a single product using query params
- the PDP needs to reuse `transformProduct()`
- the PDP needs to render one product detail view instead of a product grid
- the PDP needs to populate recommendations
- the PDP needs to wire existing Buy Now and Add to Bag behavior into the PDP layout

Expected responsibilities to add:
- detect `data-page="product"`
- parse the active product identifier from the URL
- fetch products using existing `fetchProducts()`
- resolve the current product by:
  1. exact `ProductId` match when present
  2. slug fallback using current slug logic
- render PDP-specific content into the page shell
- reuse existing CTA handlers instead of duplicating checkout logic
- reuse current gallery logic for the PDP gallery
- compute the `You May Also Like` list using the approved rules

Recommended implementation style:
- add product-page-specific functions inside `script.js`
- keep shared helpers reusable
- do not rewrite `transformProduct()`
- do not rewrite `fetchProducts()`

## 4.2 `styles.css`

Why it must change:
- the PDP requires page-specific layout and section styling
- the approved structure includes a gallery, information block, trust section, care, packaging, and recommendations
- the page must be responsive and mobile-first

Expected responsibilities to add:
- PDP page shell layout
- gallery layout
- product information stack
- CTA spacing
- trust section styling
- care and packaging section styling
- recommendation card layout for a maximum of 3 products
- responsive rules for mobile and desktop

Recommended implementation style:
- add PDP-specific class names
- avoid changing existing card, bag, or checkout styles unless necessary
- keep layout shift minimal

## 4.3 `docs/FLOAA_PRODUCT_EXPERIENCE_PAGE_V1.md`

No implementation change required.

Reason:
- this is already the approved source of truth

## 4.4 Deferred integration files after PDP approval

These should not change during initial isolated PDP development, but may change later if the PDP is approved and linked from browse surfaces:
- `shop.html`
- `earrings.html`
- `necklaces.html`
- `bracelets.html`
- `rings.html`
- possibly PDP entry behavior inside `script.js` product-card rendering

Why they are deferred:
- the approved development strategy is build independently, review, QA, then integrate
- changing browse pages too early increases regression risk

## 5. Files That Must Not Change

The following must remain untouched for V1 PDP implementation:

## 5.1 `worker/`

Do not change:
- `worker/src/index.js`
- Worker routing
- Worker product fetching behavior
- Worker checkout behavior
- webhook handling

Reason:
- the approved PDP architecture explicitly avoids Worker refactors
- `/api/products` already provides the required product source

## 5.2 Payment and checkout flows

Do not change:
- Buy Now request flow
- Razorpay payment-link creation flow
- webhook flow
- order success flow

Reason:
- payment behavior is already working in production
- the PDP must reuse existing behavior instead of introducing new payment logic

## 5.3 Bag flow

Do not change:
- bag storage model
- bag page rendering
- bag checkout request flow
- bag success behavior

Reason:
- Add to Bag must preserve current behavior exactly

## 5.4 Google Sheets schema

Do not change:
- product sheet structure
- Orders schema
- BrandContent structure for this feature

Reason:
- the approved PDP explicitly preserves the current schema

## 5.5 Collection rendering during isolated PDP build

Do not change initially:
- collection page layout
- collection page filtering behavior
- existing product grid rendering behavior

Reason:
- collection-page integration happens only after PDP approval

## 6. Component Tree

Recommended V1 component tree:

Product Page
↓
Gallery
↓
Product Info
↓
CTA
↓
Trust
↓
Care
↓
Packaging
↓
Recommendations

Suggested structural interpretation for implementation:

Product Page
- page shell
- product layout

Gallery
- primary media
- thumbnail row
- optional reuse of lightbox interaction

Product Info
- name
- price
- description

CTA
- Buy Now
- Add to Bag

Trust
- static reassurance block

Care
- static reusable care content

Packaging
- static reusable packaging content

Recommendations
- maximum 3 related active in-stock products

## 7. Data Flow

Approved V1 data flow:

Google Sheets
↓
/api/products
↓
transformProduct()
↓
PDP

Detailed runtime flow:
1. `product.html` loads
2. `script.js` detects `data-page="product"`
3. `fetchProducts()` requests `/api/products`
4. the Worker fetches raw rows from OpenSheet
5. the frontend maps rows through `transformProduct()`
6. PDP resolves the current product using `productId` or slug
7. PDP renders:
   - gallery
   - product info
   - existing CTAs
   - static trust/care/packaging sections
   - dynamic recommendations

Important constraint:
- the PDP must continue to consume transformed frontend objects, not raw Worker rows directly in page rendering logic

## 8. Reusable Existing Functions

The following existing functions or patterns should be reused instead of rewritten.

## 8.1 Product data and mapping

Reuse:
- `fetchProducts()`
- `transformProduct()`
- `getRowValue()`
- `cleanSheetValue()`
- `normalizeKey()`
- `normalizeSlug()`
- `buildAnchorSlug()`
- `parsePrice()`
- `formatPrice()`

Why:
- these already define FLOAA's live product data contract on the frontend

## 8.2 Image and gallery behavior

Reuse:
- `normalizeImagePath()`
- `getProductThumbnailSrc()`
- `getProductImages()`
- `buildProductGalleryItems()`
- `warmProductZoomAssets()`
- `productGalleryLightbox`

Why:
- these already support multi-image products
- they already normalize asset paths correctly
- they reduce the chance of introducing inconsistent gallery behavior

Implementation note:
- the PDP should reuse gallery-building logic directly
- whether the PDP reuses the exact lightbox UI or a lighter in-page gallery plus lightbox hook should be decided during implementation, but the data preparation should not be rewritten

## 8.3 CTA and product actions

Reuse:
- `buyNowModal`
- existing Buy Now submit flow
- `addProductToBag()`
- `updateBagBadge()`
- existing share helpers if product sharing is exposed later

Why:
- these are already the live conversion paths
- they should remain behaviorally identical

## 8.4 Product filtering and recommendation building

Reuse where appropriate:
- `applyProductFilters()`

Reason:
- it may help for style/category filtering logic

Architectural caution:
- `applyProductFilters()` is grid-oriented and may not fully express the approved recommendation rules
- recommendation selection will likely need a dedicated PDP helper that uses the same normalized product fields but applies the exact approved recommendation order

## 8.5 Accessibility and image fallback patterns

Reuse:
- existing image fallback handling
- existing lazy-load conventions
- existing accessible button and media interaction patterns

Why:
- these already align with FLOAA's current frontend behavior

## 9. Recommendation Implementation Rules

Approved recommendation rules:
1. Same Category
2. Same Style
3. Status = Active
4. StockStatus = in_stock
5. Sort by Priority Order
6. Exclude current product
7. Return maximum 3 products

Implementation interpretation aligned with current code:
- compare normalized `category`
- compare normalized `style`
- compare normalized `status === "active"`
- compare normalized `stockStatus === "in-stock"`
- exclude `productId` match with current product
- cap result count at 3

Architectural concern:
- there is no current dedicated `Priority` field in the transformed product object

Recommended implementation fallback order:
1. exact same category
2. exact same style
3. active and in-stock only
4. preserve product-feed order as the V1 priority order unless a stable priority source is explicitly introduced later

Reason:
- this matches the current codebase more honestly than inventing a non-existent field
- it preserves minimal change while still satisfying the approved recommendation logic in practice

## 10. Risks and Mitigations

## 10.1 Product lookup risk

Risk:
- missing or inconsistent `ProductId` values may weaken PDP routing reliability

Mitigation:
- prefer exact `ProductId` lookup first
- keep slug fallback as a secondary path
- normalize `ProductId` usage in the sheet over time without adding new columns

## 10.2 Recommendation priority ambiguity

Risk:
- the approved recommendation logic references priority order, but the current frontend object does not expose a dedicated priority field

Mitigation:
- document feed order as the V1 fallback priority order
- avoid inventing a new field or backend logic for V1

## 10.3 Content-light product pages

Risk:
- some products may have short descriptions and only one usable image

Mitigation:
- rely on strong static trust, care, and packaging blocks
- ensure the gallery gracefully supports single-image products

## 10.4 Gallery consistency risk

Risk:
- image ordering and asset quality may vary depending on how the `Image` field is populated

Mitigation:
- define a content-entry rule for comma-separated image order:
  1. hero
  2. detail
  3. worn or styled

## 10.5 Regression risk in shared files

Risk:
- `script.js` and `styles.css` are shared across the storefront

Mitigation:
- gate PDP behavior behind `data-page="product"`
- use PDP-specific class names
- perform regression QA across existing browse and checkout flows

## 11. Suggested PR Order

Recommended PR sequence:

## PR1 - PDP shell

Scope:
- create `product.html`
- add page shell structure
- add page-specific data attributes

Goal:
- establish the independent PDP route without touching collection behavior

## PR2 - Data binding

Scope:
- extend `script.js` to detect product pages
- fetch and resolve the current product
- render product name, price, description, and stock-aware state

Goal:
- prove the PDP can render from the existing product feed

## PR3 - Gallery

Scope:
- bind PDP gallery to the existing image/galleria helpers
- implement thumbnail and primary image behavior
- hook into existing lightbox behavior if required

Goal:
- deliver the richest reusable visual part of the PDP

## PR4 - CTA

Scope:
- wire existing Buy Now behavior into the PDP
- wire existing Add to Bag behavior into the PDP
- ensure bag badge and modal behavior remain unchanged

Goal:
- preserve live purchase flows exactly

## PR5 - Recommendations

Scope:
- implement `You May Also Like`
- apply approved filtering rules
- cap at 3 products

Goal:
- add limited supporting discovery without shifting focus away from the current product

## PR6 - PDP static support sections

Scope:
- add trust section
- add care instructions
- add packaging section

Goal:
- complete the approved V1 structure with reusable static components

## PR7 - Integration after approval

Scope:
- update browse entry points only after PDP review and QA sign-off
- decide how collection pages should link into the PDP

Goal:
- integrate the PDP without risking early browse regressions

## 12. Success Checklist

## 12.1 Desktop

Verify:
- layout matches the approved desktop structure
- image gallery is usable and visually stable
- Buy Now appears and behaves correctly
- Add to Bag appears and behaves correctly
- trust, care, packaging, and recommendations render correctly

## 12.2 Mobile

Verify:
- layout is mobile-first and responsive
- CTA placement remains high enough in the scroll flow
- gallery interaction is usable on touch devices
- section spacing remains readable without excessive scrolling

## 12.3 Performance

Verify:
- product page uses the existing `/api/products` flow
- gallery assets are lazy-loaded where appropriate
- layout shift remains low
- no unnecessary new network dependencies are introduced

## 12.4 Accessibility

Verify:
- interactive elements are keyboard accessible
- gallery controls are usable via keyboard and touch
- headings and section order are logical
- image alt behavior follows current conventions

## 12.5 Regression

Verify that PDP work does not break:
- existing collection rendering
- existing filtering
- Buy Now modal behavior
- Add to Bag behavior
- bag rendering
- bag checkout flow
- order success behavior

## 13. Final Implementation Recommendation

The recommended implementation path is:
- create `product.html`
- modify `script.js`
- modify `styles.css`
- leave `worker/` unchanged
- leave checkout and bag flows unchanged
- leave collection pages unchanged until PDP approval

This is the simplest plan that matches the current FLOAA architecture and the approved PDP specification.

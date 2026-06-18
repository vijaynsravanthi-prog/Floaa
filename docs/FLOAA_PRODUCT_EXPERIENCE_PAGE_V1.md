# FLOAA Product Experience Page V1

Status: Final specification for implementation planning

Last updated: 2026-06-16

Purpose: This document is the single source of truth for the FLOAA Product Experience Page V1. It reflects the current live architecture and defines the minimum-change implementation approach for introducing a dedicated product page without changing core storefront, checkout, or backend behavior.

## 1. Executive Summary

FLOAA currently operates as a static storefront with strong collection browsing, a working Cloudflare Worker backend, and functioning Buy Now and Bag flows. What the storefront does not currently provide is a dedicated Product Experience Page that helps a customer make a focused purchase decision on a single product.

The Product Experience Page is being introduced to improve trust, clarity, and purchase intent without disrupting the existing catalog, Worker, payment flows, or Google Sheets operating model.

Business goals:
- improve conversion from product-intent traffic
- create a stronger landing experience for paid campaigns
- increase customer confidence before checkout
- support premium product presentation without increasing operational complexity

UX goals:
- give each product a focused presentation
- preserve FLOAA's existing design language
- improve image browsing, trust communication, and product clarity
- support a stronger mobile purchase journey

Conversion goals:
- increase Buy Now initiation
- increase Add to Bag usage
- reduce hesitation caused by limited product detail on collection cards
- improve the path from product discovery to checkout without changing payment architecture

Core product principle:
> One page. One product. One purchase decision.
>
> The Product Experience Page exists to help customers confidently purchase the current product rather than encouraging endless browsing.

Core architectural principle:
- reuse the existing FLOAA architecture wherever possible
- avoid unnecessary Google Sheets changes
- avoid Worker refactors that are not required for V1
- minimize production risk

## 2. Existing Architecture

## 2.1 Frontend architecture

The live storefront is built from:
- static HTML page shells
- shared styling in `styles.css`
- shared frontend logic in `script.js`
- client-side product fetching and rendering
- Cloudflare Worker-backed transactional APIs

Current browsing pages include:
- `index.html`
- `shop.html`
- `earrings.html`
- `necklaces.html`
- `bracelets.html`
- `rings.html`

Collection pages are static shells that expose runtime render targets such as:
- `#shop-product-grid`
- `#category-product-grid`

`script.js` populates these grids dynamically after fetching product data.

## 2.2 Worker and `/api/products`

The Worker lives in:
- `worker/src/index.js`

Relevant live endpoints:
- `GET /api/products`
- `POST /create-payment-link`
- `POST /create-bag-payment-link`
- Razorpay webhook endpoints

Important current behavior:
- `GET /api/products` fetches raw product rows from OpenSheet
- the Worker does not transform the product rows into a frontend-specific object
- the frontend performs product transformation locally in `script.js`

This is an important implementation constraint. The PDP should align with this model instead of assuming the Worker already returns a normalized presentation object.

## 2.3 Product data flow

Current live flow:
1. a storefront page loads
2. `initializePage()` runs in `script.js`
3. `fetchProducts()` requests the Worker-backed `/api/products` endpoint
4. the Worker fetches the products sheet from OpenSheet
5. the frontend maps each raw row through `transformProduct()`
6. products are filtered by page context
7. `renderProducts()` injects product cards into the active grid

This means a PDP can be introduced without changing the live source-of-truth path.

## 2.4 Google Sheets mapping

The current live product payload includes these main fields:
- `Name`
- `Price`
- `DiscountPrice`
- `Image`
- `Description`
- `Category`
- `Filters`
- `Style`
- `Tag`
- `Status`
- `StockStatus`

The current frontend mapping also supports aliases and optional fields:
- `ProductId` / `ProductID` / `ID` / `Id`
- `Discount Price`
- `Images`
- `CreatedDate` / `Created Date`
- `Filter`
- `Styles`
- `Label`
- `Stock Status`

This matters because the codebase already tolerates light inconsistency in field naming and already supports multi-image parsing.

## 2.5 `transformProduct()` behavior

The current frontend product object includes:
- `productId`
- `name`
- `price`
- `discountPrice`
- `priceValue`
- `discountPriceValue`
- `image`
- `images`
- `createdDate`
- `isNew`
- `description`
- `whatsappText`
- `category`
- `status`
- `stockStatus`
- `filters`
- `style`
- `tag`

Important implementation details:
- `productId` falls back to a slug derived from the product name if no explicit sheet ID exists
- `Image` and `Images` are both supported
- comma-separated image values are already parsed into galleries
- inactive products are filtered out before rendering

## 2.6 Product rendering and gallery behavior

Current rendering relies on:
- `renderProducts()`
- `getProductImages()`
- `buildProductGalleryItems()`
- `productGalleryLightbox`

Important live behavior:
- the storefront already supports multiple gallery assets per product
- gallery items are derived from `item.image` plus `item.images`
- the lightbox already supports thumbnails, previous/next navigation, and lazy thumbnail loading

This is the strongest architectural signal for the PDP image-gallery decision:
- V1 should reuse the existing gallery model instead of introducing a new gallery system

## 2.7 Collection page behavior

Collection pages today:
- do not have dedicated PDP routing
- render product cards inline
- support anchor IDs on shop and category grids
- support lightbox opening from product media
- support Buy Now and Add to Bag directly from product cards

This means the storefront is currently browse-first, not PDP-first.

The PDP should therefore be introduced as a separate experience rather than by redesigning collection pages first.

## 2.8 Reusable live components

The following live behaviors are reusable:
- Worker-backed `/api/products`
- frontend `transformProduct()`
- image normalization helpers
- gallery lightbox logic
- Buy Now flow
- Add to Bag flow
- Bag storage model
- Bag checkout flow
- current stock-state handling

These are both constraints and implementation opportunities.

## 3. Proposed Architecture

## 3.1 Customer journey

The recommended V1 journey is:

Collection Page
↓
Product Experience Page
↓
Cart or Buy Now
↓
Checkout

## 3.2 Architectural approach

The Product Experience Page should be built as an independent feature.

That means:
- do not modify existing collection page behavior first
- do not change existing Buy Now flow
- do not change existing Add to Bag flow
- do not change Worker checkout architecture
- do not require a new backend service

Recommended V1 architecture:
- introduce a dedicated static PDP shell
- fetch the same `/api/products` feed already used elsewhere
- reuse `transformProduct()` to build the product object
- resolve the current product client-side

## 3.3 Recommended route model

Recommended V1 route:
- a dedicated static page such as `product.html`

Recommended resolution model:
- query-string driven lookup, using `productId` or product slug

Recommended lookup order:
1. exact `ProductId` match if present
2. fallback slug match based on current slug-building logic

Why this is the best fit:
- it matches current frontend behavior
- it matches current Worker product lookup behavior
- it avoids modifying collection pages upfront
- it supports isolated development and QA

## 3.4 Why the Worker should not be changed for V1

One alternative would be to move product transformation into the Worker and return a normalized frontend object from `/api/products`.

That is not recommended for V1 because:
- it is not how the live storefront works today
- it would change a production API response shape
- it adds unnecessary risk for a feature that can be built on the current architecture

Final V1 decision:
- keep product transformation in the frontend

## 4. Google Sheets Impact

## 4.1 Final V1 decision

The Product Experience Page preserves the existing Google Sheets schema.

Confirmed decisions:
- the existing schema is preserved
- no additional Google Sheets columns are required for V1
- the existing `Image` field supports comma-separated gallery assets
- this is an intentional architectural decision

## 4.2 Why `Image` is sufficient

The current implementation already supports comma-separated gallery parsing through:
- `normalizeList()`
- `getProductImages()`
- `buildProductGalleryItems()`

This means gallery support already exists in the live frontend model.

This is not a workaround. It is a valid reuse of the current architecture.

## 4.3 Recommended sheet behavior

Recommended V1 catalog rules:
- keep the current product schema
- keep using `Description` as the primary product-copy field
- allow the `Image` field to contain one or more comma-separated image paths
- use `ProductId` consistently where possible for stable routing and product lookup

## 4.4 Recommended non-changes

Do not add new columns for:
- trust section content
- care instructions
- packaging copy
- recommendation logic
- reviews
- badges
- PDP-specific merchandising metadata

Why:
- these add operational overhead
- they are not required by the current codebase
- they do not improve V1 launch readiness enough to justify schema expansion

## 4.5 Architectural challenge to assumptions

The assumption worth challenging is not schema expansion, but identifier discipline.

Today, `productId` can fall back to a slug derived from the product name. That is useful, but weaker than a stable explicit ID.

Better V1 recommendation:
- do not add any new columns
- but standardize use of the already-supported `ProductId` field where possible

This improves PDP reliability without increasing schema complexity.

## 5. Product Experience Page UX

## 5.1 Final V1 structure

The final V1 Product Experience Page structure is:
1. Image Gallery
2. Product Name
3. Price
4. Description
5. Buy Now
6. Add to Bag
7. Trust Section
8. Care Instructions
9. Packaging
10. You May Also Like

This order is intentionally conversion-oriented. It prioritizes the current product and purchase decision before secondary discovery.

## 5.2 Desktop layout

Recommended desktop layout:
- left column: Image Gallery
- right column: product information and conversion stack

Desktop goals:
- keep imagery visually dominant
- keep Buy Now and Add to Bag high on the page
- keep trust content close to the decision area
- keep supporting content scannable and compact

## 5.3 Mobile layout

Recommended mobile order matches the final V1 structure:
1. Image Gallery
2. Product Name
3. Price
4. Description
5. Buy Now
6. Add to Bag
7. Trust Section
8. Care Instructions
9. Packaging
10. You May Also Like

Mobile goals:
- show key decision content quickly
- keep CTAs close to price and description
- avoid long paragraphs
- preserve easy gallery interaction

## 5.4 Image Gallery

V1 gallery requirements:
- support a single image gracefully
- support comma-separated multi-image input from the existing `Image` field
- reuse current image normalization logic
- reuse current gallery-item generation logic where possible
- prioritize hero, detail, and worn/styled imagery in that order when available

## 5.5 Buy Now and Add to Bag

Primary conversion controls remain:
- Buy Now
- Add to Bag

Rules:
- preserve existing Buy Now behavior exactly
- preserve existing Add to Bag behavior exactly
- keep both actions in the main product decision block
- do not introduce alternate checkout paths

## 5.6 Trust Section

The trust section should be a compact reusable static component near the conversion area.

Why static is correct in V1:
- it is brand-level reassurance
- it does not require per-product management
- the current architecture does not justify storing it in Sheets

## 5.7 Care Instructions

Care instructions should be implemented as a reusable static component.

Why static is correct in V1:
- the current codebase does not suggest product-specific care management
- jewellery care guidance is largely universal at FLOAA's current scale
- adding sheet-managed care content would increase complexity without clear benefit

## 5.8 Packaging

Packaging should also be implemented as a reusable static component.

Why static is correct in V1:
- packaging is trust and brand experience content
- it is not core product catalog data in the current architecture
- consistency is more valuable than sheet-managed variation in V1

## 5.9 You May Also Like

The recommendation section should be simple, deterministic, and aligned with the existing dataset.

Final recommendation logic:
1. Same Category
2. Same Style
3. `Status = Active`
4. `StockStatus = in_stock`
5. Sort by Priority Order
6. Exclude current product
7. Return maximum 3 products

Implementation alignment note:
- the business rule is expressed here in sheet terms
- the current frontend normalizes `Status` to values such as `active`
- the current frontend normalizes `StockStatus` to values such as `in-stock`
- implementation should therefore compare against the normalized values produced by the current codebase

Architectural challenge:
- a looser recommendation rule would be easier to write
- however, same-category plus same-style is still simple and produces more coherent recommendations
- this is a better customer experience without requiring manual curation or new infrastructure

## 6. Static vs Dynamic Data

## 6.1 Dynamic data from Google Sheets

These should continue to come from the product feed:
- product ID
- product name
- price
- discount price
- image list
- description
- category
- filters
- style
- tag
- status
- stock status
- created date if needed

Reason:
- these are product-specific
- they already exist in the live data model

## 6.2 Static reusable UI components

These should remain static in V1:
- trust section structure and copy
- care instructions
- packaging section
- recommendation section heading and framing copy
- generic support copy

Reason:
- these are reusable brand-level components
- they do not need catalog-level editing
- keeping them static minimizes operational overhead and launch risk

## 6.3 Hybrid sections

These are static in structure but dynamic in selection or display:
- image gallery
- pricing display
- availability display
- You May Also Like

Reason:
- they are powered by the existing product feed
- they do not require new content models

## 7. Out of Scope

The following are out of scope for V1:
- reviews
- ratings
- recently viewed
- AI recommendations
- complete the look
- variant systems
- new backend services
- transformed Worker product payloads
- inventory-reservation redesign
- broad collection-page redesign
- additional product metadata unless clearly justified
- unnecessary Google Sheets changes

## 8. Development Strategy

Recommended delivery strategy:

Build independently
↓
Review
↓
QA
↓
Integrate

## 8.1 Why this strategy is correct

This is the lowest-risk approach because:
- collection pages remain stable while the PDP is built
- Buy Now remains untouched
- Add to Bag remains untouched
- Worker payment logic remains untouched
- PDP rendering can be reviewed and QA'd in isolation

## 8.2 Integration rule

Do not modify existing Collection Pages until the Product Experience Page is approved.

Instead:
- build the PDP independently
- validate product resolution, rendering, and conversion behavior
- integrate collection entry points only after review and QA approval

## 9. Risks

Primary implementation risks:
- inconsistent or missing `ProductId` values may weaken PDP lookup reliability
- image quality and ordering may vary if the `Image` field is populated inconsistently
- some products may only have one usable image, limiting PDP richness
- because the Worker returns raw sheet rows, the PDP must stay aligned with frontend transformation logic

Operational risks:
- if sheet naming conventions drift further, frontend mapping becomes harder to reason about
- if product descriptions remain too short, the PDP may be structurally complete but still feel content-light

Risk mitigation:
- standardize `ProductId` usage where possible
- define clear comma-separated gallery entry rules
- keep trust, care, and packaging reusable across products
- build and QA independently before integrating into browse flows

## 9.1 Non-functional requirements

The Product Experience Page must be:
- mobile-first
- responsive
- built with lazy-loaded gallery behavior
- built with accessible interactions
- designed to preserve existing Buy Now behavior
- designed to preserve existing Add to Bag behavior
- designed to minimize layout shift
- implemented by reusing the existing architecture wherever possible

## 10. Open Questions

## 10.1 Should the Worker return transformed product objects in the future

Possible future improvement:
- yes

Recommendation for V1:
- no

Reason:
- the live storefront is frontend-transformed today
- changing the production API shape is unnecessary for V1

## 10.2 Should the PDP use query params or path-based routing

Recommendation for V1:
- query-param routing

Reason:
- it is simpler within the current static-site architecture
- it requires less change to existing browse pages

## 10.3 Should trust, care, and packaging move into Sheets later

Recommendation for V1:
- no

Future reconsideration only if:
- the business proves meaningful per-product variation
- static reuse becomes operationally limiting

## 10.4 Should recommendations be curated manually

Recommendation for V1:
- no

Reason:
- manual curation increases maintenance burden
- the existing product dataset is sufficient for a simple deterministic rule

## 10.5 Should collection pages be changed first

Recommendation:
- no

Reason:
- independent build first is both the requested strategy and the lowest-risk path

## 11. Final Recommendation

The recommended V1 Product Experience Page for FLOAA is:
- a new independent static PDP shell
- powered by the existing Worker-backed `/api/products` feed
- using the existing frontend `transformProduct()` model
- reusing the current `Image` field for comma-separated galleries
- preserving current Buy Now flow
- preserving current Add to Bag flow
- keeping trust, care, and packaging as reusable static UI components
- using a simple client-side You May Also Like block capped at 3 products

Final conclusion after challenging the main assumptions:
- no new Google Sheets columns are justified for V1
- no Worker refactor is justified for V1
- no collection-page redesign is justified before PDP approval
- the simplest correct approach is to build an independent PDP that reuses the current storefront data flow and existing conversion flows

This is the best-fit implementation because it:
- reflects the actual live architecture
- minimizes production risk
- avoids unnecessary Google Sheets changes
- avoids speculative backend changes
- stays aligned with FLOAA's current engineering principles of simplicity, reuse, and business-first iteration

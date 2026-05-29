# FLOAA Current Architecture

> Status: Current Production Architecture
>
> Last Updated: 2026-05-29
> Version: 1.0
>
> This document describes the architecture currently running in production.
> Future-state designs must be documented in `02-target-architecture.md`.

## 1. Overview

FLOAA is currently implemented as a static e-commerce storefront built with HTML, CSS, and vanilla JavaScript. The site is designed to run entirely in the browser, with no application backend.

The current experience centers around:

- Static marketing and collection pages
- Client-side product loading from Google Sheets via OpenSheet
- Category and shop filtering in the browser
- Product gallery and lightbox interactions on the frontend
- WhatsApp-based ordering instead of a cart and checkout system

The application logic is primarily concentrated in `script.js`, while `index.html`, `shop.html`, and category pages provide the page structure and mount points for dynamic rendering.

## 2. Technology Stack

The current stack is intentionally lightweight:

- Frontend markup: static HTML
- Styling: custom CSS in `styles.css`
- Interactivity: vanilla JavaScript in `script.js`
- Data source: Google Sheets exposed through OpenSheet
- Media: local images and video assets stored in `assets/`
- Analytics and tracking:
  - Google Analytics (`gtag`)
  - Google Tag Manager
  - Meta Pixel
- Local development server: PowerShell-based static server in `server.ps1`

No framework or package-managed runtime is currently used. There is no React, Vue, Angular, Next.js, Node backend, or build pipeline in the current codebase.

## 3. Hosting Architecture

The site is hosted as a static frontend on GitHub Pages.

Current hosting characteristics:

- All pages are pre-authored static HTML files
- Shared assets are delivered directly from the repository
- Shared frontend logic is loaded through `script.js`
- Shared styling is loaded through `styles.css`
- GitHub Pages behavior is reinforced by:
  - `CNAME`
  - `.nojekyll`

There is no server-side rendering layer and no backend API owned by the project. All runtime data fetching happens directly from the browser to third-party endpoints.

## Repository Structure

The repository is organized around a static-site deployment model, with a small number of shared frontend files and media assets.

### `/assets`

Stores static brand and product media used by the storefront.

- `assets/branding/` contains logos and brand imagery
- `assets/floaa-jew-pics/` contains product images, category visuals, and hero imagery

### `/docs`

Houses project documentation and architecture references.

- `01-current-architecture.md` documents the currently running production architecture

### `/index.html`

Primary homepage for the FLOAA storefront.

- Defines the landing experience
- Mounts the hero slider
- Includes the featured categories and best-seller product grid
- Preloads early brand content via `window.__floaaBrandRowsPromise`

### `/shop.html`

Main shop-all listing page.

- Provides the full product grid view
- Supports browser-side filtering through URL parameters and frontend logic

### `/script.js`

Primary frontend application logic file.

- Fetches products and brand content
- Normalizes Google Sheet rows into product objects
- Renders product cards into page-level grids
- Handles hero slider behavior, gallery lightbox behavior, filters, and WhatsApp order flows

### `/styles.css`

Shared styling file for the entire site.

- Defines layout, typography, color system, responsive behavior, product grid styling, gallery modal styling, and WhatsApp modal styling

### `/server.ps1`

Local development-only static file server.

- Serves the repository on `localhost:8000`
- Maps common file types to the expected MIME types
- Does not act as a production backend or API layer

### `/CNAME`

GitHub Pages custom domain configuration file.

- Used to bind the deployed site to the production FLOAA domain

## 4. Product Data Flow

Product data is loaded client-side at runtime from Google Sheets using OpenSheet.

### Source

`script.js` defines:

- `SHEET_ID`
- `PRODUCTS_URL = https://opensheet.elk.sh/{SHEET_ID}/1`
- `BRAND_CONTENT_URL = https://opensheet.elk.sh/{SHEET_ID}/BrandContent`

### Flow

1. `initializePage()` runs on page load.
2. `fetchProducts()` requests the products sheet from OpenSheet.
3. Each row is transformed by `transformProduct()` into a frontend-friendly product object.
4. Product data is filtered based on page context:
   - Homepage: first 8 products
   - Shop page: optional query-param filtering
   - Category pages: filtered by `data-category`
5. `renderProducts()` builds product cards and injects them into:
   - `#home-product-grid`
   - `#shop-product-grid`
   - `#category-product-grid`

### Product object shape

The current frontend expects fields such as:

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
- `category`
- `status`
- `stockStatus`
- `filters`
- `style`
- `tag`

### Rendering behavior

Each product card includes:

- Image
- Tag/category label
- Name
- Price
- Description
- Stock status
- Action buttons

If multiple images exist, the gallery lightbox uses them as a media set.

## 5. WhatsApp Order Flow

FLOAA does not currently use cart, checkout, or payment APIs. Ordering is handled through WhatsApp.

### Current ordering model

Users interact with product CTAs rendered by `renderProducts()`:

- `ORDER ON WHATSAPP`
- `ASK A QUESTION`

### Flow for questions

1. User clicks `ASK A QUESTION`
2. `createWhatsAppQuestionModal()` opens a modal
3. User enters a question
4. A prefilled WhatsApp message is generated
5. Browser opens a `wa.me` link in a new tab

### Flow for ordering

1. User clicks `ORDER ON WHATSAPP`
2. `createWhatsAppReserveModal()` opens a modal
3. User enters:
   - Name
   - Delivery address
4. A prefilled WhatsApp order message is generated
5. Browser opens a `wa.me` link in a new tab

### WhatsApp message construction

The message includes:

- Product name
- Product price
- Quantity
- Product image URL when available
- User-submitted name or question
- Delivery address for orders

This means the current ordering system is conversational and manual rather than transactional.

## 6. Current Limitations

The current architecture is simple and works well for a lightweight storefront, but it has important limitations.

### No backend

- No owned API layer
- No server-side validation
- No secure secret storage
- No persistent order processing system

### No inventory control

- No live inventory management
- No reservation locking
- No stock decrement after purchase
- No concurrency protection

### No checkout or payment system

- No cart
- No order creation API
- No payment gateway integration
- No payment verification

### No operational order lifecycle

- No order database
- No order statuses
- No admin dashboard
- No shipping workflow

### Public client-side data dependency

- Product availability depends on a public Google Sheet
- Browser fetches OpenSheet directly
- Sheet structure changes can break rendering if not coordinated

### Manual operations burden

- Orders are finalized manually through WhatsApp
- Inventory accuracy depends on human process
- Notifications and reconciliation are not automated

## 7. Existing Google Sheet Integration

Google Sheets is the current source of truth for both product content and brand-managed content.

### Current sheet usage

Two sheet endpoints are used:

- Products sheet: tab `1`
- Brand content sheet: tab `BrandContent`

### Product sheet role

The products sheet currently drives:

- Product names
- Descriptions
- Prices
- Discount prices
- Categories
- Styles
- Filter tags
- Status
- Stock display state
- Image filenames/paths
- New arrival status through created date

### Brand content sheet role

The brand content sheet is used to configure dynamic brand-managed content such as:

- Logo
- Brand strip message
- Shipping strip content
- Footer policy copy
- WhatsApp number
- WhatsApp default message
- Hero slide images and text
- Category tile images
- Contact details
- Hero video and poster configuration

### Integration behavior

- `index.html` preloads brand content early through `window.__floaaBrandRowsPromise`
- `script.js` later consumes that promise in `fetchBrandContent()`
- `applyBrandContent()` applies Google Sheet content into the DOM

### Architectural implication

Google Sheets currently acts as a lightweight CMS plus catalog source. It is easy to update operationally, but it is not a transactional commerce backend.

## Architecture Decisions

The current production setup reflects a set of deliberate decisions optimized for low operational overhead, quick merchandising updates, and simple deployment.

### GitHub Pages hosting

The storefront is hosted on GitHub Pages to keep deployment simple, low-cost, and compatible with a fully static site architecture.

### Static HTML/CSS/JavaScript architecture

The frontend is implemented as a static site using hand-authored HTML, CSS, and vanilla JavaScript rather than a framework-based application. This reduces runtime complexity and avoids the need for a build pipeline.

### Google Sheets as CMS/catalog source

Google Sheets is used as the operational content and catalog source because it allows rapid product and brand-content updates without requiring a backend admin system.

### WhatsApp-based ordering

Ordering is intentionally handled through WhatsApp rather than a native cart and checkout flow. This supports manual, conversational selling and keeps fulfillment coordination lightweight.

### No backend services

There are currently no owned backend services, APIs, databases, or server-side business logic layers in production. The browser talks directly to third-party content endpoints.

### No payment gateway integration

The current production architecture does not include Razorpay or any other payment gateway. Payment collection, confirmation, and order handling remain manual and are coordinated outside the website experience.

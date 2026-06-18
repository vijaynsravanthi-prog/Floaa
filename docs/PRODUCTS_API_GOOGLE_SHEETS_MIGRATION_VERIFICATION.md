# Products API Google Sheets Migration Verification

## 1. Purpose

This document defines the verification contract for migrating product reads in the Worker from OpenSheet to direct Google Sheets API access.

The migration goal is:

`Google Sheet -> Worker (Google Sheets API) -> Cache API -> KV fallback -> Website`

The most important requirement is:

- preserve the existing `GET /api/products` success response shape exactly
- do not modify frontend code
- do not modify the frontend product transformation logic

This document is the source of truth for parity validation before release.

## 2. Current `/api/products` Response Contract

### 2.1 Success response shape

Current `GET /api/products` returns:

- HTTP `200`
- `Content-Type: application/json; charset=utf-8`
- top-level JSON array
- each array item is a flat product object
- no wrapper object like `{ success, products }`

Example current response item:

```json
{
  "ProductId": "FLOAA-0001",
  "Name": "Blush Clip Crush",
  "Price": "1099",
  "DiscountPrice ": "",
  "Image": "Blush Clip Crush.jpeg,Amber square glow drops-thumb.jpg",
  "Description": "Pink square-cut clip earrings with a bold gold finish and playful statement sparkle.",
  "Category": "earrings",
  "Filters": "colour-stone,statement",
  "Style": "occasion",
  "Tag": "Earrings",
  "Status": "Active",
  "StockStatus": "in_stock",
  "InventoryCount": "5",
  "ReservedCount": "0"
}
```

Current observed product count during verification:

- `105`

### 2.2 Current field names

The current live `/api/products` success payload includes these keys:

1. `ProductId`
2. `Name`
3. `Price`
4. `DiscountPrice `
5. `Image`
6. `Description`
7. `Category`
8. `Filters`
9. `Style`
10. `Tag`
11. `Status`
12. `StockStatus`
13. `InventoryCount`
14. `ReservedCount`

Important:

- `DiscountPrice ` currently includes a trailing space in the key name
- that trailing space is part of the current contract and must be preserved unless frontend code is explicitly updated in a separate change

### 2.3 Expected data types

All values in the current payload are strings.

Expected types by field:

- `ProductId`: string
- `Name`: string
- `Price`: string
- `DiscountPrice `: string
- `Image`: string
- `Description`: string
- `Category`: string
- `Filters`: string
- `Style`: string
- `Tag`: string
- `Status`: string
- `StockStatus`: string
- `InventoryCount`: string
- `ReservedCount`: string

### 2.4 Failure behavior that currently exists

Current non-success behavior is:

- HTTP `502` with:

```json
{
  "success": false,
  "message": "Unable to fetch products"
}
```

or:

```json
{
  "success": false,
  "message": "Invalid products response"
}
```

If primary fetch fails and KV stale fallback succeeds:

- HTTP `200`
- top-level JSON array
- stale product array from KV

## 3. Required Invariants

The following must not change in the migration.

### 3.1 Payload invariants

- top-level success payload must remain a JSON array
- each product must remain a flat object
- field names must remain exactly the same
- field values must remain strings
- field value formatting must remain exactly the same as current output
- key `DiscountPrice ` must keep its trailing space
- comma-separated `Image` field must remain a single string field, not an array

### 3.2 Ordering invariants

- product order in the array should remain the same as the current source order
- field order inside objects should be preserved if reasonably possible for parity debugging, although frontend behavior should not depend on object key order

### 3.3 Compatibility invariants

- current frontend `transformProduct()` must continue to work without changes
- current Worker cache flow must remain:
  - primary source read
  - Cache API
  - KV stale fallback
- `/api/products` path must remain unchanged
- no frontend URL, fetch path, or response envelope changes

## 4. Row Mapping Rules

The direct Google Sheets implementation must reproduce OpenSheet-style row objects as closely as possible.

### 4.1 Header row rules

- use the first row of the Products sheet as the header row
- preserve header text exactly as written
- do not trim header names
- do not normalize header names
- do not remove trailing spaces from header names
- do not rename keys

### 4.2 Data row rules

- map each row cell to the header at the same column index
- if a row is shorter than the header row, missing trailing cells must map to `""`
- blank cells must map to `""`
- do not omit keys just because the cell is blank
- non-empty strings must be preserved exactly

### 4.3 Blank header and trailing column rules

- columns with blank header names must not become keys in the response
- trailing columns beyond the meaningful header set must be ignored if the header cell is blank
- if the sheet contains extra blank columns after the defined product schema, they must not introduce empty-string keys

### 4.4 String preservation rules

- preserve commas inside the `Image` field string exactly
- preserve case of values such as `Active`
- preserve underscore formatting such as `in_stock`
- preserve numeric-looking values as strings

### 4.5 Filtering rules

- no additional filtering should be introduced in the Worker migration layer
- the Worker should continue returning the raw product row objects
- frontend filtering and transformation remain the frontend’s responsibility

## 5. Cache Behavior To Preserve

The caching architecture should remain functionally the same, with a shorter TTL.

### 5.1 Primary cache

Preserve:

- Cache API via `caches.default`
- one cache entry for the products payload
- cache hit path returning parsed JSON array

### 5.2 KV stale fallback

Preserve:

- KV namespace binding `PRODUCTS_CACHE`
- key `products:v1`
- stale fallback only when primary Google Sheets fetch fails

### 5.3 TTL target

Current TTL:

- `21600` seconds (`6 hours`)

Migration target:

- `900` to `1800` seconds (`15–30 minutes`)

Recommended default:

- `1800` seconds (`30 minutes`)

### 5.4 Diagnostic headers to add

The migrated implementation should emit these headers:

- `x-floaa-products-source`
  - `google`
  - `kv-stale`
- `x-floaa-products-cache`
  - `hit`
  - `miss`
  - `stale`
- `x-floaa-products-count`
  - numeric string representing returned product count

## 6. Rollback Procedure

If parity fails or production behavior regresses, rollback must be immediate and low-risk.

### 6.1 Rollback strategy

Recommended rollback approach:

1. revert the Worker product-fetch implementation to the OpenSheet-backed version
2. redeploy the Worker
3. purge Worker products cache
4. purge KV fallback key `products:v1`
5. verify live `/api/products` response

### 6.2 Rollback validation

After rollback, confirm:

- `/api/products` returns HTTP `200`
- payload count matches pre-migration baseline
- sample products match expected OpenSheet values
- `FLOAA-0001` `Image` field matches OpenSheet value

### 6.3 Rollback trigger conditions

Rollback should be executed if any of these occur:

- top-level payload is not an array
- any required key is missing
- field names differ from current contract
- product count differs unexpectedly
- `Image` field values differ unexpectedly
- frontend product rendering breaks
- stale fallback behavior regresses

## 7. Production Validation Checklist

### 7.1 API contract checks

- `GET /api/products` returns HTTP `200`
- response body is a JSON array
- first product object keys match current contract exactly
- `DiscountPrice ` key still contains trailing space
- values remain strings

### 7.2 Data parity checks

Validate at least these products:

- `FLOAA-0001`
- one product with single image
- one product with multiple images
- one product with empty discount price
- one product with low inventory

For each, compare:

- `ProductId`
- `Name`
- `Price`
- `DiscountPrice `
- `Image`
- `Description`
- `Category`
- `Filters`
- `Style`
- `Tag`
- `Status`
- `StockStatus`
- `InventoryCount`
- `ReservedCount`

### 7.3 Cache checks

- first request after purge returns:
  - `x-floaa-products-source: google`
  - `x-floaa-products-cache: miss`
- subsequent request within TTL returns:
  - `x-floaa-products-source: google`
  - `x-floaa-products-cache: hit`
- failure-path simulation returns:
  - `x-floaa-products-source: kv-stale`
  - `x-floaa-products-cache: stale`

### 7.4 Frontend checks

Without changing frontend code, verify:

- homepage products load
- collection pages load
- PDP resolves products correctly
- multi-image PDP galleries still work
- Add to Bag still works
- Buy Now still works

## 8. Automated Parity Test Plan

The migration should include an automated parity test that compares:

- OpenSheet output
- direct Google Sheets API mapped output

before cutover.

### 8.1 Test inputs

Fetch:

- current OpenSheet products JSON
- candidate Google Sheets API mapped products JSON

### 8.2 Test assertions

Assert:

1. top-level type is array for both
2. array lengths are equal
3. product ordering is equal
4. every object has identical keys
5. every field value matches exactly
6. no extra keys exist
7. no missing keys exist

### 8.3 Per-product parity comparison

For each index:

- compare key sets exactly
- compare values exactly using string equality

Failure output should include:

- product index
- `ProductId` if available
- mismatched field name
- old value
- new value

### 8.4 Edge-case fixtures to emphasize

The parity test must explicitly verify:

- products with comma-separated `Image` values
- products with blank `DiscountPrice `
- rows with trailing blank cells
- rows with missing optional values
- rows with spaces or punctuation in image filenames

### 8.5 Suggested test flow

1. fetch OpenSheet array
2. fetch Google Sheets header row
3. fetch Google Sheets data rows
4. map rows into OpenSheet-shaped objects
5. run deep equality comparison
6. fail on first mismatch and print detailed diff
7. run full diff summary if multiple mismatches exist

### 8.6 Acceptance criteria

Migration is safe to ship only if:

- parity test passes with zero field mismatches
- sample manual validation passes
- cache hit/miss headers behave correctly
- KV stale fallback still returns valid array payloads

## 9. Known Contract Hazards

These are easy places to break parity:

- trimming or renaming header names
- removing the trailing space in `DiscountPrice `
- omitting keys for blank cells
- converting numeric strings to numbers
- returning `null` instead of `""`
- reordering products unexpectedly
- changing the `Image` field from string to array

## 10. Migration Sign-Off Criteria

The migration is ready only when all of the following are true:

- direct Google Sheets API output matches OpenSheet output exactly
- `/api/products` response contract is unchanged
- frontend behavior is unchanged
- cache behavior is preserved with the shorter TTL
- purge flow still works
- rollback path is documented and tested

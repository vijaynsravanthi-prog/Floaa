# FLOAA Products API Architecture

This document is the single source of truth for the FLOAA Products API: how `GET /api/products` works end to end, what each cache layer is responsible for, why the current design looks the way it does, and what was deliberately left undone. Use it for onboarding, troubleshooting, and as the baseline before proposing any further optimization.

---

## 1. Executive Summary

```
Google Sheets
        │
        ▼
Cloudflare Worker
        │
OAuth Token Cache (~1 hour)
        │
Products Cache (60 seconds)
        │
Browser
        │
Browser Cache
        ▼
User
```

- **Google Sheets** is the source of truth for product data. Whoever edits the sheet is editing the live catalog.
- **Cloudflare Worker** is the API layer. It authenticates to Google, fetches and transforms rows into product JSON, and serves `/api/products`.
- **OAuth cache** exists purely for *authentication*. It has nothing to do with product data — it just avoids re-proving identity to Google on every request.
- **Products cache** exists for *business data*. It holds the actual JSON the frontend consumes, refreshed on a short cycle so sheet edits show up quickly.
- **Browser cache** is the outermost layer, reducing repeat network requests from the same client entirely.

These four layers are stacked but independent — each solves a different problem and can change without affecting the others.

---

## 2. Current Request Flow

```
Browser

↓

GET /api/products

↓

Cloudflare Worker

↓

Products Cache lookup

↓

(Cache HIT)
    return cached products

(Cache MISS)

↓

OAuth Token Cache lookup

↓

(HIT)
    reuse token

(MISS)
    JWT
    ↓
    Google OAuth
    ↓
    access_token

↓

Google Sheets API

↓

Transform products

↓

Write Products Cache (60s)

↓

Return JSON
```

Notes on the flow:

- The **Products Cache lookup happens first**. If it's a hit, the Worker never touches OAuth or Google Sheets at all for that request.
- Only on a Products Cache **miss** does the Worker need a Google access token, which is where the OAuth Cache comes in.
- A Google Sheets fetch involves resolving the sheet name, then the header row, then the data rows, then transforming rows into product objects — all of this only runs on a Products Cache miss.
- After a successful Sheets fetch, the Worker writes the resulting JSON to both the Cloudflare Cache API (Products Cache, 60s) and KV (stale fallback, 7 days) before returning the response.

---

## 3. Cache Layers

| Cache          | Location               | Purpose                    | TTL               |
| -------------- | ----------------------- | --------------------------- | ------------------ |
| Browser Cache  | Browser                 | Reduce repeat requests       | Response headers   |
| Products Cache | Cloudflare Cache API     | Cache product JSON           | 60 seconds          |
| OAuth Cache    | Worker isolate memory    | Cache Google access token    | ~1 hour             |
| KV             | Cloudflare KV            | Stale fallback only          | 7 days              |

Each cache has exactly one responsibility:

- **Browser Cache** — stops the browser from re-requesting `/api/products` more often than necessary.
- **Products Cache** — stops the Worker from re-fetching Google Sheets more often than necessary.
- **OAuth Cache** — stops the Worker from re-authenticating to Google more often than necessary.
- **KV** — exists only so a Google Sheets outage or error doesn't take the storefront down; it is not a performance optimization.

---

## 4. OAuth Cache

**Purpose:** avoid repeated JWT signing and OAuth token exchange on every Products Cache miss, since a Google access token is valid for about an hour but JWT signing + token exchange is expensive (RSA signing plus a network round trip to Google).

It caches:

```
{
    accessToken,
    expiresAt
}
```

stored in a module-level variable scoped to the Worker isolate (`cachedGoogleAccessToken`). A 60-second expiry buffer ensures a token is never reused right at the edge of its real expiry.

It also maintains:

```
pendingGoogleAccessTokenPromise
```

to deduplicate concurrent OAuth requests. If multiple requests arrive in the same isolate while no valid cached token exists, only the first one actually starts a Google OAuth exchange — every other concurrent request awaits that same in-flight promise instead of starting its own:

```
Request A

↓

OAuth request starts

Request B

↓

await same promise

Request C

↓

await same promise
```

Once the in-flight request resolves, the token is cached for all of them, and the pending promise is cleared so the next genuine miss can start a fresh exchange.

### Diagnostic header

```
x-floaa-oauth-cache

hit     → reused a valid cached token, no OAuth call made
miss    → no valid cached token existed, this request performed the JWT + OAuth exchange
shared  → another concurrent request was already fetching a token; this request awaited that same result
n/a     → OAuth was not touched at all (e.g. the Products Cache itself was a hit)
```

---

## 5. Products Cache

Products Cache stores **product JSON only** — no authentication state, no Sheets metadata, just the final array the API returns.

TTL:

```
60 seconds
```

**Reason:** Google Sheet updates should become visible to users within roughly one minute of being made. This TTL is a deliberate product/business decision (near real-time visibility), not a technical limitation.

Cache key:

```
PRODUCTS_CACHE_URL
```

This is a synthetic internal URL used as the Cache API key (e.g. `https://floaa-worker-cache.internal/products-gs-v1`). Changing this key forces a fresh cache population, because the Cache API treats it as a brand-new entry with no prior value — this is useful when the shape of the cached payload changes (for example, during the migration from OpenSheet to the native Google Sheets API) and you need to guarantee no stale, differently-shaped data is served from an old key.

---

## 6. Cache Independence

OAuth Cache and Products Cache are **completely independent**.

- OAuth Cache stores: `Authentication`
- Products Cache stores: `Business data`

Changing one does not invalidate the other:

- Rotating Google service account credentials only affects the OAuth Cache.
- Editing the Google Sheet only affects what the Products Cache will contain on its next refresh.
- Purging the Products Cache does not force a new OAuth token to be issued — a cached, still-valid token is reused.
- Purging or expiring the OAuth Cache does not force a Products Cache refresh — the next Sheets fetch simply re-authenticates first.

---

## 7. KV

KV is **not** part of the normal request path.

KV is used **only** as a stale fallback when a live Google Sheets fetch fails (network error, Google API error, malformed response, etc.). On every successful fetch, the Worker also writes the result to KV with a 7-day TTL, purely so that if a subsequent fetch fails, there is something recent to fall back to instead of returning an error to the user.

KV should **not** be considered a primary cache, and it does not reduce latency on the success path — it exists purely for resilience.

---

## 8. Performance History

**Before optimization:**

```
TTFB

1.8–2.7 seconds
```

Root causes:

- repeated OAuth token generation
- repeated JWT signing
- repeated Google OAuth exchange

These happened on every Products Cache miss, because the Google access token (valid ~1 hour) was being regenerated from scratch every time, on top of three sequential Google Sheets API calls.

**After optimization:**

```
TTFB

~500ms
```

with OAuth cache enabled. Most Products Cache misses now reuse a cached, valid access token instead of paying the JWT-signing and OAuth-exchange cost, and concurrent misses within the same isolate deduplicate onto a single in-flight OAuth request instead of issuing redundant ones.

---

## 9. Decisions Made

**Implemented:**

- Google Sheets direct API (replacing OpenSheet)
- Browser cache improvements
- API preconnect
- OAuth token cache
- Shared promise deduplication
- 60-second products cache

**Not implemented:**

- Google metadata cache
- Header cache
- batchGet redesign
- Additional cache layers
- 300-second products cache

**Reason:** keep the architecture simple and maintainable while preserving near real-time Google Sheet updates. Each additional cache layer or batching strategy reduces latency further but adds more state to reason about and more ways for stale or inconsistent data to leak through — that tradeoff wasn't justified once the OAuth cache alone brought TTFB down to ~500ms.

---

## 10. Architecture Principles

1. Simplicity over premature optimization.
2. Google Sheets is the single source of truth.
3. One cache should have one responsibility.
4. Measure before optimizing.
5. Prefer maintainability over micro-performance gains.
6. Preserve near real-time product updates.

---

## 11. Future Optimizations (Only If Needed)

Listed for awareness — **not implemented**:

- Increase Products Cache TTL to 300 seconds
- Batch Google Sheets API calls
- Metadata caching
- Header caching

> These optimizations should only be revisited if production metrics demonstrate a real performance problem.

---

## 12. Final Summary

The current architecture provides:

- Simple deployment
- Easy debugging
- Low maintenance
- Near real-time Google Sheet updates
- Approximately 500ms API response time
- Clear separation of responsibilities between cache layers

# Archived: Shopping Bag Checkout Implementation Spec

This document is retained only as planning history.

It is no longer authoritative and does not match the live implementation in several important ways, including:

- the bag storage key is now `floaa_bag`, not `floaa-bag-v1`
- the stored Bag format is now a plain array of item snapshots, not `{ version, items }`
- the bag page renders from local snapshot data, not from a live catalog refresh
- the Worker creates the Razorpay Payment Link before appending Orders rows
- webhook processing uses one shared grouped lookup/update path instead of separate Bag webhook handlers
- Bag WhatsApp admin summaries are comma-separated and capped at 5 items, not multiline bullet lists
- the Worker now uses a 5-minute product cache
- the frontend includes a `pageshow` reset for modal loading states and bag badge refresh

Use `docs/13-shopping-bag-final-architecture.md` as the single current reference.

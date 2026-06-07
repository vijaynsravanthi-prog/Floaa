# FLOAA Documentation

## Purpose

This documentation exists to give the FLOAA project a clear architectural and implementation reference point as the platform evolves.

It serves three main purposes:

- Document the current production system as it exists today
- Define the intended future architecture before implementation begins
- Preserve architectural decisions, rollout plans, and operational assumptions in one place

Because FLOAA is moving from a lightweight static storefront toward a more structured commerce platform, this documentation helps ensure future work stays consistent, incremental, and well understood.

## Current State

FLOAA currently runs as a static storefront backed by a Cloudflare Worker.

The present architecture is based on:

- Static HTML, CSS, and vanilla JavaScript
- Storefront product reads through the Worker-backed `/api/products` endpoint
- BrandContent loaded from Google Sheets through OpenSheet
- Client-side rendering of product listings and filtering
- Google Sheets order storage through the Worker
- Razorpay Payment Links for payment collection
- WhatsApp notifications for customer and admin updates

## Future Vision

The planned evolution of FLOAA is to preserve the existing frontend while incrementally introducing operational commerce capabilities through a lightweight serverless backend.

Planned enhancements include:

- Inventory Management
- Product Reservation
- Payment Gateway Integration
- Order Management
- Customer Notifications
- Shipping Integration

These enhancements are intended to be phased in carefully so the current site continues to function while new infrastructure is added.

## Documentation Index

- `01-current-architecture.md`
- `02-target-architecture.md`
- `03-inventory-management.md`
- `08-phase-1a-worker-setup.md`
- `09-order-lifecycle.md`
- `10-whatsapp-consolidation-plan.md`
- `BACKUP_AND_RECOVERY.md`
- `FLOAA_Production_Runbook_v1.md`
- `OPERATIONS.md`
- `SECRETS_AND_CONFIG.md`

## Documentation Principles

- Keep documentation updated before major implementation changes.
- Architecture decisions should be documented.
- Documentation is the source of truth for future enhancements.

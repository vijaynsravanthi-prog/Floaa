# FLOAA Documentation

## Purpose

This documentation exists to give the FLOAA project a clear architectural and implementation reference point as the platform evolves.

It serves three main purposes:

- Document the current production system as it exists today
- Define the intended future architecture before implementation begins
- Preserve architectural decisions, rollout plans, and operational assumptions in one place

Because FLOAA is moving from a lightweight static storefront toward a more structured commerce platform, this documentation helps ensure future work stays consistent, incremental, and well understood.

## Current State

FLOAA currently runs as a static storefront hosted on GitHub Pages.

The present architecture is based on:

- Static HTML, CSS, and vanilla JavaScript
- Product and brand content loaded from Google Sheets through OpenSheet
- Client-side rendering of product listings and filtering
- WhatsApp-based ordering instead of a native cart or checkout
- No owned backend, database, or payment gateway integration

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
- `04-payment-flow.md`
- `05-order-management.md`
- `06-security-considerations.md`
- `07-rollout-plan.md`

## Documentation Principles

- Keep documentation updated before major implementation changes.
- Architecture decisions should be documented.
- Documentation is the source of truth for future enhancements.

# FLOAA Secrets and Configuration Guide

## Purpose

This document defines the current configuration and secret model for FLOAA based on the repository, Cloudflare Worker configuration, and the working production implementation.

It is intended to help operators:

- understand the active runtime configuration surface
- know which values are secret and which are non-secret
- rebuild environment configuration after a disaster
- rotate sensitive credentials safely
- troubleshoot Meta and WhatsApp access failures

This document never includes secret values.

Related references:

- [worker/wrangler.toml](../worker/wrangler.toml)
- [worker/src/index.js](../worker/src/index.js)
- [FLOAA_Production_Runbook_v1.md](./FLOAA_Production_Runbook_v1.md)

## Environment Configuration

The current Cloudflare Worker uses a mix of:

- non-secret environment variables
- secret values stored outside the repository
- optional overrides that fall back to code defaults

### Repository-verified configuration surface

Known runtime configuration references in the Worker code include:

- `APP_NAME`
- `ENVIRONMENT`
- `PUBLIC_SITE_URL`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_NAME`
- `WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_LANGUAGE`
- `WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_FIELDS`
- `WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_NAME`
- `WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_LANGUAGE`
- `WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_FIELDS`
- `WHATSAPP_DEFAULT_COUNTRY_CODE`
- `WHATSAPP_ADMIN_PHONE`

### Current local non-secret values in repository

From `worker/wrangler.toml`:

- `APP_NAME = "floaa-api"`
- `ENVIRONMENT = "development"`
- `WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_LANGUAGE = "en"`
- `WHATSAPP_ADMIN_PHONE` is present in local config

Notes:

- `WHATSAPP_ADMIN_PHONE` should be treated as operationally sensitive even though it is not a credential.
- local config can differ from production secret values.

## Cloudflare Secrets

Secret names only. Never store values in source control.

### Required or known secrets

- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_WABA_ID`

### Important implementation note

`WHATSAPP_WABA_ID` is useful operationally for Meta troubleshooting, but the Worker runtime does not currently read it directly. The Worker runtime directly depends on:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`

## Runtime Configuration Reference

### `PUBLIC_SITE_URL`

Purpose:

- provides the canonical public site base URL
- acts as fallback for checkout callback URL generation
- acts as fallback for canonical product-link generation

Fallback:

- `https://floaa.in`

Operational note:

- successful payment is determined by webhook processing, not by browser redirect completion
- localhost callback targets can still be generated in local testing when the request `Origin` is allowed

## Payment Success Source of Truth

Treat payment as complete only when this sequence is true:

1. Razorpay webhook received
2. `PaymentStatus = Paid` in Google Sheets
3. `CustomerWhatsAppSentAt` populated
4. `AdminWhatsAppSentAt` populated

## Customer WhatsApp Template Configuration

### `WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_NAME`

Purpose:

- override for the customer WhatsApp template name

Current production template:

- `floaa_order_confirmation`
- Status: `Active`

### `WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_LANGUAGE`

Purpose:

- override for the customer template language code

Current local config:

- `en`

Code fallback:

- `en_US`

### `WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_FIELDS`

Purpose:

- optional override for customer template field order

Default field order:

1. `CustomerName`
2. `OrderId`
3. `Amount`

## Admin WhatsApp Template Configuration

### `WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_NAME`

Purpose:

- override for the admin WhatsApp template name

Current production template:

- `floaa_admin_order_alert`
- Status: `Active`

### `WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_LANGUAGE`

Purpose:

- override for the admin template language code

Behavior:

- if missing, runtime falls back to `WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_LANGUAGE`
- then to code fallback `en_US`

### `WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_FIELDS`

Purpose:

- optional override for admin template field order

Current production field order:

1. `OrderId`
2. `CustomerName`
3. `Phone`
4. `Email`
5. `ProductId`
6. `ProductName`
7. `ProductLink`
8. `Amount`
9. `AddressLine1`
10. `City`

Operational note:

- admin notifications are template-based
- admin notifications no longer use plain-text messages
- both customer and admin notifications use Meta-approved Utility templates

### `WHATSAPP_DEFAULT_COUNTRY_CODE`

Purpose:

- override for WhatsApp recipient normalization

Fallback:

- `91`

### `WHATSAPP_ADMIN_PHONE`

Purpose:

- destination for admin WhatsApp notifications

Behavior:

- if missing, admin notification is skipped gracefully

Operational guidance:

- do not use the same number as both the WhatsApp sender and the admin recipient

## Secret Rotation Guidance

### General principles

- Never commit secret values to the repository.
- Rotate secrets during controlled maintenance windows.
- Change one integration domain at a time when possible.
- Validate production flows immediately after rotation.
- Record who rotated the secret, when, and why.

### Recommended rotation order by service

#### Google

Secrets:

- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

Validate:

- Google auth succeeds
- Orders sheet reads and writes succeed

#### Razorpay

Secrets:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Validate:

- payment-link creation still works
- webhook signature verification still works
- a paid test order updates `PaymentStatus = Paid`

#### WhatsApp / Meta

Secrets:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_WABA_ID` if tracked operationally

Validate:

- customer template send works
- admin template send works
- template names resolve
- Meta webhooks remain verified

## Meta and WhatsApp Troubleshooting

Use this section for:

- `OAuthException`
- `API access blocked`
- Graph API permission failures

### 1. Access Token Validation

Check:

- token is current and not expired
- token belongs to the intended Meta app and business
- token still has WhatsApp Cloud API access

### 2. App Validation

Check:

- correct Meta Developer App is being used
- app is the one connected to the production WABA
- app is published when required operationally
- webhook subscription is still configured and verified

### 3. WABA Validation

Check:

- correct WhatsApp Business Account is selected
- account is approved
- payment method is configured
- account quality has no blocking issues

### 4. Phone Number ID Validation

Check:

- `WHATSAPP_PHONE_NUMBER_ID` belongs to the correct sender number
- sender number is active in WhatsApp Manager
- number quality and status are healthy

### 5. System User Access Checks

Check:

- system user or business integration user still has the expected access
- assigned assets include the correct app, WABA, and phone number

### 6. Meta Developer App Checks

Check:

- `messages` webhook field is subscribed
- callback URL is verified
- verify token matches the Worker expectation
- no required app metadata is missing

### 7. Published App Checks

If Meta reports blocked production access:

Check:

- privacy policy URL
- app category
- publish state
- business verification status

### 8. Template Validation Checks

For WhatsApp delivery issues:

Check:

- `floaa_order_confirmation` is active
- `floaa_admin_order_alert` is active
- template language matches runtime config
- admin template field order still matches:
  - `OrderId`
  - `CustomerName`
  - `Phone`
  - `Email`
  - `ProductId`
  - `ProductName`
  - `ProductLink`
  - `Amount`
  - `AddressLine1`
  - `City`

## Production Verification Checklist

After any Meta, WhatsApp, or secret change, verify:

1. `POST /create-payment-link` succeeds
2. Razorpay paid webhook succeeds
3. Google Sheets row updates to `PaymentStatus = Paid`
4. `CustomerWhatsAppSentAt` is populated
5. `AdminWhatsAppSentAt` is populated
6. customer template is received
7. admin template is received

If browser redirect behavior is inconsistent but webhook, Sheets, and WhatsApp succeed, treat the payment as successful and investigate only the callback UX path.

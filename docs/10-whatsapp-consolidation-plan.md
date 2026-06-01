# 10. WhatsApp Consolidation Plan

Status: Post-Launch Technical Debt

## Goal

Consolidate FLOAA WhatsApp links and display numbers to a single source of truth using BrandContent-backed values already supported in [script.js](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/script.js).

This document is planning-only.

- No code changes have been applied.
- No deployment has been performed.

## Current Hardcoded References

The current issue is that WhatsApp references are split between:

- hardcoded HTML values
- dynamic BrandContent-driven logic in `script.js`

### Hardcoded HTML references

- [index.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/index.html:102)
  - `https://wa.me/c/919960144483`
  - homepage structured data `sameAs`

- [index.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/index.html:879)
  - `https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection`
  - footer WhatsApp link

- [about.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/about.html:169)
  - hardcoded footer WhatsApp link

- [bracelets.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/bracelets.html:188)
  - hardcoded footer WhatsApp link

- [contact.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/contact.html:126)
  - visible number `+91 9960144483`
  - hardcoded WhatsApp link

- [contact.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/contact.html:150)
  - hardcoded footer WhatsApp link

- [earrings.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/earrings.html:188)
  - hardcoded footer WhatsApp link

- [necklaces.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/necklaces.html:188)
  - hardcoded footer WhatsApp link

- [rings.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/rings.html:188)
  - hardcoded footer WhatsApp link

- [shop.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/shop.html:182)
  - hardcoded footer WhatsApp link

- [privacy-policy.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/privacy-policy.html:164)
  - hardcoded footer WhatsApp link

- [refund-policy.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/refund-policy.html:155)
  - hardcoded footer WhatsApp link

- [shipping-policy.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/shipping-policy.html:128)
  - hardcoded shipping-support WhatsApp link
  - custom message: `Hi FLOAA, I need help with shipping`

- [shipping-policy.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/shipping-policy.html:151)
  - hardcoded footer WhatsApp link

- [terms-and-conditions.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/terms-and-conditions.html:156)
  - hardcoded footer WhatsApp link

- [order-success/index.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/order-success/index.html:129)
  - hardcoded footer WhatsApp link

- [payment-failed/index.html](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/payment-failed/index.html:129)
  - hardcoded footer WhatsApp link

### Existing dynamic logic already present

- [script.js](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/script.js:327)
  - `getWhatsAppNumber(content)`

- [script.js](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/script.js:328)
  - BrandContent key: `whatsapp-number`

- [script.js](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/script.js:330)
  - BrandContent key: `contact-whatsapp`

- [script.js](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/script.js:332)
  - BrandContent key: `contact-phone`

- [script.js](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/script.js:341)
  - dynamic builder: ``https://wa.me/${number}?text=${encodeURIComponent(message)}``

- [script.js](c:/Users/Trizal%20Konidena/OneDrive/Floaa/jewellery-website/script.js:2056)
  - BrandContent display key lookup:
  - `contact-phone-display`
  - `phone-display`
  - `phone`

## Proposed Dynamic Architecture

### Single source of truth

Use BrandContent values only:

- `whatsapp-number`
- `contact-whatsapp`
- `contact-phone-display`

### Resolution model

1. `script.js` loads BrandContent.
2. `getWhatsAppNumber(content)` resolves the canonical WhatsApp number.
3. `getBrandValue(content, ["contact-phone-display", "phone-display", "phone"])` resolves the human-readable display number.
4. All WhatsApp entry points are hydrated at runtime:
   - floating WhatsApp button
   - footer links
   - product enquiry links
   - contact page inline number/link
   - order-success page footer link
   - payment-failed page footer link
   - structured data catalog link

### HTML strategy

Replace hardcoded live WhatsApp URLs with neutral placeholders plus data hooks, for example:

- `data-whatsapp-link="true"`
- `data-whatsapp-catalog-link="true"`
- `data-contact-whatsapp-display="true"`
- optional per-link message override via `data-whatsapp-message`

### Behavior to preserve

- Current WhatsApp click behavior
- Existing custom messages where present
- Footer links opening in a new tab
- Product enquiry flows
- Floating WhatsApp button behavior

## Exact Diff Proposal

```diff
diff --git a/script.js b/script.js
--- a/script.js
+++ b/script.js
@@
-            const whatsappNumber = getWhatsAppNumber(content);
-            const whatsappMessage = getWhatsAppMessage(content);
-            const whatsappUrl = buildWhatsAppUrl(whatsappNumber, whatsappMessage);
-            const whatsappCatalogUrl = whatsappNumber ? `https://wa.me/c/${whatsappNumber}` : "";
-            const contactEmail = getBrandValue(content, ["contact-email", "email"]);
-            const contactPhone = getBrandValue(content, ["contact-phone-display", "phone-display", "phone"]);
+            const whatsappNumber = getWhatsAppNumber(content);
+            const whatsappMessage = getWhatsAppMessage(content);
+            const whatsappUrl = buildWhatsAppUrl(whatsappNumber, whatsappMessage);
+            const whatsappCatalogUrl = whatsappNumber ? `https://wa.me/c/${whatsappNumber}` : "";
+            const contactEmail = getBrandValue(content, ["contact-email", "email"]);
+            const contactPhone = getBrandValue(content, ["contact-phone-display", "phone-display", "phone"]);
@@
-            if (whatsappCatalogUrl) {
-                document.querySelectorAll('a[href^="https://wa.me/c/"]').forEach((link) => {
-                    link.href = whatsappCatalogUrl;
-                });
-            }
+            if (whatsappCatalogUrl) {
+                document.querySelectorAll('a[href^="https://wa.me/c/"], [data-whatsapp-catalog-link="true"]').forEach((link) => {
+                    link.href = whatsappCatalogUrl;
+                });
+            }
 
-            if (whatsappUrl) {
-                document.querySelectorAll('a[href*="wa.me/"]').forEach((link) => {
-                    if (link.href.includes("/c/")) return;
-                    link.href = buildWhatsAppUrl(whatsappNumber, getLinkWhatsAppMessage(link, whatsappMessage));
-                });
-            }
+            if (whatsappUrl) {
+                document.querySelectorAll('a[href*="wa.me/"], [data-whatsapp-link="true"]').forEach((link) => {
+                    if (link.href.includes("/c/")) return;
+                    link.href = buildWhatsAppUrl(whatsappNumber, getLinkWhatsAppMessage(link, whatsappMessage));
+                });
+            }
@@
-            if (contactPhone) {
-                document.querySelectorAll(".contact-card").forEach((card) => {
-                    const heading = card.querySelector("h2");
-                    if (heading?.textContent.trim().toLowerCase() !== "phone") return;
-                    const link = card.querySelector('a[href*="wa.me/"]');
-                    if (!link) return;
-
-                    const textNode = Array.from(link.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
-                    if (textNode) {
-                        textNode.textContent = ` ${contactPhone} `;
-                    } else {
-                        link.append(document.createTextNode(` ${contactPhone} `));
-                    }
-                });
-            }
+            if (contactPhone) {
+                document.querySelectorAll('[data-contact-whatsapp-display="true"]').forEach((link) => {
+                    link.textContent = contactPhone;
+                });
+
+                document.querySelectorAll(".contact-card").forEach((card) => {
+                    const heading = card.querySelector("h2");
+                    if (heading?.textContent.trim().toLowerCase() !== "phone") return;
+                    const link = card.querySelector('a[href*="wa.me/"], [data-whatsapp-link="true"]');
+                    if (!link) return;
+
+                    const textNode = Array.from(link.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
+                    if (textNode) {
+                        textNode.textContent = ` ${contactPhone} `;
+                    } else {
+                        link.append(document.createTextNode(` ${contactPhone} `));
+                    }
+                });
+            }
+
+            const structuredDataNode = document.getElementById("brand-structured-data");
+            if (structuredDataNode && whatsappCatalogUrl) {
+                try {
+                    const structuredData = JSON.parse(structuredDataNode.textContent);
+                    const organizations = Array.isArray(structuredData["@graph"]) ? structuredData["@graph"] : [];
+                    organizations.forEach((entry) => {
+                        if (entry?.["@type"] !== "Organization") return;
+                        const currentSameAs = Array.isArray(entry.sameAs) ? entry.sameAs.filter((value) => !String(value || "").includes("wa.me/c/")) : [];
+                        entry.sameAs = [...currentSameAs, whatsappCatalogUrl];
+                    });
+                    structuredDataNode.textContent = JSON.stringify(structuredData, null, 2);
+                } catch (error) {
+                    console.warn("Unable to update structured data WhatsApp catalog link", error);
+                }
+            }
diff --git a/index.html b/index.html
--- a/index.html
+++ b/index.html
@@
-    <script type="application/ld+json">
+    <script id="brand-structured-data" type="application/ld+json">
@@
-              "https://www.instagram.com/thefloaa/",
-              "https://wa.me/c/919960144483"
+              "https://www.instagram.com/thefloaa/"
             ]
           }
         ]
@@
-                <a href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection" target="_blank" rel="noopener" onclick="fbq('trackCustom', 'WhatsAppClick'); gtag('event', 'whatsapp_chat_click', {'location': 'footer'});">WhatsApp</a>
+                <a href="#" data-whatsapp-link="true" target="_blank" rel="noopener" onclick="fbq('trackCustom', 'WhatsAppClick'); gtag('event', 'whatsapp_chat_click', {'location': 'footer'});">WhatsApp</a>
diff --git a/about.html b/about.html
--- a/about.html
+++ b/about.html
@@
-                <a href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection" target="_blank" rel="noopener">WhatsApp</a>
+                <a href="#" data-whatsapp-link="true" target="_blank" rel="noopener">WhatsApp</a>
diff --git a/bracelets.html b/bracelets.html
--- a/bracelets.html
+++ b/bracelets.html
@@
-                <a href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection" target="_blank" rel="noopener">WhatsApp</a>
+                <a href="#" data-whatsapp-link="true" target="_blank" rel="noopener">WhatsApp</a>
diff --git a/contact.html b/contact.html
--- a/contact.html
+++ b/contact.html
@@
-                <p>WhatsApp: <a class="contact-inline-link" href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection" target="_blank" rel="noopener">+91 9960144483</a></p>
+                <p>WhatsApp: <a class="contact-inline-link" href="#" data-whatsapp-link="true" data-contact-whatsapp-display="true" target="_blank" rel="noopener">WhatsApp</a></p>
@@
-                <a href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection" target="_blank" rel="noopener">WhatsApp</a>
+                <a href="#" data-whatsapp-link="true" target="_blank" rel="noopener">WhatsApp</a>
diff --git a/earrings.html b/earrings.html
--- a/earrings.html
+++ b/earrings.html
@@
-                <a href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection" target="_blank" rel="noopener">WhatsApp</a>
+                <a href="#" data-whatsapp-link="true" target="_blank" rel="noopener">WhatsApp</a>
diff --git a/necklaces.html b/necklaces.html
--- a/necklaces.html
+++ b/necklaces.html
@@
-                <a href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection" target="_blank" rel="noopener">WhatsApp</a>
+                <a href="#" data-whatsapp-link="true" target="_blank" rel="noopener">WhatsApp</a>
diff --git a/rings.html b/rings.html
--- a/rings.html
+++ b/rings.html
@@
-                <a href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection" target="_blank" rel="noopener">WhatsApp</a>
+                <a href="#" data-whatsapp-link="true" target="_blank" rel="noopener">WhatsApp</a>
diff --git a/shop.html b/shop.html
--- a/shop.html
+++ b/shop.html
@@
-                <a href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection" target="_blank" rel="noopener">WhatsApp</a>
+                <a href="#" data-whatsapp-link="true" target="_blank" rel="noopener">WhatsApp</a>
diff --git a/privacy-policy.html b/privacy-policy.html
--- a/privacy-policy.html
+++ b/privacy-policy.html
@@
-                <a href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection" target="_blank" rel="noopener">WhatsApp</a>
+                <a href="#" data-whatsapp-link="true" target="_blank" rel="noopener">WhatsApp</a>
diff --git a/refund-policy.html b/refund-policy.html
--- a/refund-policy.html
+++ b/refund-policy.html
@@
-                <a href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection" target="_blank" rel="noopener">WhatsApp</a>
+                <a href="#" data-whatsapp-link="true" target="_blank" rel="noopener">WhatsApp</a>
diff --git a/shipping-policy.html b/shipping-policy.html
--- a/shipping-policy.html
+++ b/shipping-policy.html
@@
-                <p>For shipping-related updates or support, please contact Team FLOAA at <a class="contact-inline-link" href="mailto:floaa.jewels@gmail.com?subject=FLOAA%20Shipping%20Support">floaa.jewels@gmail.com</a> or on <a class="contact-inline-link" href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20need%20help%20with%20shipping" target="_blank" rel="noopener">WhatsApp</a>.</p>
+                <p>For shipping-related updates or support, please contact Team FLOAA at <a class="contact-inline-link" href="mailto:floaa.jewels@gmail.com?subject=FLOAA%20Shipping%20Support">floaa.jewels@gmail.com</a> or on <a class="contact-inline-link" href="#" data-whatsapp-link="true" data-whatsapp-message="Hi FLOAA, I need help with shipping" target="_blank" rel="noopener">WhatsApp</a>.</p>
@@
-                <a href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection" target="_blank" rel="noopener">WhatsApp</a>
+                <a href="#" data-whatsapp-link="true" target="_blank" rel="noopener">WhatsApp</a>
diff --git a/terms-and-conditions.html b/terms-and-conditions.html
--- a/terms-and-conditions.html
+++ b/terms-and-conditions.html
@@
-                <a href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection" target="_blank" rel="noopener">WhatsApp</a>
+                <a href="#" data-whatsapp-link="true" target="_blank" rel="noopener">WhatsApp</a>
diff --git a/order-success/index.html b/order-success/index.html
--- a/order-success/index.html
+++ b/order-success/index.html
@@
-                <a href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection" target="_blank" rel="noopener">WhatsApp</a>
+                <a href="#" data-whatsapp-link="true" target="_blank" rel="noopener">WhatsApp</a>
diff --git a/payment-failed/index.html b/payment-failed/index.html
--- a/payment-failed/index.html
+++ b/payment-failed/index.html
@@
-                <a href="https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection" target="_blank" rel="noopener">WhatsApp</a>
+                <a href="#" data-whatsapp-link="true" target="_blank" rel="noopener">WhatsApp</a>
```

## Deployment Checklist

### Pre-deploy

- Confirm BrandContent contains:
  - `whatsapp-number`
  - `contact-whatsapp` if used as fallback
  - `contact-phone-display`
- Verify `script.js` hydrates:
  - footer links
  - floating WhatsApp button
  - contact page inline link
  - order-success footer link
  - payment-failed footer link
  - product enquiry links
  - homepage structured data catalog link
- Verify shipping policy custom message still works:
  - `Hi FLOAA, I need help with shipping`

### QA

- Test homepage footer WhatsApp link
- Test contact page visible WhatsApp number text
- Test product enquiry flows on product/category pages
- Test order-success page footer link
- Test payment-failed page footer link
- Test floating WhatsApp button
- Test structured data output in rendered homepage source

### Deploy

- Commit only the WhatsApp consolidation files
- Push site changes
- No Worker deployment needed for this change

### Post-deploy

- Validate live links open the correct WhatsApp number
- Validate no page still exposes hardcoded `9960144483`
- Validate BrandContent change propagates everywhere without HTML edits

## Rollback Plan

If the dynamic hydration fails after launch:

1. Revert the WhatsApp consolidation commit.
2. Restore hardcoded HTML `wa.me` links and visible display number.
3. Redeploy the site only.
4. Re-test:
   - homepage footer
   - contact page
   - order-success
   - payment-failed
   - shipping policy
   - floating WhatsApp button

Rollback does not require Worker rollback because this plan touches frontend only.

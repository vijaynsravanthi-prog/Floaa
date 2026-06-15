    const initializePage = async () => {
        const SHEET_ID = "1ZQzgsE-Yv7Ad6_t29hWi2UXe549YXcBu3dD_jEjygfs";
        const PRODUCTS_URL = "https://floaa-api.floaa.workers.dev/api/products";
        const BRAND_CONTENT_URL = `https://opensheet.elk.sh/${SHEET_ID}/BrandContent`;
        const ORDERS_API_URL = "https://floaa-api.floaa.workers.dev/orders";
        const PAYMENT_LINK_API_URL = "https://floaa-api.floaa.workers.dev/create-payment-link";
        const BAG_PAYMENT_LINK_API_URL = "https://floaa-api.floaa.workers.dev/create-bag-payment-link";
        const INDIAN_STATES_AND_UTS = [
            "Andhra Pradesh",
            "Arunachal Pradesh",
            "Assam",
            "Bihar",
            "Chhattisgarh",
            "Goa",
            "Gujarat",
            "Haryana",
            "Himachal Pradesh",
            "Jharkhand",
            "Karnataka",
            "Kerala",
            "Madhya Pradesh",
            "Maharashtra",
            "Manipur",
            "Meghalaya",
            "Mizoram",
            "Nagaland",
            "Odisha",
            "Punjab",
            "Rajasthan",
            "Sikkim",
            "Tamil Nadu",
            "Telangana",
            "Tripura",
            "Uttar Pradesh",
            "Uttarakhand",
            "West Bengal",
            "Andaman and Nicobar Islands",
            "Chandigarh",
            "Dadra and Nagar Haveli and Daman and Diu",
            "Delhi",
            "Jammu and Kashmir",
            "Ladakh",
            "Lakshadweep",
            "Puducherry"
        ];
        const IMAGE_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice"><rect width="100%" height="100%" fill="#f6f6f6"/></svg>');
        const imagePreloadCache = new Map();
        const getBrandRowsPromise = () => {
            if (typeof window === "undefined") {
                return Promise.resolve([]);
            }

            if (!window.__floaaBrandRowsPromise) {
                window.__floaaBrandRowsPromise = fetch(BRAND_CONTENT_URL)
                    .then((response) => response.ok ? response.json() : [])
                    .catch(() => []);
            }

            return window.__floaaBrandRowsPromise;
        };

        const applyImageFallback = (img, context = '') => {
            try {
                if (!img || img.dataset.__fallbackApplied) return;
                img.dataset.__fallbackApplied = '1';
                // only apply fallback if the original src was not a remote data: placeholder
                img.src = IMAGE_PLACEHOLDER;
                img.classList.add('img--failed');
                // keep layout reserved via existing CSS; log in dev for visibility
                if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                    console.warn('[ImageFallback] applied', context || 'unknown', img);
                }
            } catch (e) {
                // swallow errors to avoid breaking rendering
            }
        };
        const preloadImageSource = (src) => {
            const normalizedSrc = normalizeValue(src);
            if (!normalizedSrc) return Promise.resolve("");
            if (imagePreloadCache.has(normalizedSrc)) {
                return imagePreloadCache.get(normalizedSrc);
            }

            const preloadPromise = new Promise((resolve) => {
                const preloadImage = new Image();
                preloadImage.decoding = "async";
                preloadImage.addEventListener("load", () => resolve(normalizedSrc), { once: true });
                preloadImage.addEventListener("error", () => resolve(""), { once: true });
                preloadImage.src = normalizedSrc;
            });

            imagePreloadCache.set(normalizedSrc, preloadPromise);
            return preloadPromise;
        };
        const setSurfaceBackgroundImage = async (surface, nextImageSrc) => {
            if (!surface || !nextImageSrc) return;
            const preferredImageSrc = normalizeImagePath(nextImageSrc);
            const safeImageSrc = /^https?:\/\//i.test(preferredImageSrc) ? preferredImageSrc : encodeURI(preferredImageSrc);
            const loadedImageSrc = await preloadImageSource(safeImageSrc);
            if (!loadedImageSrc) return;
            surface.style.backgroundImage = `url("${loadedImageSrc}")`;
            surface.classList.add("is-ready");
        };
        const getPreferredAltText = (name, description = "") => cleanSheetValue(description) || normalizeValue(name);
        const initHeroSlider = () => {
            const slider = document.querySelector(".hero-slider");
            if (!slider) return;

            const slides = Array.from(slider.querySelectorAll(".hero-slide"));
            const dots = Array.from(slider.querySelectorAll(".hero-slider-dots button"));
            const previousButton = slider.querySelector(".hero-slider-prev");
            const nextButton = slider.querySelector(".hero-slider-next");
            if (slides.length <= 1) return;

            let activeIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains("is-active")));
            let intervalId;

            const showSlide = (index) => {
                activeIndex = (index + slides.length) % slides.length;
                slides.forEach((slide, slideIndex) => {
                    const isActive = slideIndex === activeIndex;
                    slide.classList.toggle("is-active", isActive);
                    slide.setAttribute("aria-hidden", String(!isActive));
                    slide.querySelectorAll("a, button").forEach((element) => {
                        if (isActive) {
                            element.removeAttribute("tabindex");
                        } else {
                            element.setAttribute("tabindex", "-1");
                        }
                    });
                });

                dots.forEach((dot, dotIndex) => {
                    const isActive = dotIndex === activeIndex;
                    dot.classList.toggle("is-active", isActive);
                    if (isActive) {
                        dot.setAttribute("aria-current", "true");
                    } else {
                        dot.removeAttribute("aria-current");
                    }
                });
            };

            const stopAutoSlide = () => {
                if (intervalId) {
                    window.clearInterval(intervalId);
                    intervalId = null;
                }
            };

            const startAutoSlide = () => {
                stopAutoSlide();
                intervalId = window.setInterval(() => showSlide(activeIndex + 1), 5600);
            };

            previousButton?.addEventListener("click", () => {
                showSlide(activeIndex - 1);
                startAutoSlide();
            });

            nextButton?.addEventListener("click", () => {
                showSlide(activeIndex + 1);
                startAutoSlide();
            });

            dots.forEach((dot, dotIndex) => {
                dot.addEventListener("click", () => {
                    showSlide(dotIndex);
                    startAutoSlide();
                });
            });

            slider.addEventListener("mouseenter", stopAutoSlide);
            slider.addEventListener("mouseleave", startAutoSlide);
            slider.addEventListener("focusin", stopAutoSlide);
            slider.addEventListener("focusout", startAutoSlide);
            showSlide(activeIndex);
            startAutoSlide();
        };

        const getHeroAlt = (value, fallbackValue = "") => cleanSheetValue(value) || normalizeValue(fallbackValue);

        initHeroSlider();

        const normalizeValue = (value) => String(value || "").trim();
        const cleanSheetValue = (value) => normalizeValue(value)
            .replace(/^"+|"+$/g, "")
            .replace(/^'+|'+$/g, "")
            .replace(/",$/, "")
            .trim();
        const escapeHtml = (value) => normalizeValue(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        const normalizeSlug = (value) => normalizeValue(value).toLowerCase();
        const buildAnchorSlug = (value) => normalizeValue(value)
            .toLowerCase()
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .replace(/-{2,}/g, "-");
        const normalizeKey = (value) => {
            const key = normalizeSlug(value).replace(/[\s_-]+/g, "-");
            const aliases = {
                colorstone: "colour-stone",
                "color-stone": "colour-stone",
                colourstone: "colour-stone"
            };
            return aliases[key] || key;
        };
        const normalizeStatus = (value) => normalizeSlug(value).replace(/[\s-]+/g, "");
        const normalizeList = (value) => cleanSheetValue(value)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        const BRANDING_IMAGE_FILENAMES = new Set([
            "logo-primary.jpeg",
            "whatsapp.png",
            "floaa-editorial-coastal.png",
            "floaa-editorial-daylight.png",
            "floaa-editorial-evening.png",
            "hero-pistachio-mobile.jpeg",
            "hero-pistachio-desktop.webp",
            "hero-ruby.webp",
            "hero-tripti.webp"
        ]);
        const PRODUCT_JPG_FILENAMES = new Set([
            "lavender-empress-set-1.jpg",
            "lavender-empress-set-3.jpg"
        ]);
        const normalizeImagePath = (value) => {
            const image = cleanSheetValue(value);
            if (!image || /^https?:\/\//i.test(image) || image.startsWith("assets/")) return image;
            const normalizedImage = image.toLowerCase();
            const resolvedImage = normalizedImage.endsWith(".jpg")
                && !BRANDING_IMAGE_FILENAMES.has(normalizedImage)
                && !PRODUCT_JPG_FILENAMES.has(normalizedImage)
                ? image.replace(/\.jpg$/i, ".jpeg")
                : image;
            const assetFolder = BRANDING_IMAGE_FILENAMES.has(resolvedImage.toLowerCase()) ? "branding" : "products";
            return `assets/${assetFolder}/${resolvedImage}`;
        };
        const getProductThumbnailSrc = (value) => {
            const imagePath = normalizeImagePath(value);
            if (!imagePath || /^https?:\/\//i.test(imagePath)) return imagePath;

            const extensionMatch = imagePath.match(/(\.[^.]+)$/);
            if (!extensionMatch) return imagePath;

            return imagePath.replace(/(\.[^.]+)$/, "-thumb.jpg");
        };
        const getProductImages = (value) => normalizeList(value).map(normalizeImagePath).filter(Boolean);
        const parsePrice = (value) => {
            const price = Number(normalizeValue(value).replace(/[^\d.]/g, ""));
            return Number.isFinite(price) ? price : 0;
        };
        const wait = (delayMs) => new Promise((resolve) => {
            window.setTimeout(resolve, delayMs);
        });
        const fetchJsonWithRetry = async (url, resourceLabel, { attempts = 3, delayMs = 500 } = {}) => {
            let lastError = null;

            for (let attempt = 1; attempt <= attempts; attempt += 1) {
                try {
                    const controller = new AbortController();
                    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
                    const response = await fetch(url, {
                        cache: "no-store",
                        signal: controller.signal
                    }).finally(() => {
                        window.clearTimeout(timeoutId);
                    });
                    if (!response.ok) {
                        throw new Error(`${resourceLabel} request failed: ${response.status}`);
                    }
                    return await response.json();
                } catch (error) {
                    lastError = error;
                    if (attempt >= attempts) break;
                    await wait(delayMs * attempt);
                }
            }

            throw lastError || new Error(`${resourceLabel} request failed`);
        };
        const isNewArrival = (value) => {
            const createdDate = normalizeValue(value);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(createdDate)) return false;

            const createdTime = new Date(`${createdDate}T00:00:00`).getTime();
            if (!Number.isFinite(createdTime)) return false;

            const daysOld = (Date.now() - createdTime) / (1000 * 60 * 60 * 24);
            return daysOld >= 0 && daysOld <= 7;
        };
        const filterProductsByPrice = (items, range) => {
            if (!range || range === "all") return items;

            return items.filter((product) => {
                const price = product.discountPriceValue || product.priceValue;
                if (!price) return false;

                if (range === "under-1500") return price < 1500;
                if (range === "1500-2500") return price >= 1500 && price <= 2500;
                if (range === "above-2500") return price > 2500;
                return true;
            });
        };
        const matchesCategoryFilter = (product, categoryFilterKey) => {
            const candidates = new Set([categoryFilterKey]);
            if (categoryFilterKey.endsWith("s")) {
                candidates.add(categoryFilterKey.slice(0, -1));
            }

            const searchableFields = [
                ...(product.filters || []),
                product.style,
                normalizeKey(product.tag),
                normalizeKey(product.name),
                normalizeKey(product.description)
            ].filter(Boolean);

            return Array.from(candidates).some((candidate) =>
                searchableFields.some((value) => value === candidate || value.includes(candidate))
            );
        };
        const applyProductFilters = (items, { style = "", price = "", categoryFilter = "" } = {}) => {
            const styleKey = normalizeKey(style);
            const categoryFilterKey = normalizeKey(categoryFilter);
            const hasStyleData = items.some((product) => product.style);
            const hasFilterData = items.some((product) => product.filters?.length);
            let filteredItems = styleKey && hasStyleData ? items.filter((product) => product.style === styleKey) : items;
            filteredItems = filterProductsByPrice(filteredItems, price);
            if (categoryFilterKey && categoryFilterKey !== "all") {
                const matchingItems = filteredItems.filter((product) => matchesCategoryFilter(product, categoryFilterKey));
                if (matchingItems.length || hasFilterData) {
                    filteredItems = matchingItems.length ? matchingItems : filteredItems;
                }
            }
            return filteredItems;
        };
        const getRowValue = (row, names) => {
            const normalizedNames = names.map(normalizeSlug);
            const matchingKey = Object.keys(row).find((key) => normalizedNames.includes(normalizeSlug(key)));
            return matchingKey ? row[matchingKey] : "";
        };
        const formatPrice = (value) => {
            const price = cleanSheetValue(value);
            return price ? `₹${price.replace(/^₹\s*/, "")}` : "";
        };
        const getBrandEntry = (content, keys) => keys
            .map((key) => content[normalizeKey(key)] || content[key])
            .find((entry) => entry && (normalizeValue(entry.value) || normalizeValue(entry.alt)));
        const getBrandValue = (content, keys) => cleanSheetValue(getBrandEntry(content, keys)?.value || "");
        const getWhatsAppNumber = (content) => normalizeValue(getBrandValue(content, [
            "whatsapp-number",
            "whatsapp",
            "contact-whatsapp",
            "phone",
            "contact-phone"
        ])).replace(/[^\d]/g, "");
        const getWhatsAppMessage = (content) => cleanSheetValue(getBrandValue(content, [
            "whatsapp-default-message",
            "whatsapp-message",
            "contact-whatsapp-message"
        ])) || "Hi FLOAA, I am interested in your collection";
        const getLinkWhatsAppMessage = (link, fallbackMessage) => cleanSheetValue(link?.dataset?.whatsappMessage || "") || fallbackMessage;
        const buildWhatsAppUrl = (number, message) => number
            ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
            : "";
        const trackMetaWhatsAppClick = () => {
            if (typeof window.fbq !== "function") return;
            window.fbq("trackCustom", "WhatsAppClick");
        };
        const trackMetaCustomEvent = (eventName) => {
            if (typeof window.fbq !== "function") return;
            window.fbq("trackCustom", eventName);
        };
        const trackEvent = (eventName, params = {}) => {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: eventName,
                page_path: window.location.pathname,
                ...params
            });
        };
        window.trackEvent = trackEvent;
        const scheduleAnalyticsTask = (callback) => {
            if (typeof callback !== "function") return;

            try {
                if (typeof window.requestIdleCallback === "function") {
                    window.requestIdleCallback(() => {
                        try {
                            callback();
                        } catch (error) {
                            // Analytics must never interrupt the customer journey.
                        }
                    }, { timeout: 1500 });
                    return;
                }

                if (typeof window.queueMicrotask === "function") {
                    window.queueMicrotask(() => {
                        try {
                            callback();
                        } catch (error) {
                            // Analytics must never interrupt the customer journey.
                        }
                    });
                    return;
                }

                window.setTimeout(() => {
                    try {
                        callback();
                    } catch (error) {
                        // Analytics must never interrupt the customer journey.
                    }
                }, 0);
            } catch (error) {
                // Analytics scheduling must fail silently.
            }
        };
        const toFiniteAmount = (value) => {
            const normalized = typeof value === "number"
                ? value
                : Number(String(value || "").replace(/[^0-9.]/g, ""));
            return Number.isFinite(normalized) ? normalized : 0;
        };
        const normalizeAnalyticsItems = (items) => {
            if (!Array.isArray(items)) return [];

            return items
                .map((item) => {
                    if (!item || typeof item !== "object") return null;

                    const itemId = normalizeValue(item.productId || item.item_id || item.id);
                    const itemName = normalizeValue(item.name || item.item_name);
                    const itemCategory = normalizeValue(item.category || item.item_category);
                    const quantityValue = Number(item.quantity);
                    const quantity = Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 1;
                    const price = toFiniteAmount(
                        item.discountPriceValue
                        ?? item.priceValue
                        ?? item.discountPrice
                        ?? item.price
                        ?? item.value
                    );
                    const normalizedItem = {
                        item_id: itemId,
                        item_name: itemName,
                        quantity,
                        price
                    };

                    if (itemCategory) {
                        normalizedItem.item_category = itemCategory;
                    }

                    return normalizedItem;
                })
                .filter((item) => item && (item.item_id || item.item_name));
        };
        const buildEcommerceEventPayload = (payload = {}) => {
            const items = normalizeAnalyticsItems(payload.items);
            const explicitCurrency = normalizeValue(payload.currency).toUpperCase();
            const currency = explicitCurrency || "INR";
            const explicitValue = toFiniteAmount(payload.value);
            const computedValue = explicitValue || items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
            const eventId = normalizeValue(payload.eventId || payload.event_id);
            const productId = normalizeValue(payload.productId || payload.item_id || items[0]?.item_id);
            const productName = normalizeValue(payload.productName || payload.item_name || items[0]?.item_name);
            const category = normalizeValue(payload.category || payload.item_category || items[0]?.item_category);
            const contents = items.map((item) => ({
                id: item.item_id || item.item_name,
                quantity: item.quantity || 1,
                item_price: item.price || 0
            }));
            const itemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0) || (items.length ? items.length : 1);

            return {
                eventId,
                currency,
                value: computedValue,
                itemCount,
                productId,
                productName,
                category,
                items,
                contents
            };
        };
        const ANALYTICS_SESSION_DEDUPE_STORAGE_KEY = "floaa-analytics-session-dedupe";
        const isAnalyticsDebugEnabled = () => {
            try {
                return Boolean(window.FLOAA_ANALYTICS_DEBUG);
            } catch (error) {
                return false;
            }
        };
        const logAnalyticsDebug = ({ event, payload, metaDispatched, ga4Dispatched, deduped }) => {
            if (!isAnalyticsDebugEnabled()) return;

            try {
                console.info("[FLOAA analytics]", {
                    event,
                    payload,
                    metaDispatched,
                    ga4Dispatched,
                    deduped
                });
            } catch (error) {
                // Debug logging must never affect the storefront.
            }
        };
        const readAnalyticsSessionDedupeState = () => {
            try {
                if (typeof window === "undefined" || !window.sessionStorage) return {};
                const rawState = window.sessionStorage.getItem(ANALYTICS_SESSION_DEDUPE_STORAGE_KEY);
                if (!rawState) return {};
                const parsedState = JSON.parse(rawState);
                return parsedState && typeof parsedState === "object" ? parsedState : {};
            } catch (error) {
                return {};
            }
        };
        const writeAnalyticsSessionDedupeState = (nextState) => {
            try {
                if (typeof window === "undefined" || !window.sessionStorage) return;
                window.sessionStorage.setItem(
                    ANALYTICS_SESSION_DEDUPE_STORAGE_KEY,
                    JSON.stringify(nextState && typeof nextState === "object" ? nextState : {})
                );
            } catch (error) {
                // Analytics dedupe persistence must fail silently.
            }
        };
        const buildAnalyticsSessionDedupeKey = (scope, identifier) => {
            const normalizedScope = normalizeValue(scope).toLowerCase();
            const normalizedIdentifier = normalizeValue(identifier).toLowerCase();
            if (!normalizedScope || !normalizedIdentifier) return "";
            return `${normalizedScope}:${normalizedIdentifier}`;
        };
        const claimAnalyticsSessionDedupeKey = (dedupeKey) => {
            const normalizedKey = normalizeValue(dedupeKey);
            if (!normalizedKey) return false;

            try {
                const currentState = readAnalyticsSessionDedupeState();
                if (currentState[normalizedKey]) {
                    return true;
                }

                writeAnalyticsSessionDedupeState({
                    ...currentState,
                    [normalizedKey]: new Date().toISOString()
                });
            } catch (error) {
                return false;
            }

            return false;
        };
        const dispatchEcommerceEvent = ({ metaEventName = "", ga4EventName = "", payload = {}, dedupeKey = "" } = {}) => {
            try {
                const ecommerce = buildEcommerceEventPayload(payload);
                const deduped = claimAnalyticsSessionDedupeKey(dedupeKey);

                if (deduped) {
                    logAnalyticsDebug({
                        event: {
                            meta: metaEventName || "",
                            ga4: ga4EventName || ""
                        },
                        payload: ecommerce,
                        metaDispatched: false,
                        ga4Dispatched: false,
                        deduped: true
                    });
                    return;
                }

                scheduleAnalyticsTask(() => {
                    let metaDispatched = false;
                    let ga4Dispatched = false;

                    try {
                        if (metaEventName && typeof window.fbq === "function") {
                            const metaPayload = {
                                content_ids: ecommerce.items.map((item) => item.item_id).filter(Boolean),
                                contents: ecommerce.contents,
                                value: ecommerce.value,
                                currency: ecommerce.currency,
                                content_type: ecommerce.contents.length > 1 ? "product_group" : "product",
                                num_items: ecommerce.itemCount
                            };

                            if (ecommerce.productName) {
                                metaPayload.content_name = ecommerce.productName;
                            }

                            if (ecommerce.category) {
                                metaPayload.content_category = ecommerce.category;
                            }

                            if (ecommerce.eventId) {
                                window.fbq("track", metaEventName, metaPayload, { eventID: ecommerce.eventId });
                            } else {
                                window.fbq("track", metaEventName, metaPayload);
                            }

                            metaDispatched = true;
                        }
                    } catch (error) {
                        metaDispatched = false;
                    }

                    try {
                        if (ga4EventName) {
                            const eventPayload = {
                                event: ga4EventName,
                                page_path: window.location.pathname,
                                ecommerce: {
                                    currency: ecommerce.currency,
                                    value: ecommerce.value,
                                    items: ecommerce.items
                                }
                            };

                            if (ecommerce.eventId) {
                                eventPayload.event_id = ecommerce.eventId;
                            }

                            window.dataLayer = window.dataLayer || [];
                            window.dataLayer.push(eventPayload);
                            ga4Dispatched = true;
                        }
                    } catch (error) {
                        ga4Dispatched = false;
                    }

                    logAnalyticsDebug({
                        event: {
                            meta: metaEventName || "",
                            ga4: ga4EventName || ""
                        },
                        payload: ecommerce,
                        metaDispatched,
                        ga4Dispatched,
                        deduped: false
                    });
                });
            } catch (error) {
                // Ecommerce tracking wrappers must fail silently.
            }
        };
        const buildAnalyticsProductPayload = (product, overrides = {}) => {
            try {
                const productId = normalizeValue(product?.productId || overrides.productId);
                const productName = normalizeValue(product?.name || overrides.productName);
                const category = normalizeValue(product?.category || overrides.category);
                const price = toFiniteAmount(
                    overrides.value
                    ?? product?.discountPriceValue
                    ?? product?.priceValue
                    ?? product?.discountPrice
                    ?? product?.price
                );

                return {
                    currency: normalizeValue(overrides.currency).toUpperCase() || "INR",
                    value: price,
                    productId,
                    productName,
                    category,
                    eventId: normalizeValue(overrides.eventId || overrides.event_id),
                    items: [
                        {
                            productId,
                            name: productName,
                            category,
                            price,
                            quantity: Number(overrides.quantity) > 0 ? Number(overrides.quantity) : 1
                        }
                    ]
                };
            } catch (error) {
                return {
                    currency: "INR",
                    value: 0,
                    items: []
                };
            }
        };
        const buildAnalyticsBagPayload = (items, overrides = {}) => {
            try {
                const normalizedItems = Array.isArray(items)
                    ? items
                        .map((item) => {
                            const productId = normalizeValue(item?.productId);
                            const productName = normalizeValue(item?.name);
                            const price = toFiniteAmount(item?.price);

                            if (!productId || !productName || !price) {
                                return null;
                            }

                            return {
                                productId,
                                name: productName,
                                price,
                                quantity: 1
                            };
                        })
                        .filter(Boolean)
                    : [];

                return {
                    currency: normalizeValue(overrides.currency).toUpperCase() || "INR",
                    value: toFiniteAmount(overrides.value) || normalizedItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0),
                    eventId: normalizeValue(overrides.eventId || overrides.event_id),
                    items: normalizedItems
                };
            } catch (error) {
                return {
                    currency: "INR",
                    value: 0,
                    items: []
                };
            }
        };
        const trackViewContent = (payload = {}, options = {}) => {
            try {
                dispatchEcommerceEvent({
                    metaEventName: "ViewContent",
                    ga4EventName: "view_item",
                    payload,
                    dedupeKey: options.dedupeKey
                });
            } catch (error) {
                // Ecommerce tracking wrappers must fail silently.
            }
        };
        const trackAddToCart = (payload = {}, options = {}) => {
            try {
                dispatchEcommerceEvent({
                    metaEventName: "AddToCart",
                    ga4EventName: "add_to_cart",
                    payload,
                    dedupeKey: options.dedupeKey
                });
            } catch (error) {
                // Ecommerce tracking wrappers must fail silently.
            }
        };
        const trackInitiateCheckout = (payload = {}, options = {}) => {
            try {
                dispatchEcommerceEvent({
                    metaEventName: "InitiateCheckout",
                    ga4EventName: "begin_checkout",
                    payload,
                    dedupeKey: options.dedupeKey
                });
            } catch (error) {
                // Ecommerce tracking wrappers must fail silently.
            }
        };
        const trackPurchase = (payload = {}, options = {}) => {
            try {
                dispatchEcommerceEvent({
                    metaEventName: "Purchase",
                    ga4EventName: "purchase",
                    payload,
                    dedupeKey: options.dedupeKey
                });
            } catch (error) {
                // Ecommerce tracking wrappers must fail silently.
            }
        };
        window.trackViewContent = trackViewContent;
        window.trackAddToCart = trackAddToCart;
        window.trackInitiateCheckout = trackInitiateCheckout;
        window.trackPurchase = trackPurchase;
        const getProductWhatsAppPayload = (item) => {
            const finalPrice = item.discountPrice || item.price;
            let imageUrl = "";

            if (item.image) {
                const publicSiteUrl = "https://floaa.in/";
                const resolvedImageUrl = new URL(encodeURI(item.image), window.location.href);
                const isLocalHostImage = /^(localhost|127\.0\.0\.1)$/i.test(resolvedImageUrl.hostname);
                imageUrl = isLocalHostImage
                    ? new URL(resolvedImageUrl.pathname.replace(/^\/+/, ""), publicSiteUrl).href
                    : resolvedImageUrl.href;
            }

            return {
                finalPrice,
                imageUrl
            };
        };
        const isVideoAsset = (value) => /\.(mp4|webm|ogg|mov)(?:[?#].*)?$/i.test(normalizeValue(value));
        const isImageAsset = (value) => /\.(avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(normalizeValue(value));
        const buildProductGalleryItems = (item) => {
            const rawSources = [item.image, ...(Array.isArray(item.images) ? item.images : [])]
                .map(normalizeValue)
                .filter(Boolean);
            const uniqueSources = [];
            const seenSources = new Set();

            rawSources.forEach((source) => {
                if (seenSources.has(source)) return;
                seenSources.add(source);
                uniqueSources.push(source);
            });

            return uniqueSources
                .filter((source) => isImageAsset(source) || isVideoAsset(source))
                .map((source, index) => ({
                    src: source,
                    thumb: isVideoAsset(source) ? source : getProductThumbnailSrc(source),
                    type: isVideoAsset(source) ? "video" : "image",
                    alt: getPreferredAltText(item.name, item.description),
                    label: `${item.name} ${index + 1}`
                }));
        };
        const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);
        const galleryAssetPreloadCache = new Map();
        const preloadGalleryAsset = (item) => {
            if (!item || item.type !== "image" || !item.src) return Promise.resolve();
            if (galleryAssetPreloadCache.has(item.src)) {
                return galleryAssetPreloadCache.get(item.src);
            }

            const image = new Image();
            image.decoding = "async";
            const preloadPromise = new Promise((resolve) => {
                image.addEventListener("load", () => resolve(image), { once: true });
                image.addEventListener("error", () => resolve(null), { once: true });
            });
            galleryAssetPreloadCache.set(item.src, preloadPromise);
            image.src = item.src;
            return preloadPromise;
        };
        const warmProductZoomAssets = (item) => {
            const galleryItems = buildProductGalleryItems(item);
            preloadGalleryAsset(galleryItems[0]);
            preloadGalleryAsset(galleryItems[1]);
        };
        const createProductGalleryLightbox = () => {
            const popup = document.createElement("div");
            popup.className = "product-gallery-lightbox";
            popup.hidden = true;
            popup.innerHTML = `
                <div class="product-gallery-lightbox__backdrop" data-gallery-close="true"></div>
                <div class="product-gallery-lightbox__dialog" role="dialog" aria-modal="true" aria-labelledby="product-gallery-title">
                    <button class="product-gallery-lightbox__close" type="button" aria-label="Close gallery" data-gallery-close="true">&times;</button>
                    <h2 id="product-gallery-title" class="sr-only"></h2>
                    <div class="product-gallery-lightbox__stage">
                        <button class="product-gallery-lightbox__nav product-gallery-lightbox__nav--prev" type="button" aria-label="Previous media">
                            <span aria-hidden="true">&#8249;</span>
                        </button>
                        <div class="product-gallery-lightbox__viewport">
                            <div class="product-gallery-lightbox__media-frame is-loading">
                                <img class="product-gallery-lightbox__image" alt="" hidden>
                                <video class="product-gallery-lightbox__video" controls playsinline preload="metadata" hidden></video>
                                <div class="product-gallery-lightbox__shimmer" aria-hidden="true"></div>
                            </div>
                        </div>
                        <button class="product-gallery-lightbox__nav product-gallery-lightbox__nav--next" type="button" aria-label="Next media">
                            <span aria-hidden="true">&#8250;</span>
                        </button>
                    </div>
                    <div class="product-gallery-lightbox__thumbs" role="tablist" aria-label="Product media thumbnails"></div>
                </div>
            `;
            document.body.append(popup);

            const dialog = popup.querySelector(".product-gallery-lightbox__dialog");
            const title = popup.querySelector("#product-gallery-title");
            const viewport = popup.querySelector(".product-gallery-lightbox__viewport");
            const mediaFrame = popup.querySelector(".product-gallery-lightbox__media-frame");
            const image = popup.querySelector(".product-gallery-lightbox__image");
            const video = popup.querySelector(".product-gallery-lightbox__video");
            const thumbs = popup.querySelector(".product-gallery-lightbox__thumbs");
            const previousButton = popup.querySelector(".product-gallery-lightbox__nav--prev");
            const nextButton = popup.querySelector(".product-gallery-lightbox__nav--next");

            const state = {
                item: null,
                galleryItems: [],
                activeIndex: 0,
                scale: 1,
                translateX: 0,
                translateY: 0,
                panLimitX: 0,
                panLimitY: 0,
                hoverZoom: false,
                hoverX: "50%",
                hoverY: "50%",
                previousActiveElement: null,
                touchMode: "",
                touchStartX: 0,
                touchStartY: 0,
                touchStartTranslateX: 0,
                touchStartTranslateY: 0,
                touchStartScale: 1,
                touchStartDistance: 0,
                lastTapTime: 0,
                isDragging: false,
                pointerId: null,
                pointerStartX: 0,
                pointerStartY: 0,
                dragStartTranslateX: 0,
                dragStartTranslateY: 0
            };

            const isTouchViewport = () => window.matchMedia("(pointer: coarse)").matches;
            const currentMedia = () => state.galleryItems[state.activeIndex] || null;

            const syncCursor = () => {
                if (image.hidden) return;
                if (state.isDragging) {
                    image.style.cursor = "grabbing";
                } else if (state.scale > 1) {
                    image.style.cursor = "grab";
                } else {
                    image.style.cursor = "zoom-in";
                }
            };

            const updatePanLimits = () => {
                const activeMedia = currentMedia();
                if (!activeMedia || activeMedia.type !== "image" || state.scale <= 1) {
                    state.panLimitX = 0;
                    state.panLimitY = 0;
                    return;
                }

                const frameRect = mediaFrame.getBoundingClientRect();
                const width = frameRect.width || 0;
                const height = frameRect.height || 0;
                state.panLimitX = Math.max(0, ((width * state.scale) - width) / 2);
                state.panLimitY = Math.max(0, ((height * state.scale) - height) / 2);
            };

            const applyImageTransform = () => {
                if (image.hidden) return;

                updatePanLimits();
                if (state.scale > 1) {
                    state.translateX = clampValue(state.translateX, -state.panLimitX, state.panLimitX);
                    state.translateY = clampValue(state.translateY, -state.panLimitY, state.panLimitY);
                    image.style.transformOrigin = "50% 50%";
                    image.style.transform = `translate3d(${state.translateX}px, ${state.translateY}px, 0) scale(${state.scale})`;
                    mediaFrame.classList.remove("is-hover-zoom");
                    syncCursor();
                    return;
                }

                state.translateX = 0;
                state.translateY = 0;
                if (state.hoverZoom && !isTouchViewport()) {
                    image.style.transformOrigin = `${state.hoverX} ${state.hoverY}`;
                    image.style.transform = "scale(1.72)";
                    mediaFrame.classList.add("is-hover-zoom");
                } else {
                    image.style.transformOrigin = "50% 50%";
                    image.style.transform = "translate3d(0, 0, 0) scale(1)";
                    mediaFrame.classList.remove("is-hover-zoom");
                }
                syncCursor();
            };

            const resetZoomState = () => {
                state.scale = 1;
                state.translateX = 0;
                state.translateY = 0;
                state.hoverZoom = false;
                applyImageTransform();
            };

            const setLoadingState = (isLoading) => {
                mediaFrame.classList.toggle("is-loading", isLoading);
            };

            const syncGalleryChrome = () => {
                const hasMultipleItems = state.galleryItems.length > 1;
                thumbs.hidden = !hasMultipleItems;
                previousButton.hidden = !hasMultipleItems;
                nextButton.hidden = !hasMultipleItems;
            };

            const renderThumbs = () => {
                thumbs.innerHTML = "";
                syncGalleryChrome();
                if (state.galleryItems.length <= 1) return;
                const fragment = document.createDocumentFragment();

                state.galleryItems.forEach((galleryItem, index) => {
                    const thumbButton = document.createElement("button");
                    thumbButton.className = "product-gallery-lightbox__thumb";
                    thumbButton.type = "button";
                    thumbButton.setAttribute("role", "tab");
                    thumbButton.setAttribute("aria-selected", String(index === state.activeIndex));
                    thumbButton.setAttribute("aria-label", `${galleryItem.type === "video" ? "Video" : "Image"} ${index + 1}`);
                    thumbButton.classList.toggle("is-active", index === state.activeIndex);

                    if (galleryItem.type === "video") {
                        const badge = document.createElement("span");
                        badge.className = "product-gallery-lightbox__thumb-video";
                        badge.textContent = "Play";
                        thumbButton.append(badge);
                    } else {
                        const thumbImage = document.createElement("img");
                        thumbImage.src = galleryItem.thumb;
                        thumbImage.alt = galleryItem.alt;
                        thumbImage.loading = "lazy";
                        thumbImage.decoding = "async";
                        thumbButton.append(thumbImage);
                    }

                    thumbButton.addEventListener("click", () => showMedia(index));
                    fragment.append(thumbButton);
                });

                thumbs.append(fragment);
                thumbs.querySelector(".product-gallery-lightbox__thumb.is-active")?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "center"
                });
            };

            const showMedia = (index) => {
                if (!state.galleryItems.length) return;

                state.activeIndex = (index + state.galleryItems.length) % state.galleryItems.length;
                const galleryItem = currentMedia();
                resetZoomState();
                setLoadingState(galleryItem.type === "image");

                image.hidden = galleryItem.type !== "image";
                video.hidden = galleryItem.type !== "video";
                syncGalleryChrome();

                if (galleryItem.type === "image") {
                    video.pause();
                    video.removeAttribute("src");
                    video.load();
                    image.alt = galleryItem.alt;
                    image.src = galleryItem.src;
                    if (image.complete) {
                        setLoadingState(false);
                    }
                    preloadGalleryAsset(state.galleryItems[state.activeIndex - 1]);
                    preloadGalleryAsset(state.galleryItems[state.activeIndex + 1]);
                } else {
                    image.removeAttribute("src");
                    video.src = galleryItem.src;
                    video.load();
                    setLoadingState(false);
                }

                renderThumbs();
            };

            const closeGallery = () => {
                popup.hidden = true;
                popup.classList.remove("is-open");
                document.body.classList.remove("has-product-gallery-open");
                video.pause();
                video.removeAttribute("src");
                image.removeAttribute("src");
                thumbs.innerHTML = "";
                state.galleryItems = [];
                state.item = null;
                state.touchMode = "";
                state.lastTapTime = 0;
                state.isDragging = false;
                state.pointerId = null;
                setLoadingState(false);
                resetZoomState();
                if (state.previousActiveElement instanceof HTMLElement) {
                    state.previousActiveElement.focus();
                }
            };

            const openGallery = (item, trigger) => {
                const galleryItems = buildProductGalleryItems(item);
                if (!galleryItems.length) return;

                state.item = item;
                state.galleryItems = galleryItems;
                state.activeIndex = 0;
                state.previousActiveElement = trigger instanceof HTMLElement ? trigger : document.activeElement;
                title.textContent = item.name;
                popup.hidden = false;
                popup.classList.add("is-open");
                document.body.classList.add("has-product-gallery-open");
                syncGalleryChrome();
                showMedia(0);
                trackViewContent(
                    buildAnalyticsProductPayload(item),
                    {
                        dedupeKey: buildAnalyticsSessionDedupeKey(
                            "view_content",
                            item?.productId || item?.name
                        )
                    }
                );
                window.setTimeout(() => popup.querySelector(".product-gallery-lightbox__close")?.focus(), 0);
            };

            const moveMedia = (direction) => {
                if (state.galleryItems.length <= 1) return;
                showMedia(state.activeIndex + direction);
            };

            const distanceBetweenTouches = (touches) => {
                const [firstTouch, secondTouch] = touches;
                return Math.hypot(secondTouch.clientX - firstTouch.clientX, secondTouch.clientY - firstTouch.clientY);
            };

            const updateZoomAroundPoint = (nextScale, clientX, clientY) => {
                const activeMedia = currentMedia();
                if (!activeMedia || activeMedia.type !== "image") return;

                const frameRect = mediaFrame.getBoundingClientRect();
                const originX = frameRect.width ? ((clientX - frameRect.left) / frameRect.width) * 100 : 50;
                const originY = frameRect.height ? ((clientY - frameRect.top) / frameRect.height) * 100 : 50;
                image.style.transformOrigin = `${originX}% ${originY}%`;
                state.scale = clampValue(nextScale, 1, 4);
                if (state.scale === 1) {
                    state.translateX = 0;
                    state.translateY = 0;
                }
                applyImageTransform();
            };

            const performDoubleTapZoom = (clientX, clientY) => {
                if (image.hidden) return;

                image.classList.add("is-double-tap-anim");

                if (state.scale > 1) {
                    state.scale = 1;
                    state.translateX = 0;
                    state.translateY = 0;
                    image.style.transformOrigin = "50% 50%";
                    applyImageTransform();
                } else {
                    updateZoomAroundPoint(2, clientX, clientY);
                }

                window.setTimeout(() => {
                    image.classList.remove("is-double-tap-anim");
                }, 250);
            };

            const startPointerDrag = (event) => {
                if (image.hidden || event.pointerType !== "mouse" || state.scale <= 1) return;
                event.preventDefault();
                state.isDragging = true;
                state.pointerId = event.pointerId;
                state.pointerStartX = event.clientX;
                state.pointerStartY = event.clientY;
                state.dragStartTranslateX = state.translateX;
                state.dragStartTranslateY = state.translateY;
                image.setPointerCapture?.(event.pointerId);
                syncCursor();
            };

            const movePointerDrag = (event) => {
                if (!state.isDragging || state.pointerId !== event.pointerId) return;
                event.preventDefault();
                state.translateX = state.dragStartTranslateX + (event.clientX - state.pointerStartX);
                state.translateY = state.dragStartTranslateY + (event.clientY - state.pointerStartY);
                applyImageTransform();
            };

            const endPointerDrag = (event) => {
                if (state.pointerId !== null && state.pointerId !== event.pointerId) return;
                state.isDragging = false;
                state.pointerId = null;
                syncCursor();
            };

            image.addEventListener("load", () => {
                setLoadingState(false);
                applyImageTransform();
            });

            image.addEventListener("error", () => {
                // Ensure the lightbox shows a neutral fallback instead of remaining blank
                applyImageFallback(image, 'lightbox');
                setLoadingState(false);
                mediaFrame.classList.remove("is-hover-zoom");
                // unhide image so fallback is visible
                image.hidden = false;
            });

            image.addEventListener("dblclick", (event) => {
                event.preventDefault();
                performDoubleTapZoom(event.clientX, event.clientY);
            });

            viewport.addEventListener("wheel", (event) => {
                if (image.hidden) return;
                event.preventDefault();
                const direction = event.deltaY < 0 ? 0.32 : -0.32;
                const nextScale = state.scale + direction;
                updateZoomAroundPoint(nextScale, event.clientX, event.clientY);
            }, { passive: false });

            image.addEventListener("pointerdown", startPointerDrag);
            image.addEventListener("pointermove", movePointerDrag);
            image.addEventListener("pointerup", endPointerDrag);
            image.addEventListener("pointercancel", endPointerDrag);
            image.addEventListener("lostpointercapture", () => {
                state.isDragging = false;
                state.pointerId = null;
                syncCursor();
            });

            mediaFrame.addEventListener("mousemove", (event) => {
                if (isTouchViewport() || image.hidden || state.scale > 1) return;
                const rect = mediaFrame.getBoundingClientRect();
                state.hoverZoom = true;
                state.hoverX = `${((event.clientX - rect.left) / rect.width) * 100}%`;
                state.hoverY = `${((event.clientY - rect.top) / rect.height) * 100}%`;
                applyImageTransform();
            });

            mediaFrame.addEventListener("mouseleave", () => {
                state.hoverZoom = false;
                applyImageTransform();
            });

            viewport.addEventListener("touchstart", (event) => {
                if (image.hidden) return;
                if (event.touches.length === 2) {
                    event.preventDefault();
                    state.touchMode = "pinch";
                    state.touchStartScale = state.scale;
                    state.touchStartDistance = distanceBetweenTouches(event.touches);
                    return;
                }

                if (event.touches.length !== 1) return;

                const touch = event.touches[0];
                state.touchStartX = touch.clientX;
                state.touchStartY = touch.clientY;
                state.touchStartTranslateX = state.translateX;
                state.touchStartTranslateY = state.translateY;
                state.touchMode = state.scale > 1 ? "pan" : "swipe";
            }, { passive: false });

            viewport.addEventListener("touchmove", (event) => {
                if (image.hidden) return;
                if (state.touchMode === "pinch" && event.touches.length === 2) {
                    event.preventDefault();
                    const nextDistance = distanceBetweenTouches(event.touches);
                    const nextScale = state.touchStartScale * (nextDistance / state.touchStartDistance);
                    const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
                    const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
                    updateZoomAroundPoint(nextScale, centerX, centerY);
                    return;
                }

                if (state.touchMode === "pan" && event.touches.length === 1) {
                    event.preventDefault();
                    const touch = event.touches[0];
                    state.translateX = state.touchStartTranslateX + (touch.clientX - state.touchStartX);
                    state.translateY = state.touchStartTranslateY + (touch.clientY - state.touchStartY);
                    applyImageTransform();
                }
            }, { passive: false });

            viewport.addEventListener("touchend", (event) => {
                if (image.hidden) return;

                if (state.touchMode === "swipe" && !event.touches.length) {
                    const deltaX = (event.changedTouches[0]?.clientX || 0) - state.touchStartX;
                    const deltaY = (event.changedTouches[0]?.clientY || 0) - state.touchStartY;
                    const tapTime = Date.now();
                    const isTap = Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12;

                    if (isTap) {
                        if (tapTime - state.lastTapTime < 280) {
                            // Detected a double-tap: animate zoom/reset around tapped point.
                            event.preventDefault();
                            performDoubleTapZoom(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
                            state.lastTapTime = 0;
                        } else {
                            state.lastTapTime = tapTime;
                        }
                    } else if (Math.abs(deltaX) > 54 && Math.abs(deltaX) > Math.abs(deltaY)) {
                        moveMedia(deltaX < 0 ? 1 : -1);
                    }
                }

                if (state.touchMode === "pinch" && event.touches.length < 2 && state.scale <= 1.02) {
                    resetZoomState();
                }

                if (!event.touches.length) {
                    state.touchMode = "";
                }
            });

            previousButton.addEventListener("click", () => moveMedia(-1));
            nextButton.addEventListener("click", () => moveMedia(1));

            popup.addEventListener("click", (event) => {
                if (event.target.closest("[data-gallery-close='true']")) {
                    closeGallery();
                }
            });

            document.addEventListener("keydown", (event) => {
                if (popup.hidden) return;
                if (event.key === "Escape") {
                    closeGallery();
                } else if (event.key === "ArrowRight") {
                    moveMedia(1);
                } else if (event.key === "ArrowLeft") {
                    moveMedia(-1);
                }
            });

            return {
                open: openGallery
            };
        };
        const productGalleryLightbox = createProductGalleryLightbox();

        let searchProductsCache = null;
        const createSearchOverlay = () => {
            const overlay = document.createElement("div");
            overlay.className = "search-overlay";
            overlay.setAttribute("role", "dialog");
            overlay.setAttribute("aria-modal", "true");
            overlay.setAttribute("aria-label", "Search products");
            overlay.setAttribute("aria-hidden", "true");
            overlay.innerHTML = `
                <div class="search-overlay__header">
                    <div class="search-overlay__input-wrap">
                        <svg class="search-overlay__search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke-width="2"/><line x1="15.5" y1="15.5" x2="21" y2="21" stroke-width="2" stroke-linecap="round"/></svg>
                        <input type="search" class="search-overlay__input" placeholder="Search jewellery..." aria-label="Search products" autocomplete="off" autocorrect="off" spellcheck="false">
                    </div>
                    <button type="button" class="search-overlay__close" aria-label="Close search">Cancel</button>
                </div>
                <div class="search-overlay__body">
                    <div class="search-overlay__popular">
                        <p class="search-overlay__section-label">Popular Searches</p>
                        <div class="search-overlay__chips">
                            <button type="button" class="search-overlay__chip">Green Earrings</button>
                            <button type="button" class="search-overlay__chip">Pearl Necklace</button>
                            <button type="button" class="search-overlay__chip">Luxury Combos</button>
                            <button type="button" class="search-overlay__chip">Bracelets</button>
                        </div>
                    </div>
                    <div class="search-overlay__results" aria-live="polite" aria-label="Search results" hidden></div>
                    <div class="search-overlay__empty" hidden>
                        <p class="search-overlay__empty-text">No matching products found</p>
                        <p class="search-overlay__section-label">Browse by category</p>
                        <div class="search-overlay__browse-links">
                            <a href="earrings.html" class="search-overlay__browse-link">Earrings</a>
                            <a href="necklaces.html" class="search-overlay__browse-link">Necklaces</a>
                            <a href="bracelets.html" class="search-overlay__browse-link">Bracelets</a>
                            <a href="rings.html" class="search-overlay__browse-link">Combos</a>
                        </div>
                    </div>
                </div>
            `;
            document.body.append(overlay);

            const input = overlay.querySelector(".search-overlay__input");
            const closeBtn = overlay.querySelector(".search-overlay__close");
            const popularEl = overlay.querySelector(".search-overlay__popular");
            const resultsEl = overlay.querySelector(".search-overlay__results");
            const emptyEl = overlay.querySelector(".search-overlay__empty");

            let currentTrigger = null;
            let lazyFetchPromise = null;

            const showDefault = () => {
                popularEl.hidden = false;
                resultsEl.hidden = true;
                emptyEl.hidden = true;
                resultsEl.innerHTML = "";
            };

            const renderResults = (items) => {
                popularEl.hidden = true;
                emptyEl.hidden = true;
                resultsEl.hidden = false;
                resultsEl.innerHTML = "";
                items.forEach((item) => {
                    const card = document.createElement("button");
                    card.type = "button";
                    card.className = "search-result-card";
                    const thumb = item.image ? getProductThumbnailSrc(item.image) : "";
                    const displayPrice = item.discountPrice || item.price;
                    card.innerHTML = `
                        <img class="search-result-card__img" src="${escapeHtml(thumb)}" alt="${escapeHtml(item.name)}" width="60" height="60" loading="lazy">
                        <div class="search-result-card__info">
                            <span class="search-result-card__name">${escapeHtml(item.name)}</span>
                            <span class="search-result-card__price">${escapeHtml(displayPrice)}</span>
                        </div>
                        <span class="search-result-card__arrow" aria-hidden="true"></span>
                    `;
                    card.addEventListener("click", () => {
                        const savedTrigger = currentTrigger;
                        trackEvent("search_result_click", {
                            product_name: item.name,
                            product_category: item.category,
                            query: input.value.trim()
                        });
                        closeOverlay(false);
                        productGalleryLightbox.open(item, savedTrigger);
                    });
                    resultsEl.append(card);
                });
            };

            const runSearch = (query) => {
                const q = query.trim().toLowerCase();
                if (!q) { showDefault(); return; }
                if (!searchProductsCache) {
                    if (!lazyFetchPromise) {
                        lazyFetchPromise = fetchProducts().then((p) => {
                            searchProductsCache = p;
                            if (input.value.trim().toLowerCase() === q) runSearch(input.value);
                        });
                    }
                    return;
                }
                const scored = searchProductsCache
                    .map((item) => {
                        const name = (item.name || "").toLowerCase();
                        const category = (item.category || "").toLowerCase();
                        const desc = (item.description || "").toLowerCase();
                        const tag = (item.tag || "").toLowerCase();
                        let score = 0;
                        if (name.startsWith(q)) score = 100;
                        else if (name.includes(q)) score = 80;
                        else if (category.includes(q)) score = 60;
                        else if (desc.includes(q)) score = 40;
                        else if (tag.includes(q)) score = 20;
                        return { item, score };
                    })
                    .filter(({ score }) => score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 8)
                    .map(({ item }) => item);
                if (scored.length > 0) renderResults(scored);
                else {
                    popularEl.hidden = true;
                    resultsEl.hidden = true;
                    emptyEl.hidden = false;
                }
            };

            const openOverlay = (triggerEl) => {
                currentTrigger = triggerEl || null;
                overlay.setAttribute("aria-hidden", "false");
                overlay.classList.add("is-open");
                document.body.classList.add("has-search-overlay");
                trackEvent("search_open", { page: window.location.pathname });
                requestAnimationFrame(() => input.focus());
            };

            const closeOverlay = (restoreFocus = true) => {
                overlay.setAttribute("aria-hidden", "true");
                overlay.classList.remove("is-open");
                document.body.classList.remove("has-search-overlay");
                input.value = "";
                showDefault();
                if (restoreFocus && currentTrigger) currentTrigger.focus();
                currentTrigger = null;
            };

            const getFocusable = () => Array.from(
                overlay.querySelectorAll("button, input, a[href]")
            ).filter((el) => !el.closest("[hidden]"));

            overlay.addEventListener("keydown", (e) => {
                if (e.key === "Escape") { e.preventDefault(); closeOverlay(); return; }
                if (e.key === "Tab") {
                    const focusable = getFocusable();
                    if (!focusable.length) return;
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault(); last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault(); first.focus();
                    }
                }
            });

            let touchStartY = 0;
            overlay.addEventListener("touchstart", (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
            overlay.addEventListener("touchend", (e) => {
                if (e.changedTouches[0].clientY - touchStartY > 80) closeOverlay();
            }, { passive: true });

            input.addEventListener("input", () => runSearch(input.value));

            overlay.querySelectorAll(".search-overlay__chip").forEach((chip) => {
                chip.addEventListener("click", () => {
                    input.value = chip.textContent;
                    input.dispatchEvent(new Event("input"));
                    input.focus();
                });
            });

            closeBtn.addEventListener("click", () => closeOverlay());

            overlay.querySelector(".search-overlay__body").addEventListener("click", (e) => {
                if (e.target === e.currentTarget) closeOverlay();
            });

            return { open: openOverlay, close: closeOverlay };
        };
        const searchOverlay = createSearchOverlay();

        const createWhatsAppIntentPopup = () => {
            const popup = document.createElement("div");
            popup.className = "whatsapp-intent-popup";
            popup.hidden = true;
            popup.innerHTML = `
                <div class="whatsapp-intent-popup__backdrop" data-popup-close="true"></div>
                <div class="whatsapp-intent-popup__dialog" role="dialog" aria-modal="true" aria-labelledby="whatsapp-intent-title">
                    <button class="whatsapp-intent-popup__close" type="button" aria-label="Close popup" data-popup-close="true">&times;</button>
                    <div class="whatsapp-intent-popup__content">
                        <div class="whatsapp-intent-popup__panel whatsapp-intent-popup__panel--choices">
                            <p class="whatsapp-intent-popup__eyebrow">FLOAA WhatsApp</p>
                            <h2 id="whatsapp-intent-title" class="whatsapp-intent-popup__title">How would you like to continue?</h2>
                            <p class="whatsapp-intent-popup__subtitle">Our team can help with questions, styling or reserving your piece.</p>
                            <div class="whatsapp-intent-popup__product"></div>
                            <div class="whatsapp-intent-popup__actions">
                                <button class="btn btn-secondary whatsapp-intent-popup__action" type="button" data-intent-action="question">Ask a Question</button>
                                <button class="btn btn-primary whatsapp-intent-popup__action" type="button" data-intent-action="reserve">Reserve This Piece</button>
                            </div>
                        </div>
                        <div class="whatsapp-intent-popup__panel whatsapp-intent-popup__panel--form" hidden>
                            <button class="whatsapp-intent-popup__back" type="button" data-intent-back="true">Back</button>
                            <p class="whatsapp-intent-popup__eyebrow">Reserve This Piece</p>
                            <h2 class="whatsapp-intent-popup__title">Complete your WhatsApp order</h2>
                            <p class="whatsapp-intent-popup__subtitle">Share your details so we can confirm your piece and send the payment link.</p>
                            <form class="whatsapp-intent-popup__form" novalidate>
                                <label class="whatsapp-intent-popup__field">
                                    <span>Name</span>
                                    <input type="text" name="customerName" autocomplete="name" required>
                                </label>
                                <label class="whatsapp-intent-popup__field">
                                    <span>Delivery address</span>
                                    <textarea name="customerAddress" rows="4" autocomplete="street-address" required></textarea>
                                </label>
                                <p class="whatsapp-intent-popup__error" aria-live="polite" hidden></p>
                                <button class="btn btn-primary whatsapp-intent-popup__submit" type="submit">Continue on WhatsApp</button>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            document.body.append(popup);

            const dialog = popup.querySelector(".whatsapp-intent-popup__dialog");
            const productSummary = popup.querySelector(".whatsapp-intent-popup__product");
            const choicesPanel = popup.querySelector(".whatsapp-intent-popup__panel--choices");
            const formPanel = popup.querySelector(".whatsapp-intent-popup__panel--form");
            const form = popup.querySelector(".whatsapp-intent-popup__form");
            const nameInput = form.querySelector('input[name="customerName"]');
            const addressInput = form.querySelector('textarea[name="customerAddress"]');
            const errorMessage = popup.querySelector(".whatsapp-intent-popup__error");
            const askButton = popup.querySelector('[data-intent-action="question"]');
            const reserveButton = popup.querySelector('[data-intent-action="reserve"]');
            const backButton = popup.querySelector('[data-intent-back="true"]');
            let activeItem = null;
            let activeBrandContent = null;
            let previousActiveElement = null;

            const setProductSummary = (item) => {
                const { finalPrice } = getProductWhatsAppPayload(item);
                productSummary.innerHTML = `
                    <p class="whatsapp-intent-popup__product-name">${item.name}</p>
                    <p class="whatsapp-intent-popup__product-meta">${finalPrice}</p>
                `;
            };

            const openWhatsAppFromMessage = (message) => {
                const whatsappNumber = getWhatsAppNumber(activeBrandContent || {});
                if (!whatsappNumber) return;
                const whatsappUrl = buildWhatsAppUrl(whatsappNumber, message);
                trackMetaWhatsAppClick();
                window.open(whatsappUrl, "_blank", "noopener");
            };

            const resetForm = () => {
                form.reset();
                errorMessage.hidden = true;
                errorMessage.textContent = "";
            };

            const showChoices = () => {
                choicesPanel.hidden = false;
                formPanel.hidden = true;
                resetForm();
            };

            const showForm = () => {
                choicesPanel.hidden = true;
                formPanel.hidden = false;
                errorMessage.hidden = true;
                errorMessage.textContent = "";
                window.setTimeout(() => nameInput.focus(), 0);
            };

            const closePopup = () => {
                popup.hidden = true;
                popup.classList.remove("is-open");
                document.body.classList.remove("has-whatsapp-intent-popup");
                showChoices();
                activeItem = null;
                activeBrandContent = null;
                if (previousActiveElement instanceof HTMLElement) {
                    previousActiveElement.focus();
                }
            };

            const openPopup = (item, brandContent, trigger) => {
                activeItem = item;
                activeBrandContent = brandContent;
                previousActiveElement = trigger instanceof HTMLElement ? trigger : document.activeElement;
                setProductSummary(item);
                showChoices();
                popup.hidden = false;
                popup.classList.add("is-open");
                document.body.classList.add("has-whatsapp-intent-popup");
                window.setTimeout(() => askButton.focus(), 0);
            };

            popup.addEventListener("click", (event) => {
                const closeTarget = event.target.closest("[data-popup-close='true']");
                if (closeTarget) {
                    closePopup();
                }
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape" && !popup.hidden) {
                    closePopup();
                }
            });

            askButton.addEventListener("click", () => {
                if (!activeItem) return;
                const { finalPrice, imageUrl } = getProductWhatsAppPayload(activeItem);
                const message = [
                    "Hi FLOAA! I have a question about this piece.",
                    "",
                    `Product: ${activeItem.name}`,
                    `Price: ${finalPrice}`,
                    "Quantity: 1",
                    "",
                    imageUrl ? "View Product Image:" : "",
                    imageUrl || "",
                    "",
                    "Question:",
                    "Could you help me out?"
                ].filter(Boolean).join("\n");
                trackMetaCustomEvent("whatsapp_enquiry_click");
                openWhatsAppFromMessage(message);
                closePopup();
            });

            reserveButton.addEventListener("click", showForm);
            backButton.addEventListener("click", showChoices);

            form.addEventListener("submit", (event) => {
                event.preventDefault();
                if (!activeItem) return;

                const customerName = nameInput.value.trim();
                const customerAddress = addressInput.value.trim();
                if (!customerName || !customerAddress) {
                    errorMessage.textContent = "Please enter your name and delivery address to continue.";
                    errorMessage.hidden = false;
                    if (!customerName) {
                        nameInput.focus();
                    } else {
                        addressInput.focus();
                    }
                    return;
                }

                const { finalPrice, imageUrl } = getProductWhatsAppPayload(activeItem);
                const message = [
                    "Hi FLOAA! I'd like to order this.",
                    "",
                    `Product: ${activeItem.name}`,
                    `Price: ${finalPrice}`,
                    "Quantity: 1",
                    "",
                    imageUrl ? "View Product Image:" : "",
                    imageUrl || "",
                    "",
                    `Name: ${customerName}`,
                    `Address: ${customerAddress}`,
                    "",
                    "Please confirm and share the payment link."
                ].filter(Boolean).join("\n");

                trackMetaCustomEvent("whatsapp_order_submit");
                trackEvent("whatsapp_order_click", {
                    product_name: activeItem.name,
                    product_price: finalPrice,
                    product_category: activeItem.category,
                    location: "product_card"
                });
                openWhatsAppFromMessage(message);
                closePopup();
            });

            return {
                open(item, brandContent, trigger) {
                    openPopup(item, brandContent, trigger);
                }
            };
        };
        const whatsappIntentPopup = null;
        const openWhatsAppMessage = (brandContent, message) => {
            const whatsappNumber = getWhatsAppNumber(brandContent || {});
            if (!whatsappNumber) return;
            const whatsappUrl = buildWhatsAppUrl(whatsappNumber, message);
            trackMetaWhatsAppClick();
            window.open(whatsappUrl, "_blank", "noopener");
        };
        const getCanonicalProductPagePath = (product) => {
            const category = normalizeKey(product?.category);
            if (category === "earrings") return "earrings.html";
            if (category === "bracelets") return "bracelets.html";
            if (category === "necklaces") return "necklaces.html";
            if (category === "combos" || category === "comboset") return "rings.html";
            return "shop.html";
        };
        const getCanonicalProductUrl = (product) => {
            const anchorId = buildAnchorSlug(product?.name);
            const pagePath = getCanonicalProductPagePath(product);
            const canonicalUrl = new URL(pagePath, "https://floaa.in/");
            if (anchorId) {
                canonicalUrl.hash = anchorId;
            }
            return canonicalUrl.href;
        };
        const handleProductAssistance = (product) => {
            if (!product) return;

            const { finalPrice } = getProductWhatsAppPayload(product);
            const assistancePrice = normalizeValue(finalPrice).startsWith("₹") ? normalizeValue(finalPrice) : `₹${normalizeValue(finalPrice)}`;
            const productUrl = getCanonicalProductUrl(product);
            const message = [
                "Hello FLOAA,",
                "",
                "I am interested in this jewellery piece:",
                "",
                `Product: ${product.name}`,
                `Product ID: ${product.productId}`,
                `Price: ${assistancePrice}`,
                "",
                "Product Link:",
                productUrl,
                "",
                "I would appreciate some guidance before placing my order.",
                "",
                "Thank you."
            ].join("\n");

            trackEvent("whatsapp_assistance_click", {
                product_name: product.name,
                product_id: product.productId,
                product_category: product.category,
                location: "product_card"
            });
            openWhatsAppMessage(brandContent, message);
        };
        const createWhatsAppQuestionModal = () => {
            const popup = document.createElement("div");
            popup.className = "whatsapp-intent-popup whatsapp-question-popup";
            popup.hidden = true;
            popup.innerHTML = `
                <div class="whatsapp-intent-popup__backdrop" data-popup-close="true"></div>
                <div class="whatsapp-intent-popup__dialog whatsapp-question-popup__dialog" role="dialog" aria-modal="true" aria-labelledby="whatsapp-question-title">
                    <button class="whatsapp-intent-popup__close" type="button" aria-label="Close popup" data-popup-close="true">&times;</button>
                    <div class="whatsapp-intent-popup__content">
                        <div class="whatsapp-intent-popup__panel">
                            <h2 id="whatsapp-question-title" class="whatsapp-intent-popup__title">Ask a Question</h2>
                            <div class="whatsapp-intent-popup__product"></div>
                            <form class="whatsapp-intent-popup__form" novalidate>
                                <label class="whatsapp-intent-popup__field">
                                    <span class="sr-only">Your question</span>
                                    <textarea name="customerQuestion" rows="3" placeholder="Type your question..." required></textarea>
                                </label>
                                <p class="whatsapp-intent-popup__error" aria-live="polite" hidden></p>
                                <button class="btn btn-primary whatsapp-intent-popup__submit" type="submit">Continue on WhatsApp</button>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            document.body.append(popup);

            const productSummary = popup.querySelector(".whatsapp-intent-popup__product");
            const form = popup.querySelector(".whatsapp-intent-popup__form");
            const questionInput = form.querySelector('textarea[name="customerQuestion"]');
            const errorMessage = popup.querySelector(".whatsapp-intent-popup__error");
            let activeItem = null;
            let activeBrandContent = null;
            let previousActiveElement = null;

            const resetForm = () => {
                form.reset();
                errorMessage.hidden = true;
                errorMessage.textContent = "";
            };

            const closePopup = () => {
                popup.hidden = true;
                popup.classList.remove("is-open");
                document.body.classList.remove("has-whatsapp-intent-popup");
                resetForm();
                activeItem = null;
                activeBrandContent = null;
                if (previousActiveElement instanceof HTMLElement) {
                    previousActiveElement.focus();
                }
            };

            popup.addEventListener("click", (event) => {
                if (event.target.closest("[data-popup-close='true']")) {
                    closePopup();
                }
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape" && !popup.hidden) {
                    closePopup();
                }
            });

            form.addEventListener("submit", (event) => {
                event.preventDefault();
                if (!activeItem) return;

                const customerQuestion = questionInput.value.trim();
                if (!customerQuestion) {
                    errorMessage.textContent = "Please type your question to continue.";
                    errorMessage.hidden = false;
                    questionInput.focus();
                    return;
                }

                const { finalPrice, imageUrl } = getProductWhatsAppPayload(activeItem);
                const message = [
                    "Hi FLOAA! I have a question about this piece.",
                    "",
                    `Product: ${activeItem.name}`,
                    `Price: ${finalPrice}`,
                    "Quantity: 1",
                    "",
                    imageUrl ? "View Product Image:" : "",
                    imageUrl || "",
                    "",
                    "Question:",
                    customerQuestion
                ].filter(Boolean).join("\n");

                trackMetaCustomEvent("whatsapp_enquiry_click");
                openWhatsAppMessage(activeBrandContent, message);
                closePopup();
            });

            return {
                open(item, brandContent, trigger) {
                    activeItem = item;
                    activeBrandContent = brandContent;
                    previousActiveElement = trigger instanceof HTMLElement ? trigger : document.activeElement;
                    productSummary.innerHTML = `
                        <p class="whatsapp-intent-popup__product-name">${item.name}</p>
                    `;
                    resetForm();
                    popup.hidden = false;
                    popup.classList.add("is-open");
                    document.body.classList.add("has-whatsapp-intent-popup");
                    window.setTimeout(() => questionInput.focus(), 0);
                }
            };
        };
        const whatsappQuestionModal = createWhatsAppQuestionModal();
        const createWhatsAppReserveModal = () => {
            const popup = document.createElement("div");
            popup.className = "whatsapp-intent-popup whatsapp-reserve-popup";
            popup.hidden = true;
            popup.innerHTML = `
                <div class="whatsapp-intent-popup__backdrop" data-popup-close="true"></div>
                <div class="whatsapp-intent-popup__dialog whatsapp-reserve-popup__dialog" role="dialog" aria-modal="true" aria-labelledby="whatsapp-reserve-title">
                    <button class="whatsapp-intent-popup__close" type="button" aria-label="Close popup" data-popup-close="true">&times;</button>
                    <div class="whatsapp-intent-popup__content">
                        <div class="whatsapp-intent-popup__panel">
                            <p class="whatsapp-intent-popup__eyebrow">Order This Piece</p>
                            <h2 id="whatsapp-reserve-title" class="whatsapp-intent-popup__title">Order This Piece</h2>
                            <p class="whatsapp-intent-popup__subtitle">Share your details so we can confirm your piece and send the payment link.</p>
                            <div class="whatsapp-intent-popup__product"></div>
                            <form class="whatsapp-intent-popup__form" novalidate>
                                <label class="whatsapp-intent-popup__field">
                                    <span>Name</span>
                                    <input type="text" name="customerName" autocomplete="name" required>
                                </label>
                                <label class="whatsapp-intent-popup__field">
                                    <span>Delivery Address</span>
                                    <textarea name="customerAddress" rows="4" autocomplete="street-address" required></textarea>
                                </label>
                                <p class="whatsapp-intent-popup__error" aria-live="polite" hidden></p>
                                <button class="btn btn-primary whatsapp-intent-popup__submit" type="submit">Continue on WhatsApp</button>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            document.body.append(popup);

            const productSummary = popup.querySelector(".whatsapp-intent-popup__product");
            const form = popup.querySelector(".whatsapp-intent-popup__form");
            const nameInput = form.querySelector('input[name="customerName"]');
            const addressInput = form.querySelector('textarea[name="customerAddress"]');
            const errorMessage = popup.querySelector(".whatsapp-intent-popup__error");
            let activeItem = null;
            let activeBrandContent = null;
            let previousActiveElement = null;

            const resetForm = () => {
                form.reset();
                errorMessage.hidden = true;
                errorMessage.textContent = "";
            };

            const closePopup = () => {
                popup.hidden = true;
                popup.classList.remove("is-open");
                document.body.classList.remove("has-whatsapp-intent-popup");
                resetForm();
                activeItem = null;
                activeBrandContent = null;
                if (previousActiveElement instanceof HTMLElement) {
                    previousActiveElement.focus();
                }
            };

            popup.addEventListener("click", (event) => {
                if (event.target.closest("[data-popup-close='true']")) {
                    closePopup();
                }
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape" && !popup.hidden) {
                    closePopup();
                }
            });

            form.addEventListener("submit", (event) => {
                event.preventDefault();
                if (!activeItem) return;

                const customerName = nameInput.value.trim();
                const customerAddress = addressInput.value.trim();
                if (!customerName || !customerAddress) {
                    errorMessage.textContent = "Please enter your name and delivery address to continue.";
                    errorMessage.hidden = false;
                    if (!customerName) {
                        nameInput.focus();
                    } else {
                        addressInput.focus();
                    }
                    return;
                }

                const { finalPrice, imageUrl } = getProductWhatsAppPayload(activeItem);
                const message = [
                    "Hi FLOAA! I'd like to order this.",
                    "",
                    `Product: ${activeItem.name}`,
                    `Price: ${finalPrice}`,
                    "Quantity: 1",
                    "",
                    imageUrl ? "View Product Image:" : "",
                    imageUrl || "",
                    "",
                    `Name: ${customerName}`,
                    `Address: ${customerAddress}`,
                    "",
                    "Please confirm and share the payment link."
                ].filter(Boolean).join("\n");

                trackMetaCustomEvent("whatsapp_order_submit");
                trackEvent("whatsapp_order_click", {
                    product_name: activeItem.name,
                    product_price: finalPrice,
                    product_category: activeItem.category,
                    location: "product_card"
                });
                openWhatsAppMessage(activeBrandContent, message);
                closePopup();
            });

            return {
                open(item, brandContent, trigger) {
                    const { finalPrice } = getProductWhatsAppPayload(item);
                    activeItem = item;
                    activeBrandContent = brandContent;
                    previousActiveElement = trigger instanceof HTMLElement ? trigger : document.activeElement;
                    productSummary.innerHTML = `
                        <p class="whatsapp-intent-popup__product-name">${item.name}</p>
                        <p class="whatsapp-intent-popup__product-meta">${finalPrice}</p>
                    `;
                    resetForm();
                    popup.hidden = false;
                    popup.classList.add("is-open");
                    document.body.classList.add("has-whatsapp-intent-popup");
                    window.setTimeout(() => nameInput.focus(), 0);
                }
            };
        };
        const whatsappReserveModal = createWhatsAppReserveModal();
        const createOrderModal = () => {
            const popup = document.createElement("div");
            popup.className = "floaa-order-modal";
            popup.hidden = true;
            popup.innerHTML = `
                <div class="floaa-order-modal__backdrop" data-order-close="true"></div>
                <div class="floaa-order-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="floaa-order-title">
                    <button class="floaa-order-modal__close" type="button" aria-label="Close order form" data-order-close="true">&times;</button>
                    <div class="floaa-order-modal__panel floaa-order-modal__panel--form">
                        <p class="floaa-order-modal__eyebrow">FLOAA Concierge</p>
                        <h2 id="floaa-order-title" class="floaa-order-modal__title">Order / Enquire</h2>
                        <p class="floaa-order-modal__subtitle">Leave your details and our team will help you reserve or enquire about this piece.</p>
                        <div class="floaa-order-modal__product"></div>
                        <form class="floaa-order-modal__form" novalidate>
                            <input type="hidden" name="productId">
                            <input type="hidden" name="productName">
                            <label class="floaa-order-modal__field">
                                <span>Name</span>
                                <input type="text" name="customerName" autocomplete="name" required>
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>Phone</span>
                                <div class="floaa-order-modal__phone-field">
                                    <span class="floaa-order-modal__phone-prefix">+91</span>
                                    <input type="tel" name="phone" autocomplete="tel-national" inputmode="numeric" maxlength="13" required>
                                </div>
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>Email</span>
                                <input type="email" name="email" autocomplete="email">
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>City</span>
                                <input type="text" name="city" autocomplete="address-level2">
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>State</span>
                                <input type="text" name="state" autocomplete="address-level1">
                            </label>
                            <p class="floaa-order-modal__error" aria-live="polite" hidden></p>
                            <button class="btn floaa-order-modal__submit" type="submit">Send Enquiry</button>
                        </form>
                    </div>
                    <div class="floaa-order-modal__panel floaa-order-modal__panel--success" hidden>
                        <p class="floaa-order-modal__eyebrow">FLOAA Concierge</p>
                        <h2 class="floaa-order-modal__title">Request Received</h2>
                        <p class="floaa-order-modal__success-message">Thank you for your interest in this piece.</p>
                        <p class="floaa-order-modal__success-message">A FLOAA Concierge will contact you shortly to assist with availability, styling, and purchase guidance.</p>
                        <a class="btn floaa-order-modal__whatsapp" href="#" target="_blank" rel="noopener">Chat on WhatsApp</a>
                        <button class="btn floaa-order-modal__done" type="button">Continue Browsing</button>
                    </div>
                </div>
            `;
            document.body.append(popup);

            const formPanel = popup.querySelector(".floaa-order-modal__panel--form");
            const successPanel = popup.querySelector(".floaa-order-modal__panel--success");
            const productSummary = popup.querySelector(".floaa-order-modal__product");
            const form = popup.querySelector(".floaa-order-modal__form");
            const errorMessage = popup.querySelector(".floaa-order-modal__error");
            const doneButton = popup.querySelector(".floaa-order-modal__done");
            const whatsappButton = popup.querySelector(".floaa-order-modal__whatsapp");
            const submitButton = form.querySelector(".floaa-order-modal__submit");
            const nameInput = form.querySelector('input[name="customerName"]');
            const phoneInput = form.querySelector('input[name="phone"]');
            const productIdInput = form.querySelector('input[name="productId"]');
            const productNameInput = form.querySelector('input[name="productName"]');
            let activeItem = null;
            let previousActiveElement = null;
            let activeOrderId = "";
            const phonePattern = /^[6-9]\d{9}$/;

            const resetModal = () => {
                form.reset();
                errorMessage.hidden = true;
                errorMessage.textContent = "";
                formPanel.hidden = false;
                successPanel.hidden = true;
                submitButton.disabled = false;
                submitButton.textContent = "Send Enquiry";
                productIdInput.value = "";
                productNameInput.value = "";
                activeOrderId = "";
                whatsappButton.href = "#";
            };

            const closeModal = () => {
                popup.hidden = true;
                popup.classList.remove("is-open");
                document.body.classList.remove("has-floaa-order-modal");
                activeItem = null;
                resetModal();
                if (previousActiveElement instanceof HTMLElement) {
                    previousActiveElement.focus();
                }
            };

            const showSuccessState = (orderId) => {
                activeOrderId = orderId || "";
                const whatsappMessage = [
                    "Hello FLOAA,",
                    `I just submitted an enquiry for: ${activeItem?.name || ""}`,
                    "",
                    `Order ID: ${activeOrderId}`,
                    "",
                    "Please assist me."
                ].join("\n");
                const whatsappNumber = getWhatsAppNumber(brandContent || {});
                whatsappButton.href = whatsappNumber
                    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
                    : "#";
                errorMessage.textContent = "";
                errorMessage.hidden = true;
                formPanel.hidden = true;
                successPanel.hidden = false;
                window.setTimeout(() => whatsappButton.focus(), 0);
            };

            popup.addEventListener("click", (event) => {
                if (event.target.closest("[data-order-close='true']")) {
                    closeModal();
                }
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape" && !popup.hidden) {
                    closeModal();
                }
            });

            doneButton.addEventListener("click", closeModal);

            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                if (!activeItem) return;

                const formData = new FormData(form);
                const customerName = String(formData.get("customerName") || "").trim();
                const phone = String(formData.get("phone") || "").trim();
                const normalizedPhone = phone.replace(/\s+/g, "").replace(/\D+/g, "");
                const email = String(formData.get("email") || "").trim();
                const city = String(formData.get("city") || "").trim();
                const state = String(formData.get("state") || "").trim();

                if (!customerName || !normalizedPhone) {
                    errorMessage.textContent = "Please share your name and phone number to continue.";
                    errorMessage.hidden = false;
                    (!customerName ? nameInput : phoneInput).focus();
                    return;
                }

                if (!/^\d+$/.test(normalizedPhone) || !phonePattern.test(normalizedPhone)) {
                    errorMessage.textContent = "Please enter a valid 10-digit mobile number";
                    errorMessage.hidden = false;
                    phoneInput.focus();
                    return;
                }

                errorMessage.hidden = true;
                errorMessage.textContent = "";
                submitButton.disabled = true;
                submitButton.textContent = "Sending...";
                trackEvent("order_modal_submit_attempt", {
                    product_name: activeItem.name,
                    product_category: activeItem.category,
                    product_id: activeItem.productId
                });

                try {
                    const response = await fetch(ORDERS_API_URL, {
                        method: "POST",
                        headers: {
                            "content-type": "application/json"
                        },
                        body: JSON.stringify({
                            productId: activeItem.productId,
                            productName: activeItem.name,
                            customerName,
                            phone: normalizedPhone,
                            email,
                            city,
                            state
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`Order request failed: ${response.status}`);
                    }
                    const result = await response.json();

                    trackEvent("order_modal_submit", {
                        product_name: activeItem.name,
                        product_category: activeItem.category,
                        location: "product_card"
                    });
                    trackEvent("order_modal_submit_success", {
                        product_name: activeItem.name,
                        product_category: activeItem.category,
                        product_id: activeItem.productId
                    });
                    showSuccessState(result.orderId);
                } catch (error) {
                    console.error("order modal submit failed", error);
                    trackEvent("order_modal_submit_failure", {
                        product_name: activeItem.name,
                        product_category: activeItem.category,
                        product_id: activeItem.productId
                    });
                    errorMessage.textContent = "We couldn't send your request right now. Please try again in a moment.";
                    errorMessage.hidden = false;
                    submitButton.disabled = false;
                    submitButton.textContent = "Send Enquiry";
                }
            });

            return {
                open(item, trigger) {
                    activeItem = item;
                    previousActiveElement = trigger instanceof HTMLElement ? trigger : document.activeElement;
                    resetModal();
                    errorMessage.hidden = true;
                    errorMessage.textContent = "";
                    formPanel.hidden = false;
                    successPanel.hidden = true;
                    productIdInput.value = item.productId;
                    productNameInput.value = item.name;
                    productSummary.innerHTML = `
                        <p class="floaa-order-modal__product-name">${item.name}</p>
                        <p class="floaa-order-modal__product-meta">${item.discountPrice || item.price}</p>
                    `;
                    popup.hidden = false;
                    popup.classList.add("is-open");
                    document.body.classList.add("has-floaa-order-modal");
                    trackEvent("order_modal_open", {
                        product_name: item.name,
                        product_category: item.category,
                        product_id: item.productId
                    });
                    window.setTimeout(() => nameInput.focus(), 0);
                }
            };
        };
        const orderModal = createOrderModal();
        const CHECKOUT_PHONE_PATTERN = /^[6-9]\d{9}$/;
        const CHECKOUT_PINCODE_PATTERN = /^\d{6}$/;
        const CHECKOUT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const getCheckoutFormState = (form) => {
            const formData = new FormData(form);
            const phone = String(formData.get("phone") || "").trim();
            const pincode = String(formData.get("pincode") || "").trim();

            return {
                customerName: String(formData.get("customerName") || "").trim(),
                phone,
                normalizedPhone: phone.replace(/\s+/g, "").replace(/\D+/g, ""),
                email: String(formData.get("email") || "").trim(),
                addressLine1: String(formData.get("addressLine1") || "").trim(),
                addressLine2: String(formData.get("addressLine2") || "").trim(),
                landmark: String(formData.get("landmark") || "").trim(),
                city: String(formData.get("city") || "").trim(),
                state: String(formData.get("state") || "").trim(),
                pincode: pincode.replace(/\s+/g, "").replace(/\D+/g, "")
            };
        };
        const validateCheckoutFormState = ({ checkoutState, errorMessage, fields }) => {
            const {
                customerName,
                normalizedPhone,
                email,
                addressLine1,
                city,
                state,
                pincode
            } = checkoutState;

            if (!customerName) {
                errorMessage.textContent = "Please enter your full name.";
                errorMessage.hidden = false;
                fields.nameInput.focus();
                return false;
            }

            if (!normalizedPhone) {
                errorMessage.textContent = "Please enter your phone number.";
                errorMessage.hidden = false;
                fields.phoneInput.focus();
                return false;
            }

            if (!addressLine1) {
                errorMessage.textContent = "Please enter your address line 1.";
                errorMessage.hidden = false;
                fields.addressLine1Input.focus();
                return false;
            }

            if (!state) {
                errorMessage.textContent = "Please select your state or union territory.";
                errorMessage.hidden = false;
                fields.stateInput.focus();
                return false;
            }

            if (!pincode) {
                errorMessage.textContent = "Please enter your 6-digit pincode.";
                errorMessage.hidden = false;
                fields.pincodeInput.focus();
                return false;
            }

            if (!city) {
                errorMessage.textContent = "Please enter your city.";
                errorMessage.hidden = false;
                fields.cityInput.focus();
                return false;
            }

            if (!/^\d+$/.test(normalizedPhone) || !CHECKOUT_PHONE_PATTERN.test(normalizedPhone)) {
                errorMessage.textContent = "Please enter a valid 10-digit mobile number";
                errorMessage.hidden = false;
                fields.phoneInput.focus();
                return false;
            }

            if (!CHECKOUT_PINCODE_PATTERN.test(pincode)) {
                errorMessage.textContent = "Please enter a valid 6-digit pincode.";
                errorMessage.hidden = false;
                fields.pincodeInput.focus();
                return false;
            }

            if (email && !CHECKOUT_EMAIL_PATTERN.test(email)) {
                errorMessage.textContent = "Please enter a valid email address";
                errorMessage.hidden = false;
                fields.emailInput.focus();
                return false;
            }

            errorMessage.hidden = true;
            errorMessage.textContent = "";
            return true;
        };
        const createBuyNowModal = () => {
            const popup = document.createElement("div");
            popup.className = "floaa-order-modal floaa-order-modal--buy-now";
            popup.hidden = true;
            const stateOptionsMarkup = INDIAN_STATES_AND_UTS.map((stateName) =>
                `<option value="${stateName}">${stateName}</option>`
            ).join("");
            popup.innerHTML = `
                <div class="floaa-order-modal__backdrop" data-buy-now-close="true"></div>
                <div class="floaa-order-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="floaa-buy-now-title">
                    <button class="floaa-order-modal__close" type="button" aria-label="Close checkout form" data-buy-now-close="true">&times;</button>
                    <div class="floaa-order-modal__panel floaa-order-modal__panel--form">
                        <p class="floaa-order-modal__eyebrow">FLOAA Checkout</p>
                        <h2 id="floaa-buy-now-title" class="floaa-order-modal__title">Buy Now</h2>
                        <p class="floaa-order-modal__subtitle">Share your details to continue to secure checkout for this piece.</p>
                        <div class="floaa-order-modal__product"></div>
                        <form class="floaa-order-modal__form" novalidate>
                            <input type="hidden" name="productId">
                            <input type="hidden" name="productName">
                            <label class="floaa-order-modal__field">
                                <span>Full Name *</span>
                                <input type="text" name="customerName" autocomplete="name" placeholder="Your Full Name" required>
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>Phone *</span>
                                <div class="floaa-order-modal__phone-field">
                                    <span class="floaa-order-modal__phone-prefix">+91</span>
                                    <input type="tel" name="phone" autocomplete="tel-national" inputmode="numeric" maxlength="10" placeholder="9876543210" required>
                                </div>
                                <small class="floaa-order-modal__helper">Enter 10-digit mobile number</small>
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>Email (Optional)</span>
                                <input type="email" name="email" autocomplete="email" placeholder="your@email.com">
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>Address Line 1 *</span>
                                <input type="text" name="addressLine1" autocomplete="address-line1" placeholder="House / Flat Number, Building Name" required>
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>Address Line 2 (Optional)</span>
                                <input type="text" name="addressLine2" autocomplete="address-line2" placeholder="Area, Street, Apartment (Optional)">
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>Landmark (Optional)</span>
                                <input type="text" name="landmark" autocomplete="off" placeholder="Near Mall, Metro Station, etc.">
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>Pincode *</span>
                                <input type="tel" name="pincode" autocomplete="postal-code" inputmode="numeric" maxlength="6" placeholder="6-digit Pincode" required>
                                <small class="floaa-order-modal__helper">Enter 6-digit pincode</small>
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>State *</span>
                                <select name="state" autocomplete="address-level1" required>
                                    <option value="">Select State / UT</option>
                                    ${stateOptionsMarkup}
                                </select>
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>City *</span>
                                <input type="text" name="city" autocomplete="address-level2" placeholder="Your City" required>
                            </label>
                            <div class="floaa-order-modal__sticky-actions">
                                <p class="floaa-order-modal__required-note">Fields marked * are required</p>
                                <p class="floaa-order-modal__error" aria-live="polite" hidden></p>
                                <button class="btn floaa-order-modal__submit floaa-order-modal__submit--buy-now" type="submit">
                                    <span class="floaa-order-modal__submit-label">Continue to Secure Payment</span>
                                    <span class="floaa-order-modal__spinner" aria-hidden="true" hidden></span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.append(popup);

            const productSummary = popup.querySelector(".floaa-order-modal__product");
            const form = popup.querySelector(".floaa-order-modal__form");
            const errorMessage = popup.querySelector(".floaa-order-modal__error");
            const submitButton = form.querySelector(".floaa-order-modal__submit");
            const submitLabel = form.querySelector(".floaa-order-modal__submit-label");
            const spinner = form.querySelector(".floaa-order-modal__spinner");
            const nameInput = form.querySelector('input[name="customerName"]');
            const phoneInput = form.querySelector('input[name="phone"]');
            const addressLine1Input = form.querySelector('input[name="addressLine1"]');
            const addressLine2Input = form.querySelector('input[name="addressLine2"]');
            const landmarkInput = form.querySelector('input[name="landmark"]');
            const cityInput = form.querySelector('input[name="city"]');
            const stateInput = form.querySelector('select[name="state"]');
            const pincodeInput = form.querySelector('input[name="pincode"]');
            const emailInput = form.querySelector('input[name="email"]');
            const productIdInput = form.querySelector('input[name="productId"]');
            const productNameInput = form.querySelector('input[name="productName"]');
            let activeItem = null;
            let previousActiveElement = null;
            const failureMessage = "Unable to create payment link. Please try again or contact us on WhatsApp.";

            const setSubmittingState = (isSubmitting) => {
                submitButton.disabled = isSubmitting;
                submitButton.classList.toggle("is-loading", isSubmitting);
                submitLabel.textContent = isSubmitting ? "Creating Payment Link..." : "Continue to Secure Payment";
                spinner.hidden = !isSubmitting;
            };

            const resetCheckoutForm = () => {
                form.reset();
                nameInput.value = "";
                phoneInput.value = "";
                addressLine1Input.value = "";
                addressLine2Input.value = "";
                landmarkInput.value = "";
                cityInput.value = "";
                stateInput.value = "";
                pincodeInput.value = "";
                emailInput.value = "";
                errorMessage.hidden = true;
                errorMessage.textContent = "";
                productIdInput.value = "";
                productNameInput.value = "";
                productSummary.innerHTML = "";
                setSubmittingState(false);
            };

            const closeCheckoutModal = () => {
                setSubmittingState(false);
                popup.hidden = true;
                popup.classList.remove("is-open");
                document.body.classList.remove("has-floaa-order-modal");
                activeItem = null;
                resetCheckoutForm();
                if (previousActiveElement instanceof HTMLElement) {
                    previousActiveElement.focus();
                }
            };

            const openCheckoutModal = (item, trigger) => {
                activeItem = item;
                previousActiveElement = trigger instanceof HTMLElement ? trigger : document.activeElement;
                resetCheckoutForm();
                setSubmittingState(false);
                productIdInput.value = item.productId;
                productNameInput.value = item.name;
                productSummary.innerHTML = `
                        <p class="floaa-order-modal__product-name">${item.name}</p>
                        <p class="floaa-order-modal__product-meta">${item.discountPrice || item.price}</p>
                    `;
                popup.hidden = false;
                popup.classList.add("is-open");
                document.body.classList.add("has-floaa-order-modal");
                window.setTimeout(() => nameInput.focus(), 0);
            };

            resetCheckoutForm();

            popup.addEventListener("click", (event) => {
                if (event.target.closest("[data-buy-now-close='true']")) {
                    closeCheckoutModal();
                }
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape" && !popup.hidden) {
                    closeCheckoutModal();
                }
            });

            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                if (!activeItem) return;

                const checkoutState = getCheckoutFormState(form);
                const isValid = validateCheckoutFormState({
                    checkoutState,
                    errorMessage,
                    fields: {
                        nameInput,
                        phoneInput,
                        addressLine1Input,
                        cityInput,
                        stateInput,
                        pincodeInput,
                        emailInput
                    }
                });
                if (!isValid) return;

                setSubmittingState(true);

                try {
                    const response = await fetch(PAYMENT_LINK_API_URL, {
                        method: "POST",
                        headers: {
                            "content-type": "application/json"
                        },
                        body: JSON.stringify({
                            productId: activeItem.productId,
                            customerName: checkoutState.customerName,
                            phone: checkoutState.normalizedPhone,
                            email: checkoutState.email,
                            addressLine1: checkoutState.addressLine1,
                            addressLine2: checkoutState.addressLine2,
                            landmark: checkoutState.landmark,
                            city: checkoutState.city,
                            state: checkoutState.state,
                            pincode: checkoutState.pincode
                        })
                    });

                    let result = null;
                    try {
                        result = await response.json();
                    } catch (parseError) {
                        result = null;
                    }

                    if (!response.ok || !result?.paymentUrl) {
                        throw new Error(result?.message || failureMessage);
                    }

                    saveOrderSuccessSnapshot({
                        orderId: normalizeValue(result.orderId),
                        amountPaid: activeItem.discountPrice || activeItem.price || ""
                    });
                    window.location.href = result.paymentUrl;
                } catch (error) {
                    console.error("buy now modal submit failed", error);
                    errorMessage.textContent = failureMessage;
                    errorMessage.hidden = false;
                    setSubmittingState(false);
                }
            });

            return {
                open(item, trigger) {
                    openCheckoutModal(item, trigger);
                },
                restoreSubmittingState() {
                    setSubmittingState(false);
                }
            };
        };
        const buyNowModal = createBuyNowModal();
        const createBagCheckoutModal = () => {
            if (typeof document === "undefined") {
                return {
                    open() {}
                };
            }

            const popup = document.createElement("div");
            popup.className = "floaa-order-modal floaa-order-modal--bag";
            popup.hidden = true;
            const stateOptionsMarkup = INDIAN_STATES_AND_UTS.map((stateName) =>
                `<option value="${stateName}">${stateName}</option>`
            ).join("");
            popup.innerHTML = `
                <div class="floaa-order-modal__backdrop" data-bag-checkout-close="true"></div>
                <div class="floaa-order-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="floaa-bag-checkout-title">
                    <button class="floaa-order-modal__close" type="button" aria-label="Close bag checkout form" data-bag-checkout-close="true">&times;</button>
                    <div class="floaa-order-modal__panel floaa-order-modal__panel--form">
                        <p class="floaa-order-modal__eyebrow">FLOAA Checkout</p>
                        <h2 id="floaa-bag-checkout-title" class="floaa-order-modal__title">Bag Checkout</h2>
                        <p class="floaa-order-modal__subtitle">Share your details to continue to secure checkout for your selected pieces.</p>
                        <div class="floaa-order-modal__product"></div>
                        <form class="floaa-order-modal__form" novalidate>
                            <label class="floaa-order-modal__field">
                                <span>Full Name *</span>
                                <input type="text" name="customerName" autocomplete="name" placeholder="Your Full Name" required>
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>Phone *</span>
                                <div class="floaa-order-modal__phone-field">
                                    <span class="floaa-order-modal__phone-prefix">+91</span>
                                    <input type="tel" name="phone" autocomplete="tel-national" inputmode="numeric" maxlength="10" placeholder="9876543210" required>
                                </div>
                                <small class="floaa-order-modal__helper">Enter 10-digit mobile number</small>
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>Email (Optional)</span>
                                <input type="email" name="email" autocomplete="email" placeholder="your@email.com">
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>Address Line 1 *</span>
                                <input type="text" name="addressLine1" autocomplete="address-line1" placeholder="House / Flat Number, Building Name" required>
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>Address Line 2 (Optional)</span>
                                <input type="text" name="addressLine2" autocomplete="address-line2" placeholder="Area, Street, Apartment (Optional)">
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>Landmark (Optional)</span>
                                <input type="text" name="landmark" autocomplete="off" placeholder="Near Mall, Metro Station, etc.">
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>Pincode *</span>
                                <input type="tel" name="pincode" autocomplete="postal-code" inputmode="numeric" maxlength="6" placeholder="6-digit Pincode" required>
                                <small class="floaa-order-modal__helper">Enter 6-digit pincode</small>
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>State *</span>
                                <select name="state" autocomplete="address-level1" required>
                                    <option value="">Select State / UT</option>
                                    ${stateOptionsMarkup}
                                </select>
                            </label>
                            <label class="floaa-order-modal__field">
                                <span>City *</span>
                                <input type="text" name="city" autocomplete="address-level2" placeholder="Your City" required>
                            </label>
                            <div class="floaa-order-modal__sticky-actions">
                                <p class="floaa-order-modal__required-note">Fields marked * are required</p>
                                <p class="floaa-order-modal__error" aria-live="polite" hidden></p>
                                <button class="btn floaa-order-modal__submit floaa-order-modal__submit--buy-now" type="submit">
                                    <span class="floaa-order-modal__submit-label">Continue to Secure Payment</span>
                                    <span class="floaa-order-modal__spinner" aria-hidden="true" hidden></span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.append(popup);

            const productSummary = popup.querySelector(".floaa-order-modal__product");
            const form = popup.querySelector(".floaa-order-modal__form");
            const errorMessage = popup.querySelector(".floaa-order-modal__error");
            const submitButton = form.querySelector(".floaa-order-modal__submit");
            const submitLabel = form.querySelector(".floaa-order-modal__submit-label");
            const spinner = form.querySelector(".floaa-order-modal__spinner");
            const nameInput = form.querySelector('input[name="customerName"]');
            const phoneInput = form.querySelector('input[name="phone"]');
            const addressLine1Input = form.querySelector('input[name="addressLine1"]');
            const addressLine2Input = form.querySelector('input[name="addressLine2"]');
            const landmarkInput = form.querySelector('input[name="landmark"]');
            const cityInput = form.querySelector('input[name="city"]');
            const stateInput = form.querySelector('select[name="state"]');
            const pincodeInput = form.querySelector('input[name="pincode"]');
            const emailInput = form.querySelector('input[name="email"]');
            let activeBagItems = [];
            let activeBagTotal = "";
            let previousActiveElement = null;
            const failureMessage = "Unable to create payment link. Please try again or contact us on WhatsApp.";

            const setSubmittingState = (isSubmitting) => {
                submitButton.disabled = isSubmitting;
                submitButton.classList.toggle("is-loading", isSubmitting);
                submitLabel.textContent = isSubmitting ? "Creating Payment Link..." : "Continue to Secure Payment";
                spinner.hidden = !isSubmitting;
            };

            const resetCheckoutForm = () => {
                form.reset();
                nameInput.value = "";
                phoneInput.value = "";
                addressLine1Input.value = "";
                addressLine2Input.value = "";
                landmarkInput.value = "";
                cityInput.value = "";
                stateInput.value = "";
                pincodeInput.value = "";
                emailInput.value = "";
                errorMessage.hidden = true;
                errorMessage.textContent = "";
                productSummary.innerHTML = "";
                activeBagItems = [];
                activeBagTotal = "";
                setSubmittingState(false);
            };

            const closeCheckoutModal = () => {
                setSubmittingState(false);
                popup.hidden = true;
                popup.classList.remove("is-open");
                document.body.classList.remove("has-floaa-order-modal");
                resetCheckoutForm();
                if (previousActiveElement instanceof HTMLElement) {
                    previousActiveElement.focus();
                }
            };

            const openCheckoutModal = (items, bagTotal, trigger) => {
                activeBagItems = Array.isArray(items) ? items.slice() : [];
                activeBagTotal = normalizeValue(bagTotal);
                previousActiveElement = trigger instanceof HTMLElement ? trigger : document.activeElement;
                resetCheckoutForm();
                activeBagItems = Array.isArray(items) ? items.slice() : [];
                activeBagTotal = normalizeValue(bagTotal);
                const summaryItems = activeBagItems
                    .map((item) => `<li>${item.name}</li>`)
                    .join("");
                productSummary.innerHTML = `
                        <p class="floaa-order-modal__product-name">${activeBagItems.length} FLOAA Items</p>
                        <p class="floaa-order-modal__product-meta">${activeBagTotal}</p>
                        <ul class="floaa-order-modal__bag-list">${summaryItems}</ul>
                    `;
                popup.hidden = false;
                popup.classList.add("is-open");
                document.body.classList.add("has-floaa-order-modal");
                if (!popup.hidden && activeBagItems.length >= 1) {
                    trackInitiateCheckout(
                        buildAnalyticsBagPayload(activeBagItems, { value: activeBagTotal }),
                        {
                            dedupeKey: buildAnalyticsSessionDedupeKey(
                                "begin_checkout",
                                activeBagItems.map((item) => normalizeValue(item?.productId)).filter(Boolean).sort().join("|")
                            )
                        }
                    );
                }
                window.setTimeout(() => nameInput.focus(), 0);
            };

            resetCheckoutForm();

            popup.addEventListener("click", (event) => {
                if (event.target.closest("[data-bag-checkout-close='true']")) {
                    closeCheckoutModal();
                }
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape" && !popup.hidden) {
                    closeCheckoutModal();
                }
            });

            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                if (!activeBagItems.length) return;

                const checkoutState = getCheckoutFormState(form);
                const isValid = validateCheckoutFormState({
                    checkoutState,
                    errorMessage,
                    fields: {
                        nameInput,
                        phoneInput,
                        addressLine1Input,
                        cityInput,
                        stateInput,
                        pincodeInput,
                        emailInput
                    }
                });
                if (!isValid) return;

                setSubmittingState(true);

                try {
                    const response = await fetch(BAG_PAYMENT_LINK_API_URL, {
                        method: "POST",
                        headers: {
                            "content-type": "application/json"
                        },
                        body: JSON.stringify({
                            items: activeBagItems.map((item) => ({ productId: item.productId })),
                            customerName: checkoutState.customerName,
                            phone: checkoutState.normalizedPhone,
                            email: checkoutState.email,
                            addressLine1: checkoutState.addressLine1,
                            addressLine2: checkoutState.addressLine2,
                            landmark: checkoutState.landmark,
                            city: checkoutState.city,
                            state: checkoutState.state,
                            pincode: checkoutState.pincode
                        })
                    });

                    let result = null;
                    try {
                        result = await response.json();
                    } catch (parseError) {
                        result = null;
                    }

                    if (!response.ok || !result?.paymentUrl) {
                        throw new Error(result?.message || failureMessage);
                    }

                    saveOrderSuccessSnapshot({
                        orderId: normalizeValue(result.orderId),
                        amountPaid: normalizeValue(result.amountPaid),
                        createdSource: "BAG"
                    });
                    window.location.href = result.paymentUrl;
                } catch (error) {
                    console.error("bag checkout modal submit failed", error);
                    errorMessage.textContent = failureMessage;
                    errorMessage.hidden = false;
                    setSubmittingState(false);
                }
            });

            return {
                open(items, bagTotal, trigger) {
                    openCheckoutModal(items, bagTotal, trigger);
                },
                restoreSubmittingState() {
                    setSubmittingState(false);
                }
            };
        };
        const bagCheckoutModal = createBagCheckoutModal();
        if (typeof window !== "undefined") {
            window.addEventListener("pageshow", () => {
                buyNowModal.restoreSubmittingState?.();
                bagCheckoutModal.restoreSubmittingState?.();
                updateBagBadge();
            });
        }
        const getYouTubeVideoId = (value) => {
            try {
                const url = new URL(value);
                if (url.hostname.includes("youtu.be")) {
                    return url.pathname.split("/").filter(Boolean)[0] || "";
                }

                if (url.hostname.includes("youtube.com")) {
                    return url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop() || "";
                }
            } catch (error) {
                return "";
            }

            return "";
        };
        const ORDER_SUCCESS_STORAGE_KEY = "floaa-order-success";
        const BAG_STORAGE_KEY = "floaa_bag";
        const normalizeBagItems = (value) => {
            if (!Array.isArray(value)) return [];

            return value.reduce((items, item) => {
                const productId = normalizeValue(item?.productId);
                const name = normalizeValue(item?.name);
                const image = normalizeValue(item?.image);
                const price = normalizeValue(item?.price);
                const addedAt = normalizeValue(item?.addedAt);

                if (!productId || !name || !image || !price || !addedAt) {
                    return items;
                }

                items.push({
                    productId,
                    name,
                    image,
                    price,
                    addedAt
                });
                return items;
            }, []);
        };
        const readBagItems = () => {
            try {
                if (typeof window === "undefined" || !window.localStorage) return [];
                const rawBag = window.localStorage.getItem(BAG_STORAGE_KEY);
                if (!rawBag) return [];

                const parsedBag = JSON.parse(rawBag);
                if (Array.isArray(parsedBag)) {
                    return normalizeBagItems(parsedBag);
                }

                if (parsedBag && typeof parsedBag === "object" && Array.isArray(parsedBag.items)) {
                    return normalizeBagItems(parsedBag.items);
                }
            } catch (error) {
                console.warn("bag read failed", error);
            }

            return [];
        };
        const writeBagItems = (items) => {
            try {
                if (typeof window === "undefined" || !window.localStorage) return;
                window.localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(normalizeBagItems(items)));
            } catch (error) {
                console.warn("bag write failed", error);
            }
        };
        const removeBagItem = (productId) => {
            const normalizedProductId = normalizeValue(productId);
            if (!normalizedProductId) {
                return readBagItems();
            }

            const nextItems = readBagItems().filter((item) => item.productId !== normalizedProductId);
            writeBagItems(nextItems);
            return nextItems;
        };
        const addProductToBag = (product) => {
            const currentItems = readBagItems();
            const normalizedProductId = normalizeValue(product?.productId);
            if (!normalizedProductId) {
                return {
                    status: "invalid",
                    items: currentItems
                };
            }

            const existingItem = currentItems.find((item) => item.productId === normalizedProductId);
            if (existingItem) {
                return {
                    status: "existing",
                    items: currentItems
                };
            }

            const nextItems = [
                ...currentItems,
                {
                    productId: normalizedProductId,
                    name: normalizeValue(product?.name),
                    image: normalizeValue(product?.image),
                    price: normalizeValue(product?.discountPrice || product?.price),
                    addedAt: new Date().toISOString()
                }
            ];
            writeBagItems(nextItems);
            const persistedItems = readBagItems();
            const persistedItem = persistedItems.find((item) => item.productId === normalizedProductId);
            if (persistedItem) {
                trackAddToCart(buildAnalyticsProductPayload(product));
            }

            return {
                status: "added",
                items: nextItems
            };
        };
        const getBagCount = () => readBagItems().length;
        const getBagItems = () => readBagItems();
        const parseBagPriceValue = (value) => {
            const normalizedPrice = normalizeValue(value).replace(/[^0-9.]/g, "");
            const parsedPrice = Number(normalizedPrice);
            return Number.isFinite(parsedPrice) ? parsedPrice : 0;
        };
        const formatBagPriceValue = (value) => {
            if (!Number.isFinite(value) || value <= 0) {
                return "";
            }

            return `₹${Math.round(value)}`;
        };
        const getBagTotalAmount = (items) => {
            if (!Array.isArray(items)) return 0;
            return items.reduce((sum, item) => sum + parseBagPriceValue(item?.price), 0);
        };
        let bagToastElement = null;
        let bagToastMessageElement = null;
        let bagToastLinkElement = null;
        let bagToastTimeoutId = 0;
        const showBagToast = (message) => {
            if (typeof document === "undefined") return;

            if (!bagToastElement) {
                bagToastElement = document.createElement("div");
                bagToastElement.className = "floaa-bag-toast";
                bagToastElement.hidden = true;

                bagToastMessageElement = document.createElement("span");
                bagToastMessageElement.className = "floaa-bag-toast__message";
                bagToastMessageElement.setAttribute("role", "status");
                bagToastMessageElement.setAttribute("aria-live", "polite");

                bagToastLinkElement = document.createElement("a");
                bagToastLinkElement.className = "floaa-bag-toast__link";
                bagToastLinkElement.href = "bag.html";
                bagToastLinkElement.textContent = "View Bag \u2192";

                bagToastElement.append(bagToastMessageElement, bagToastLinkElement);
                document.body.append(bagToastElement);
            }

            if (bagToastTimeoutId) {
                window.clearTimeout(bagToastTimeoutId);
                bagToastTimeoutId = 0;
            }

            if (bagToastMessageElement) {
                bagToastMessageElement.textContent = message;
            }
            bagToastElement.hidden = false;
            bagToastElement.classList.remove("is-visible");
            void bagToastElement.offsetWidth;
            bagToastElement.classList.add("is-visible");

            bagToastTimeoutId = window.setTimeout(() => {
                bagToastElement?.classList.remove("is-visible");
                bagToastTimeoutId = window.setTimeout(() => {
                    if (bagToastElement) {
                        bagToastElement.hidden = true;
                    }
                    bagToastTimeoutId = 0;
                }, 220);
            }, 2200);
        };
        let linkToastEl = null;
        let linkToastTimeoutId = 0;
        const showLinkCopiedToast = () => {
            if (typeof document === "undefined") return;
            if (!linkToastEl) {
                linkToastEl = document.createElement("div");
                linkToastEl.className = "floaa-link-toast";
                linkToastEl.setAttribute("role", "status");
                linkToastEl.setAttribute("aria-live", "polite");
                linkToastEl.hidden = true;
                linkToastEl.textContent = "Link copied";
                document.body.append(linkToastEl);
            }
            if (linkToastTimeoutId) {
                window.clearTimeout(linkToastTimeoutId);
                linkToastTimeoutId = 0;
            }
            linkToastEl.hidden = false;
            linkToastEl.classList.remove("is-visible");
            void linkToastEl.offsetWidth;
            linkToastEl.classList.add("is-visible");
            linkToastTimeoutId = window.setTimeout(() => {
                linkToastEl?.classList.remove("is-visible");
                linkToastTimeoutId = window.setTimeout(() => {
                    if (linkToastEl) linkToastEl.hidden = true;
                    linkToastTimeoutId = 0;
                }, 220);
            }, 2200);
        };
        const handleProductShare = async (item, card) => {
            const anchor = card.id ? `#${card.id}` : "";
            const url = `${window.location.origin}${window.location.pathname}${anchor}`;
            if (navigator.share) {
                try {
                    await navigator.share({ title: item.name || "FLOAA", url });
                    return;
                } catch (err) {
                    if (err?.name === "AbortError") return;
                }
            }
            try {
                await navigator.clipboard.writeText(url);
            } catch {
                const tempEl = document.createElement("input");
                tempEl.value = url;
                tempEl.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
                document.body.append(tempEl);
                tempEl.select();
                document.execCommand("copy");
                tempEl.remove();
            }
            showLinkCopiedToast();
        };
        const updateBagBadge = () => {
            if (typeof document === "undefined") return;

            const bagCount = getBagCount();
            const bagLinks = Array.from(document.querySelectorAll(".icon-bag")).map((icon) => icon.closest("a, button")).filter(Boolean);
            const uniqueBagLinks = Array.from(new Set(bagLinks));

            uniqueBagLinks.forEach((bagLink) => {
                let badge = bagLink.querySelector(".floaa-bag-badge");
                if (!badge) {
                    badge = document.createElement("span");
                    badge.className = "floaa-bag-badge";
                    badge.setAttribute("aria-live", "polite");
                    bagLink.append(badge);
                }

                badge.textContent = String(bagCount);
                badge.hidden = bagCount < 1;
                bagLink.classList.add("has-bag-badge");
            });
        };
        const renderBagPage = () => {
            const bagPageContent = document.getElementById("bag-page-content");
            if (!bagPageContent) return;

            const bagItems = getBagItems();
            bagPageContent.innerHTML = "";

            if (!bagItems.length) {
                const emptyState = document.createElement("div");
                emptyState.className = "bag-empty-state";

                const emptyTitle = document.createElement("h2");
                emptyTitle.textContent = "Your Bag is Empty \u2728";

                const emptyCopy = document.createElement("p");
                emptyCopy.textContent = "Discover timeless jewellery designed to be loved.";

                const continueShopping = document.createElement("a");
                continueShopping.className = "btn bag-page-action";
                continueShopping.href = "shop.html";
                continueShopping.textContent = "Continue Shopping";

                emptyState.append(emptyTitle, emptyCopy, continueShopping);
                bagPageContent.append(emptyState);
                return;
            }

            const bagLayout = document.createElement("div");
            bagLayout.className = "bag-page-layout";

            const bagList = document.createElement("div");
            bagList.className = "bag-item-list";

            bagItems.forEach((item) => {
                const bagItemCard = document.createElement("article");
                bagItemCard.className = "bag-item-card";
                bagItemCard.dataset.productId = item.productId;

                const bagItemImage = document.createElement("img");
                bagItemImage.className = "bag-item-image";
                bagItemImage.src = getProductThumbnailSrc(item.image);
                bagItemImage.alt = getPreferredAltText(item.name, item.name);
                bagItemImage.loading = "lazy";
                bagItemImage.decoding = "async";
                bagItemImage.addEventListener("error", () => {
                    applyImageFallback(bagItemImage, `bag:${item.productId}`);
                }, { once: true });

                const bagItemBody = document.createElement("div");
                bagItemBody.className = "bag-item-body";

                const bagItemName = document.createElement("h2");
                bagItemName.className = "bag-item-name";
                bagItemName.textContent = item.name;

                const bagItemPrice = document.createElement("p");
                bagItemPrice.className = "bag-item-price";
                bagItemPrice.textContent = item.price;

                const removeAction = document.createElement("button");
                removeAction.className = "bag-remove-action";
                removeAction.type = "button";
                removeAction.textContent = "Remove";
                removeAction.addEventListener("click", () => {
                    removeBagItem(item.productId);
                    updateBagBadge();
                    renderBagPage();
                });

                bagItemBody.append(bagItemName, bagItemPrice, removeAction);
                bagItemCard.append(bagItemImage, bagItemBody);
                bagList.append(bagItemCard);
            });

            const bagInfoCard = document.createElement("aside");
            bagInfoCard.className = "bag-info-card";

            const bagInfoTitle = document.createElement("h2");
            bagInfoTitle.textContent = "Your Bag";

            const bagInfoCopy = document.createElement("p");
            bagInfoCopy.textContent = "Your selected pieces are safely saved in your Bag.";

            const bagTotal = getBagTotalAmount(bagItems);
            const bagTotalAmount = formatBagPriceValue(bagTotal);
            const bagInfoTotal = document.createElement("p");
            bagInfoTotal.className = "bag-page-total";
            bagInfoTotal.textContent = bagTotalAmount ? `Total: ${bagTotalAmount}` : "";

            const bagInfoCopySecondary = document.createElement("p");
            bagInfoCopySecondary.textContent = "Review your pieces and continue to secure checkout when you're ready.";

            const checkoutButton = document.createElement("button");
            checkoutButton.className = "btn bag-page-action";
            checkoutButton.type = "button";
            checkoutButton.textContent = "Checkout";
            checkoutButton.addEventListener("click", () => {
                bagCheckoutModal.open(bagItems, bagTotalAmount, checkoutButton);
            });

            const continueShopping = document.createElement("a");
            continueShopping.className = "btn bag-page-action";
            continueShopping.href = "shop.html";
            continueShopping.textContent = "Continue Shopping";

            bagInfoCard.append(bagInfoTitle, bagInfoCopy, bagInfoTotal, bagInfoCopySecondary, checkoutButton, continueShopping);
            bagLayout.append(bagList, bagInfoCard);
            bagPageContent.append(bagLayout);
        };
        const saveOrderSuccessSnapshot = (orderData) => {
            try {
                if (typeof window === "undefined" || !window.sessionStorage) return;
                window.sessionStorage.setItem(ORDER_SUCCESS_STORAGE_KEY, JSON.stringify(orderData));
            } catch (error) {
                console.warn("order success snapshot save failed", error);
            }
        };
        const readOrderSuccessSnapshot = () => {
            try {
                if (typeof window === "undefined" || !window.sessionStorage) return {};
                const rawSnapshot = window.sessionStorage.getItem(ORDER_SUCCESS_STORAGE_KEY);
                return rawSnapshot ? JSON.parse(rawSnapshot) : {};
            } catch (error) {
                console.warn("order success snapshot read failed", error);
                return {};
            }
        };
        const formatOrderSuccessAmount = (value) => {
            const normalizedAmount = normalizeValue(value);
            if (!normalizedAmount) return "";
            return normalizedAmount.startsWith("₹") ? normalizedAmount : `₹${normalizedAmount}`;
        };
        const initializeOrderSuccessCard = () => {
            if (document.body.dataset.page !== "order-success") return;

            const params = new URLSearchParams(window.location.search);
            const storedOrder = readOrderSuccessSnapshot();
            const orderId = normalizeValue(
                params.get("razorpay_payment_link_reference_id")
                || params.get("orderId")
                || storedOrder.orderId
            );
            const amountPaid = formatOrderSuccessAmount(
                params.get("amountPaid")
                || params.get("amount")
                || storedOrder.amountPaid
            );
            const orderIdField = document.querySelector('[data-order-field="order-id"]');
            const orderIdValue = document.querySelector('[data-order-value="order-id"]');
            const amountField = document.querySelector('[data-order-field="amount-paid"]');
            const amountValue = document.querySelector('[data-order-value="amount-paid"]');

            if (orderIdField && orderIdValue && orderId) {
                orderIdValue.textContent = orderId;
                orderIdField.hidden = false;
            }

            if (amountField && amountValue && amountPaid) {
                amountValue.textContent = amountPaid;
                amountField.hidden = false;
            }

            if (orderId || amountPaid) {
                saveOrderSuccessSnapshot({
                    ...storedOrder,
                    orderId: orderId || storedOrder.orderId || "",
                    amountPaid: amountPaid || storedOrder.amountPaid || ""
                });
            }

            if (normalizeValue(storedOrder.createdSource).toLowerCase() === "bag" && orderId) {
                try {
                    if (typeof window !== "undefined" && window.localStorage) {
                        window.localStorage.removeItem(BAG_STORAGE_KEY);
                    }
                    saveOrderSuccessSnapshot({
                        ...storedOrder,
                        orderId: orderId || storedOrder.orderId || "",
                        amountPaid: amountPaid || storedOrder.amountPaid || "",
                        createdSource: ""
                    });
                } catch (error) {
                    console.warn("bag clear on success failed", error);
                }
            }
        };

        const transformProduct = (row) => {
            const name = normalizeValue(getRowValue(row, ["Name"]));
            const productId = cleanSheetValue(getRowValue(row, ["ProductId", "ProductID", "ID", "Id"])) || buildAnchorSlug(name);
            const price = getRowValue(row, ["Price"]);
            const discountPrice = getRowValue(row, ["DiscountPrice", "Discount Price"]);
            const images = getProductImages(getRowValue(row, ["Image", "Images"]));
            const createdDate = cleanSheetValue(getRowValue(row, ["CreatedDate", "Created Date"]));
            const category = normalizeSlug(getRowValue(row, ["Category"]));
            const status = normalizeStatus(getRowValue(row, ["Status"])) || "active";
            const stockStatus = normalizeKey(getRowValue(row, ["StockStatus", "Stock Status"])) || "in-stock";
            const description = cleanSheetValue(getRowValue(row, ["Description"]));
            const filters = normalizeList(getRowValue(row, ["Filters", "Filter"])).map(normalizeKey);
            const style = normalizeKey(getRowValue(row, ["Style", "Styles"]));
            const tag = cleanSheetValue(getRowValue(row, ["Tag", "Label"]));
            const normalizedCategory = category || "shop";

            return {
                productId,
                name,
                price: formatPrice(price),
                discountPrice: formatPrice(discountPrice),
                priceValue: parsePrice(price),
                discountPriceValue: parsePrice(discountPrice),
                image: images[0] || "",
                images,
                createdDate,
                isNew: isNewArrival(createdDate),
                description,
                whatsappText: `Hi FLOAA, I am interested in ${name || "this product"}`,
                category: normalizedCategory,
                status,
                stockStatus,
                filters,
                style,
                tag: tag || normalizedCategory.charAt(0).toUpperCase() + normalizedCategory.slice(1)
            };
        };

        const fetchProducts = async () => {
            try {
                const rows = await fetchJsonWithRetry(PRODUCTS_URL, "Products", {
                    attempts: 3,
                    delayMs: 700
                });
                if (!Array.isArray(rows)) return [];
                return rows
                    .map(transformProduct)
                    .filter((product) => product.name && product.image && product.status !== "inactive");
            } catch (error) {
                console.error(error);
                return null;
            }
        };

        const fetchBrandContent = async () => {
            try {
                const rows = await getBrandRowsPromise();
                if (!Array.isArray(rows)) return {};

                return rows.reduce((content, row) => {
                    const key = normalizeKey(getRowValue(row, ["Key", "Name", "Asset", "Type"]));
                    const value = cleanSheetValue(getRowValue(row, ["Value", "URL", "Url", "Path", "Image", "Video"]));
                    if (!key) return content;

                    content[key] = {
                        value,
                        alt: cleanSheetValue(getRowValue(row, ["Alt", "AltText", "Description"]))
                    };
                    return content;
                }, {});
            } catch (error) {
                console.error(error);
                return {};
            }
        };

        const applyBrandContent = (content) => {
            const applyHeroSlideTextContent = (slide, slideNumber) => {
                if (!slide) return;

                const kicker = getBrandValue(content, [`hero-slide-${slideNumber}-kicker`]);
                const heading = getBrandValue(content, [`hero-slide-${slideNumber}-heading`]);
                const subtitle = getBrandValue(content, [`hero-slide-${slideNumber}-subtitle`]);
                const buttonText = getBrandValue(content, [`hero-slide-${slideNumber}-button-text`]);
                const buttonLink = getBrandValue(content, [`hero-slide-${slideNumber}-button-link`]);
                const kickerElement = slide.querySelector(".hero-kicker");
                const headingElement = slide.querySelector(".hero-title");
                const subtitleElement = slide.querySelector(".hero-subtitle");
                const buttonElement = slide.querySelector(".btn");

                if (kicker && kickerElement) {
                    kickerElement.textContent = kicker;
                }

                if (heading && headingElement) {
                    headingElement.textContent = heading;
                }

                if (subtitle && subtitleElement) {
                    subtitleElement.textContent = subtitle;
                }

                if (buttonText && buttonElement) {
                    buttonElement.textContent = buttonText;
                }

                if (buttonLink && buttonElement) {
                    buttonElement.href = buttonLink;
                }
            };
            const logo = content.logo || content["floaa-logo"];
            if (logo?.value) {
                const normalizedLogoSrc = normalizeImagePath(logo.value) || logo.value;
                document.querySelectorAll(".brand-logo").forEach((image) => {
                    image.src = normalizedLogoSrc;
                    if (logo.alt) {
                        image.alt = logo.alt;
                    }
                });
            }

            const brandMessage = getBrandValue(content, ["brand-message", "brand-strip", "announcement"]);
            if (brandMessage) {
                document.querySelectorAll(".brand-message-strip span").forEach((element) => {
                    element.innerHTML = `<strong>${brandMessage}</strong>`;
                });
            }

            document.querySelectorAll(".brand-message-strip[data-brand-pending='true']").forEach((element) => {
                element.removeAttribute("data-brand-pending");
            });

            const utilityMessage = getBrandValue(content, ["shipping-message", "top-strip-message"]);
            const utilityDetail = getBrandValue(content, ["shipping-detail", "top-strip-detail"]);
            if (utilityMessage || utilityDetail) {
                document.querySelectorAll(".utility-bar p, .top-shipping-strip span").forEach((element) => {
                    const strongText = utilityMessage ? `<strong>${utilityMessage}</strong>` : "";
                    const detailText = utilityDetail ? `<small>${utilityDetail}</small>` : "";
                    element.innerHTML = `${strongText}${detailText}`;
                });
            }

            const legacyFooterPolicyText = "FOR HYGIENE AND QUALITY ASSURANCE, JEWELLERY PURCHASES ARE NOT ELIGIBLE FOR RETURN OR EXCHANGE.";
            const defaultFooterPolicyNote = "For hygiene reasons, change-of-mind returns are not available.";
            const footerPromiseTitle = getBrandValue(content, ["promise-title", "footer-promise-title", "trust-title"]) || "✨ Shop with Confidence";
            const footerPromisePointsValue = getBrandValue(content, ["promise-points", "footer-promise-points", "trust-points"]);
            const footerPromisePoints = (footerPromisePointsValue
                ? footerPromisePointsValue.split(/\r?\n|\|/)
                    .map((item) => item.replace(/^[•✓✔\-\s]+/, "").trim())
                    .filter(Boolean)
                : [
                    "Real product photography",
                    "Individually quality checked",
                    "Secure payments",
                    "Damaged or incorrect item? Free replacement"
                ]);
            const footerPolicyText = getBrandValue(content, ["promise-note", "footer-promise-note", "policy-message", "footer-policy", "return-policy"]);
            const normalizedFooterPolicyText = normalizeValue(footerPolicyText).toLowerCase();
            const footerPolicyNote = !footerPolicyText || normalizedFooterPolicyText === legacyFooterPolicyText.toLowerCase()
                ? defaultFooterPolicyNote
                : footerPolicyText;

            document.querySelectorAll(".footer-policy").forEach((policy) => {
                policy.innerHTML = `
                    <span class="footer-policy-title">${escapeHtml(footerPromiseTitle)}</span>
                    <span class="footer-policy-points">
                        ${footerPromisePoints.map((point) => `<span class="footer-policy-point">${escapeHtml(point)}</span>`).join("")}
                    </span>
                    <span class="footer-policy-note">${escapeHtml(footerPolicyNote)}</span>
                `;
            });

            const whatsappNumber = getWhatsAppNumber(content);
            const whatsappMessage = getWhatsAppMessage(content);
            const whatsappUrl = buildWhatsAppUrl(whatsappNumber, whatsappMessage);
            const whatsappCatalogUrl = whatsappNumber ? `https://wa.me/c/${whatsappNumber}` : "";
            const contactEmail = getBrandValue(content, ["contact-email", "email"]);
            const contactPhone = getBrandValue(content, ["contact-phone-display", "phone-display", "phone"]);

            if (contactEmail) {
                document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
                    link.href = `mailto:${contactEmail}?subject=FLOAA%20Inquiry`;
                    link.textContent = contactEmail;
                });
            }

            if (whatsappCatalogUrl) {
                document.querySelectorAll('a[href^="https://wa.me/c/"]').forEach((link) => {
                    link.href = whatsappCatalogUrl;
                });
            }

            if (whatsappUrl) {
                document.querySelectorAll('a[href*="wa.me/"]').forEach((link) => {
                    if (link.href.includes("/c/")) return;
                    link.href = buildWhatsAppUrl(whatsappNumber, getLinkWhatsAppMessage(link, whatsappMessage));
                });
            }

            document.querySelectorAll(".category-whatsapp-cta").forEach((link) => {
                if (!whatsappNumber) return;
                link.href = buildWhatsAppUrl(whatsappNumber, getLinkWhatsAppMessage(link, whatsappMessage));
            });

            if (contactPhone) {
                document.querySelectorAll(".contact-card").forEach((card) => {
                    const heading = card.querySelector("h2");
                    if (heading?.textContent.trim().toLowerCase() !== "phone") return;
                    const link = card.querySelector('a[href*="wa.me/"]');
                    if (!link) return;

                    const textNode = Array.from(link.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
                    if (textNode) {
                        textNode.textContent = ` ${contactPhone} `;
                    } else {
                        link.append(document.createTextNode(` ${contactPhone} `));
                    }
                });
            }

            const heroSlides = Array.from(document.querySelectorAll(".hero-slide"));
            heroSlides.forEach((slide, index) => {
                const slideNumber = index + 1;
                const image = slide.querySelector("img");
                const slideAlt = content[`hero-slide-${slideNumber}-alt`];

                if (image) {
                    const resolvedAlt = getHeroAlt(slideAlt?.value, image.alt);
                    if (resolvedAlt) {
                        image.alt = resolvedAlt;
                    }
                }
                applyHeroSlideTextContent(slide, slideNumber);
            });

            const mobileHeroImage = document.querySelector(".floaa-mobile-editorial-hero__image");
            const mobileHeroAlt = content["hero-mobile-alt"];
            if (mobileHeroImage) {
                const resolvedMobileAlt = getHeroAlt(mobileHeroAlt?.value, mobileHeroImage.alt);
                if (resolvedMobileAlt) {
                    mobileHeroImage.alt = resolvedMobileAlt;
                }
            }

            ["earrings", "necklaces", "bracelets", "combos"].forEach((category) => {
                const categoryImage = content[`category-${category}`] || content[`${category}-image`];
                const categoryTile = document.querySelector(`.category-tile[href="${category}.html"] .category-tile-media`);
                if (categoryTile && categoryImage?.value) {
                    void setSurfaceBackgroundImage(categoryTile, categoryImage.value);
                }
            });

            const combosImage = content["category-combos"] || content["combos-image"] || content["category-rings"] || content["rings-image"];
            const combosTile = document.querySelector('.category-tile[href="rings.html"] .category-tile-media');
            if (combosTile && combosImage?.value) {
                void setSurfaceBackgroundImage(combosTile, combosImage.value);
            }

            const readAboutImage = content["read-about"] || content["read-about-image"];
            const readAboutSurface = document.querySelector(".feature-surface-one");
            if (readAboutSurface && readAboutImage?.value) {
                void setSurfaceBackgroundImage(readAboutSurface, readAboutImage.value);
            }

            const heroVideo = content["hero-video"] || content.video || content["floaa-video"];
            const heroVideoPoster = content["hero-video-poster"] || content.poster || content["video-poster"];
            const heroVideoElement = document.querySelector(".hero-cinema-video");

            if (heroVideoElement && heroVideoPoster?.value) {
                heroVideoElement.poster = heroVideoPoster.value;
            }

            if (!heroVideoElement || !heroVideo?.value) return;

            const youtubeId = getYouTubeVideoId(heroVideo.value);
            if (youtubeId) {
                const iframe = document.createElement("iframe");
                iframe.className = "hero-cinema-video";
                iframe.title = heroVideo.alt || "FLOAA hero video";
                const youtubeParams = new URLSearchParams({
                    autoplay: "1",
                    mute: "1",
                    loop: "1",
                    playlist: youtubeId,
                    controls: "0",
                    playsinline: "1",
                    rel: "0",
                    modestbranding: "1",
                    origin: window.location.origin
                });
                iframe.src = `https://www.youtube.com/embed/${youtubeId}?${youtubeParams.toString()}`;
                iframe.allow = "autoplay; encrypted-media; picture-in-picture";
                iframe.referrerPolicy = "strict-origin-when-cross-origin";
                iframe.setAttribute("allowfullscreen", "");
                heroVideoElement.replaceWith(iframe);
                return;
            }

            const heroVideoSource = heroVideoElement.querySelector("source");
            if (heroVideoSource) {
                heroVideoSource.src = heroVideo.value;
                heroVideoElement.load();
            }
        };

        const clearGridSkeletons = (container) => {
            container?.querySelectorAll(".skeleton-card").forEach((element) => element.remove());
        };
        const shouldEnableProductAnchors = (container) => {
            if (!container) return false;
            if (container.id === "shop-product-grid") return true;
            if (container.id !== "category-product-grid") return false;

            const category = normalizeKey(document.body.dataset.category);
            return ["earrings", "bracelets", "necklaces", "combos"].includes(category);
        };
        const scrollToProductAnchor = (container) => {
            if (!container || !window.location.hash) return;

            const anchorId = decodeURIComponent(window.location.hash.slice(1)).trim();
            if (!anchorId) return;

            const target = document.getElementById(anchorId);
            if (!target || !container.contains(target)) return;

            window.requestAnimationFrame(() => {
                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            });
        };
        const signalGridRefresh = (container) => {
            if (!container) return;
            container.classList.remove("is-refreshed");
            container.setAttribute("aria-busy", "true");
            void container.offsetWidth;
            container.classList.add("is-refreshed");
            window.setTimeout(() => {
                container.classList.remove("is-refreshed");
                container.setAttribute("aria-busy", "false");
            }, 220);
        };
        const renderGridNotice = (container, message, tone = "info") => {
            if (!container) return;
            container.innerHTML = "";
            clearGridSkeletons(container);
            const notice = document.createElement("div");
            notice.className = `product-grid-notice${tone === "error" ? " is-error" : ""}`;
            notice.textContent = message;
            container.append(notice);
            signalGridRefresh(container);
        };
        const injectProductSchema = (container, items) => {
            const existingSchema = document.getElementById("floaa-product-schema");
            existingSchema?.remove();

            if (!container || !Array.isArray(items)) return;
            if (container.id !== "shop-product-grid" && container.id !== "category-product-grid") return;

            const productCards = Array.from(container.querySelectorAll(".product-card"));
            if (!productCards.length) return;

            const validItems = items.filter((item) => item?.name && item?.image);
            const itemListElement = validItems.slice(0, productCards.length).map((item, index) => {
                const productCard = productCards[index];
                const anchorId = productCard?.id || "";
                const productUrl = anchorId
                    ? `${window.location.href.split("#")[0]}#${encodeURIComponent(anchorId)}`
                    : window.location.href.split("#")[0];
                const imageUrl = item.image
                    ? new URL(encodeURI(item.image), "https://floaa.in/").href
                    : "";
                const price = item.discountPriceValue || item.priceValue || 0;

                return {
                    "@type": "ListItem",
                    position: index + 1,
                    url: productUrl,
                    item: {
                        "@type": "Product",
                        name: item.name,
                        image: imageUrl,
                        description: item.description,
                        brand: {
                            "@type": "Organization",
                            name: "FLOAA"
                        },
                        offers: {
                            "@type": "Offer",
                            priceCurrency: "INR",
                            price,
                            availability: item.stockStatus === "sold-out"
                                ? "https://schema.org/OutOfStock"
                                : "https://schema.org/InStock",
                            url: productUrl
                        }
                    }
                };
            });

            if (!itemListElement.length) return;

            const schemaScript = document.createElement("script");
            schemaScript.id = "floaa-product-schema";
            schemaScript.type = "application/ld+json";
            schemaScript.textContent = JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                itemListElement
            });
            document.head.append(schemaScript);
        };
        const setupCardReveal = (container) => {
            if (!container || typeof IntersectionObserver === "undefined") return;
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
            const cards = Array.from(container.querySelectorAll(".product-card"));
            if (!cards.length) return;
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const card = entry.target;
                    const delay = (card._revealIndex || 0) * 30;
                    setTimeout(() => card.classList.remove("is-card-hidden"), delay);
                    observer.unobserve(card);
                });
            }, { threshold: 0.06, rootMargin: "0px 0px -32px 0px" });
            cards.forEach((card, i) => {
                card._revealIndex = i;
                card.classList.add("is-card-hidden");
                observer.observe(card);
            });
        };

        const renderProducts = (container, items, href) => {
            if (!container) return;
            if (!Array.isArray(items)) {
                renderGridNotice(container, "Products are loading. Please try again in a moment.", "error");
                return;
            }
            if (!items.length) {
                renderGridNotice(container, "No products match this selection right now.");
                return;
            }

            const fragment = document.createDocumentFragment();
            const shouldAddProductAnchors = shouldEnableProductAnchors(container);
            const usedAnchorIds = new Set();

            try {
                items.forEach((item, index) => {
                    if (!item?.name || !item?.image) return;
                    const productCard = document.createElement("article");
                    productCard.className = "product-card";
                    productCard.dataset.productId = item.productId;
                    productCard.dataset.productName = item.name;
                    productCard.dataset.productCategory = item.category;

                    if (shouldAddProductAnchors) {
                        const baseAnchorId = buildAnchorSlug(item.name);
                        if (baseAnchorId) {
                            let anchorId = baseAnchorId;
                            let duplicateIndex = 2;
                            while (usedAnchorIds.has(anchorId)) {
                                anchorId = `${baseAnchorId}-${duplicateIndex}`;
                                duplicateIndex += 1;
                            }
                            usedAnchorIds.add(anchorId);
                            productCard.id = anchorId;
                        }
                    }

                    const productMedia = document.createElement("div");
                    productMedia.className = "product-media";
                    const productImage = document.createElement("img");
                    productImage.alt = getPreferredAltText(item.name, item.description);
                    productImage.decoding = "async";
                    productImage.src = getProductThumbnailSrc(item.image);

                    const shouldKeepEager = (
                        (container.id === "home-product-grid" && index < 4) ||
                        ((container.id === "shop-product-grid" || container.id === "category-product-grid") && index < 2)
                    );
                    productImage.loading = shouldKeepEager ? "eager" : "lazy";
                    productImage.fetchPriority = shouldKeepEager ? "high" : "low";

                    // add safe error handling for product images so one broken image doesn't break the section
                    productImage.addEventListener('error', () => {
                        applyImageFallback(productImage, `product:${item?.name || 'unknown'}`);
                    }, { once: true });

                    productMedia.append(productImage);
                    productMedia.setAttribute("role", "button");
                    productMedia.setAttribute("tabindex", "0");
                    productMedia.setAttribute("aria-label", `Open gallery for ${item.name}`);
                    const warmZoomAssets = () => warmProductZoomAssets(item);

                    if (shouldKeepEager) {
                        warmZoomAssets();
                    }

                    productMedia.addEventListener("pointerenter", warmZoomAssets, { once: true });
                    productMedia.addEventListener("focus", warmZoomAssets, { once: true });
                    productMedia.addEventListener("touchstart", warmZoomAssets, { once: true, passive: true });
                    productMedia.addEventListener("click", () => {
                        productGalleryLightbox.open(item, productMedia);
                    });
                    productMedia.addEventListener("keydown", (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            productGalleryLightbox.open(item, productMedia);
                        }
                    });
                    if (item.isNew) {
                        const newBadge = document.createElement("span");
                        newBadge.textContent = "New";
                        newBadge.style.cssText = "position:absolute;top:0.75rem;left:0.75rem;z-index:1;background:#fffdf8;color:#2f2a2c;border:1px solid rgba(215,189,126,0.5);border-radius:999px;padding:0.25rem 0.55rem;font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;box-shadow:0 8px 18px rgba(92,82,88,0.12);";
                        productMedia.style.position = "relative";
                        productMedia.append(newBadge);
                    }

                    const productMediaIcons = document.createElement("div");
                    productMediaIcons.className = "product-media-icons";

                    const wishlistBtn = document.createElement("button");
                    wishlistBtn.className = "product-media-btn product-wishlist-btn";
                    wishlistBtn.type = "button";
                    wishlistBtn.setAttribute("aria-label", `Save ${item.name} to wishlist`);
                    wishlistBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
                    wishlistBtn.addEventListener("click", (e) => { e.stopPropagation(); });

                    const shareBtn = document.createElement("button");
                    shareBtn.className = "product-media-btn product-share-btn";
                    shareBtn.type = "button";
                    shareBtn.setAttribute("aria-label", `Share ${item.name}`);
                    shareBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
                    shareBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        handleProductShare(item, productCard);
                    });

                    productMediaIcons.append(wishlistBtn, shareBtn);
                    productMedia.append(productMediaIcons);

                    // Mobile action row — CSS hides this on hover-capable devices
                    const productActionRow = document.createElement("div");
                    productActionRow.className = "product-action-row";

                    const actionWishlistBtn = document.createElement("button");
                    actionWishlistBtn.className = "product-media-btn product-wishlist-btn";
                    actionWishlistBtn.type = "button";
                    actionWishlistBtn.setAttribute("aria-label", `Save ${item.name} to wishlist`);
                    actionWishlistBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
                    actionWishlistBtn.addEventListener("click", (e) => { e.stopPropagation(); });

                    const actionShareBtn = document.createElement("button");
                    actionShareBtn.className = "product-media-btn product-share-btn";
                    actionShareBtn.type = "button";
                    actionShareBtn.setAttribute("aria-label", `Share ${item.name}`);
                    actionShareBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
                    actionShareBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        handleProductShare(item, productCard);
                    });

                    productActionRow.append(actionWishlistBtn, actionShareBtn);

                    const productInfo = document.createElement("div");
                    productInfo.className = "product-info";

                    const productTag = document.createElement("span");
                    productTag.className = "product-tag";
                    productTag.textContent = item.tag;

                    const productName = document.createElement("h3");
                    productName.className = "product-name";
                    productName.textContent = item.name;

                    const productPrice = document.createElement("p");
                    productPrice.className = "product-price";
                    if (item.discountPrice) {
                        const originalPrice = document.createElement("span");
                        originalPrice.className = "product-price-original";
                        originalPrice.textContent = item.price;

                        const discountPrice = document.createElement("span");
                        discountPrice.className = "product-price-discount";
                        discountPrice.textContent = item.discountPrice;

                        productPrice.append(discountPrice, originalPrice);
                    } else {
                        productPrice.textContent = item.price;
                    }

                    const productDescription = document.createElement("p");
                    productDescription.className = "product-description";
                    productDescription.textContent = item.description;

                    const isSoldOut = item.stockStatus === "sold-out";
                    const productStock = document.createElement("p");
                    productStock.className = isSoldOut ? "product-stock is-sold-out" : "product-stock";
                    productStock.textContent = isSoldOut ? "Sold Out" : "";

                    const productCtaGroup = document.createElement("div");
                    productCtaGroup.className = "product-cta-group";
                    if (isSoldOut) {
                        const productBtn = document.createElement("button");
                        productBtn.className = "btn btn-primary";
                        productBtn.type = "button";
                        productBtn.classList.add("is-disabled");
                        productBtn.disabled = true;
                        productBtn.setAttribute("aria-disabled", "true");
                        productBtn.textContent = "Sold Out";
                        productCtaGroup.append(productBtn);
                    } else {
                        const productCardActions = document.createElement("div");
                        productCardActions.className = "product-card-actions";

                        const buyNowBtn = document.createElement("button");
                        buyNowBtn.className = "btn btn-buy-now buy-now-btn";
                        buyNowBtn.type = "button";
                        buyNowBtn.textContent = "Buy Now";
                        buyNowBtn.addEventListener("click", () => buyNowModal.open(item, buyNowBtn));

                        const addToBagBtn = document.createElement("button");
                        addToBagBtn.className = "btn btn-add-to-bag add-to-bag-btn";
                        addToBagBtn.type = "button";
                        addToBagBtn.textContent = "Add to Bag";
                        addToBagBtn.addEventListener("click", () => {
                            const bagResult = addProductToBag(item);
                            updateBagBadge();

                            if (bagResult.status === "existing") {
                                showBagToast("Already in your Bag \u2728");
                                return;
                            }

                            if (bagResult.status === "added") {
                                showBagToast("Added to your Bag \u2728");
                            }
                        });

                        const assistanceBtn = document.createElement("button");
                        assistanceBtn.className = "btn btn-product-assistance";
                        assistanceBtn.type = "button";
                        assistanceBtn.textContent = "Need styling advice?";
                        assistanceBtn.addEventListener("click", () => handleProductAssistance(item));

                        productCardActions.append(buyNowBtn, addToBagBtn);
                        productCtaGroup.append(productCardActions, assistanceBtn);
                    }

                    productCard.addEventListener("click", (event) => {
                        if (event.target.closest("button")) return;
                        trackEvent("product_card_click", {
                            product_name: item.name,
                            product_category: item.category,
                            click_target: event.target.closest(".product-media") ? "product_image" : "product_details"
                        });
                    });

                    productInfo.append(productTag, productName, productPrice, productDescription, productStock, productCtaGroup);
                    productCard.append(productMedia, productActionRow, productInfo);
                    fragment.append(productCard);
                });
            } catch (error) {
                console.error("renderProducts failed", error);
                renderGridNotice(container, "We couldn't load these products right now. Please refresh and try again.", "error");
                return;
            }

            if (!fragment.childNodes.length) {
                renderGridNotice(container, "We couldn't load these products right now. Please refresh and try again.", "error");
                return;
            }

            container.innerHTML = "";
            clearGridSkeletons(container);
            container.append(fragment);
            setupCardReveal(container);
            signalGridRefresh(container);
            scrollToProductAnchor(container);
            injectProductSchema(container, items);
        };

        const addShoppingPolicyContent = () => {
            if (!document.querySelector(".utility-bar") && !document.querySelector(".top-shipping-strip")) {
                const header = document.querySelector(".site-header");
                const policyStrip = document.createElement("div");
                policyStrip.className = "top-shipping-strip";
                policyStrip.innerHTML = "<span></span>";
                header?.insertAdjacentElement("beforebegin", policyStrip);
            }

            document.querySelectorAll(".site-footer").forEach((footer) => {
                if (footer.querySelector(".footer-policy")) return;
                const footerPolicy = document.createElement("p");
                footerPolicy.className = "footer-policy";
                const footerNote = footer.querySelector(".footer-note");
                if (footerNote) {
                    footerNote.insertAdjacentElement("beforebegin", footerPolicy);
                } else {
                    footer.append(footerPolicy);
                }
            });
        };

        addShoppingPolicyContent();

        let brandContent = {};
        const bodyPage = document.body.dataset.page;
        const brandContentPromise = fetchBrandContent();
        let hasAppliedBrandContent = false;
        const applyResolvedBrandContent = (content) => {
            brandContent = content || {};
            if (hasAppliedBrandContent) return brandContent;
            applyBrandContent(brandContent);
            hasAppliedBrandContent = true;
            return brandContent;
        };
        void brandContentPromise.then(applyResolvedBrandContent);
        const homeGrid = document.getElementById("home-product-grid");
        const shopGrid = document.getElementById("shop-product-grid");
        const categoryGrid = document.getElementById("category-product-grid");
        const needsProducts = Boolean(homeGrid || shopGrid || categoryGrid);
        const products = needsProducts ? await fetchProducts() : [];
        if (needsProducts && Array.isArray(products)) searchProductsCache = products;

        if (homeGrid) {
            renderProducts(homeGrid, Array.isArray(products) ? products.slice(0, 8) : products, "shop.html");
        }

        if (shopGrid) {
            const params = new URLSearchParams(window.location.search);
            const style = params.get("style");
            const price = params.get("price");
            const categoryFilter = params.get("filter") || params.get("categoryFilter") || "";
            const filtered = Array.isArray(products)
                ? applyProductFilters(products, { style, price, categoryFilter })
                : products;
            renderProducts(shopGrid, filtered, "shop.html");

            document.querySelectorAll(".filter-chip").forEach((chip) => {
                const chipHref = chip.getAttribute("href");
                if (!chipHref) return;
                const chipUrl = new URL(chipHref, window.location.href);
                const chipStyle = chipUrl.searchParams.get("style");
                const chipPrice = chipUrl.searchParams.get("price");
                const chipFilter = chipUrl.searchParams.get("filter") || chipUrl.searchParams.get("categoryFilter") || "";
                if (
                    (chipStyle === style || (!style && !chipStyle)) &&
                    (chipPrice === price || (!price && !chipPrice)) &&
                    (chipFilter === categoryFilter || (!categoryFilter && !chipFilter))
                ) {
                    chip.classList.add("is-active");
                }
            });
        }

        if (categoryGrid) {
            const category = document.body.dataset.category;
            const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
            const categoryProducts = Array.isArray(products)
                ? products.filter((product) => {
                    if (category === "combos") {
                        return product.category === "combos" || product.category === "comboset";
                    }

                    return product.category === category;
                })
                : products;
            renderProducts(categoryGrid, categoryProducts, "contact.html");
            filterButtons.forEach((button) => {
                button.setAttribute("aria-pressed", button.dataset.filter === "all" ? "true" : "false");
                button.addEventListener("click", () => {
                    const filterValue = button.dataset.filter;
                    const nextItems = Array.isArray(categoryProducts)
                        ? applyProductFilters(categoryProducts, { categoryFilter: filterValue })
                        : categoryProducts;
                    trackEvent("category_filter_click", {
                        category,
                        filter_value: filterValue,
                        matching_products: Array.isArray(nextItems) ? nextItems.length : 0
                    });

                    filterButtons.forEach((item) => {
                        item.classList.remove("is-active");
                        item.setAttribute("aria-pressed", "false");
                    });
                    button.classList.add("is-active");
                    button.setAttribute("aria-pressed", "true");
                    renderProducts(categoryGrid, nextItems, "contact.html");
                });
            });
        }

        applyResolvedBrandContent(await brandContentPromise);
        initializeOrderSuccessCard();
        void getBagItems();
        updateBagBadge();
        if (bodyPage === "bag") {
            renderBagPage();
        }

        const navToggle = document.querySelector(".nav-toggle");
        const mainNav = document.getElementById("site-nav");
        if (navToggle && mainNav) {
            navToggle.addEventListener("click", () => {
                const isOpen = mainNav.classList.toggle("is-open");
                navToggle.setAttribute("aria-expanded", String(isOpen));
            });
        }
        document.querySelectorAll('.instagram-link, a[href*="instagram.com/thefloaa"]').forEach((link) => {
            link.addEventListener("click", () => {
                trackEvent("instagram_click", {
                    location: link.classList.contains("mobile-icon-link")
                        ? "mobile_header"
                        : link.classList.contains("desktop-instagram-link")
                            ? "desktop_header"
                            : "footer"
                });
            });
        });
        document.querySelectorAll(".category-whatsapp-cta").forEach((link) => {
            link.addEventListener("click", () => {
                trackEvent("whatsapp_chat_click", {
                    location: link.dataset.trackingLocation || "category_banner"
                });
            });
        });
        if (!document.querySelector(".whatsapp-float")) {
            const whatsappUrl = buildWhatsAppUrl(getWhatsAppNumber(brandContent), getWhatsAppMessage(brandContent));
            if (!whatsappUrl) return;

            const whatsappButton = document.createElement("a");
            whatsappButton.href = whatsappUrl;
            whatsappButton.className = "whatsapp-float";
            whatsappButton.target = "_blank";
            whatsappButton.rel = "noopener";
            whatsappButton.setAttribute("aria-label", "Chat on WhatsApp");
            whatsappButton.addEventListener("click", () => {
                trackMetaWhatsAppClick();
                trackEvent("whatsapp_chat_click", {
                    location: "floating_button"
                });
            });

            const whatsappIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            whatsappIcon.setAttribute("viewBox", "0 0 32 32");
            whatsappIcon.setAttribute("aria-hidden", "true");
            whatsappIcon.setAttribute("focusable", "false");

            const bubblePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            bubblePath.setAttribute("d", "M16 3.8A12.1 12.1 0 0 0 5.5 22l-1.4 5.2 5.3-1.4A12.1 12.1 0 1 0 16 3.8Zm0 22a9.6 9.6 0 0 1-4.9-1.3l-.4-.2-3.1.8.8-3-.2-.4A9.6 9.6 0 1 1 16 25.8Z");

            const phonePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            phonePath.setAttribute("d", "M21.4 18.7c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.6-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.3 3.4 1.4 3.6c.2.2 2.5 3.8 6 5.3.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.8-.7 2.1-1.5.3-.7.3-1.4.2-1.5-.1-.1-.3-.2-.6-.4Z");

            whatsappIcon.append(bubblePath, phonePath);
            whatsappButton.append(whatsappIcon);
            document.body.append(whatsappButton);
        }

        const siteHeader = document.querySelector(".site-header");
        if (siteHeader) {
            const onHeaderScroll = () => {
                siteHeader.classList.toggle("is-scrolled", window.scrollY > 30);
            };
            window.addEventListener("scroll", onHeaderScroll, { passive: true });
            onHeaderScroll();
        }

        const mobileSearchBtn = document.querySelector(".mobile-search");
        if (mobileSearchBtn) {
            mobileSearchBtn.addEventListener("click", (e) => {
                e.preventDefault();
                searchOverlay.open(mobileSearchBtn);
            });
        }

    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializePage, { once: true });
    } else {
        void initializePage();
    }

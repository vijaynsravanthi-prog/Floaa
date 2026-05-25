const initializePage = async () => {
    const SHEET_ID = "1ZQzgsE-Yv7Ad6_t29hWi2UXe549YXcBu3dD_jEjygfs";
    const PRODUCTS_URL = `https://opensheet.elk.sh/${SHEET_ID}/1`;
    const BRAND_CONTENT_URL = `https://opensheet.elk.sh/${SHEET_ID}/BrandContent`;
    const optimizedHeroImageMap = new Map([
        ["assets/floaa-jew-pics/lavender-empress-set.png", "assets/floaa-jew-pics/lavender-empress-set.webp"],
        ["assets/floaa-jew-pics/pistachio-model.png", "assets/floaa-jew-pics/pistachio-model.webp"],
        ["assets/floaa-jew-pics/ruby-model.png", "assets/floaa-jew-pics/ruby-model.webp"],
        ["assets/floaa-jew-pics/tripti-blue-model.png", "assets/floaa-jew-pics/tripti-blue-model.webp"]
    ]);
    const getPreferredHeroImageSrc = (imagePath) => optimizedHeroImageMap.get(imagePath) || imagePath;
    const getPreferredAltText = (name, description = "") => cleanSheetValue(description) || normalizeValue(name);
    const initHeroSlider = () => {
        const slider = document.querySelector(".hero-slider");
        if (!slider) return;

        const allSlides = Array.from(slider.querySelectorAll(".hero-slide"));
        const slides = allSlides.filter((slide) => slide.dataset.heroDisabled !== "true");
        const dots = Array.from(slider.querySelectorAll(".hero-slider-dots button"));
        const previousButton = slider.querySelector(".hero-slider-prev");
        const nextButton = slider.querySelector(".hero-slider-next");
        if (slides.length <= 1) return;

        allSlides.forEach((slide) => {
            if (slide.dataset.heroDisabled !== "true") return;
            slide.setAttribute("aria-hidden", "true");
            slide.querySelectorAll("a, button").forEach((element) => {
                element.setAttribute("tabindex", "-1");
            });
        });

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

    const setHeroSlideImage = (image, nextImageSrc) => {
        if (!image || !nextImageSrc) return;

        const slide = image.closest(".hero-slide");
        const preferredImageSrc = getPreferredHeroImageSrc(nextImageSrc);
        const safeImageSrc = /^https?:\/\//i.test(preferredImageSrc) ? preferredImageSrc : encodeURI(preferredImageSrc);

        const handleReady = () => {
            slide?.classList.add("is-image-ready");
        };
        const handleError = () => {
            image.removeAttribute("src");
            slide?.classList.remove("is-image-ready");
        };

        if (image.getAttribute("src") === safeImageSrc) {
            if (image.complete) {
                handleReady();
            } else {
                image.addEventListener("load", handleReady, { once: true });
                image.addEventListener("error", handleError, { once: true });
            }
            return;
        }

        slide?.classList.remove("is-image-ready");
        image.addEventListener("load", handleReady, { once: true });
        image.addEventListener("error", handleError, { once: true });
        image.src = safeImageSrc;

        if (image.complete) {
            handleReady();
        }
    };

    const prepareHeroImages = () => {
        const heroImages = Array.from(document.querySelectorAll(".hero-slide img"));
        if (!heroImages.length) return;

        const markReady = (image) => {
            image.closest(".hero-slide")?.classList.add("is-image-ready");
        };

        heroImages.forEach((image) => {
            if (image.complete) {
                markReady(image);
            } else if (image.getAttribute("src")) {
                image.addEventListener("load", () => markReady(image), { once: true });
            }
        });
    };

    initHeroSlider();
    prepareHeroImages();

    const normalizeValue = (value) => String(value || "").trim();
    const cleanSheetValue = (value) => normalizeValue(value)
        .replace(/^"+|"+$/g, "")
        .replace(/^'+|'+$/g, "")
        .replace(/",$/, "")
        .trim();
    const normalizeSlug = (value) => normalizeValue(value).toLowerCase();
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
    const normalizeImagePath = (value) => {
        const image = cleanSheetValue(value);
        if (!image || /^https?:\/\//i.test(image) || image.startsWith("assets/")) return image;
        return `assets/floaa-jew-pics/${image}`;
    };
    const getProductImages = (value) => normalizeList(value).map(normalizeImagePath).filter(Boolean);
    const parsePrice = (value) => {
        const price = Number(normalizeValue(value).replace(/[^\d.]/g, ""));
        return Number.isFinite(price) ? price : 0;
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
        if (typeof window.gtag !== "function") return;
        window.gtag("event", eventName, {
            page_path: window.location.pathname,
            ...params
        });
    };
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
                thumb: source,
                type: isVideoAsset(source) ? "video" : "image",
                alt: getPreferredAltText(item.name, item.description),
                label: `${item.name} ${index + 1}`
            }));
    };
    const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);
    const preloadGalleryAsset = (item) => {
        if (!item || item.type !== "image" || !item.src) return;
        const image = new Image();
        image.decoding = "async";
        image.src = item.src;
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
            setLoadingState(false);
            mediaFrame.classList.remove("is-hover-zoom");
        });

        image.addEventListener("dblclick", (event) => {
            event.preventDefault();
            const nextScale = state.scale > 1 ? 1 : 2.4;
            updateZoomAroundPoint(nextScale, event.clientX, event.clientY);
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
                        updateZoomAroundPoint(state.scale > 1 ? 1 : 2.4, event.changedTouches[0].clientX, event.changedTouches[0].clientY);
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

    const transformProduct = (row) => {
        const name = normalizeValue(getRowValue(row, ["Name"]));
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
            const response = await fetch(PRODUCTS_URL);
            if (!response.ok) {
                throw new Error(`Products request failed: ${response.status}`);
            }

            const rows = await response.json();
            if (!Array.isArray(rows)) return [];
            return rows
                .map(transformProduct)
                .filter((product) => product.name && product.image && product.status !== "inactive");
        } catch (error) {
            console.error(error);
            return [];
        }
    };

    const fetchBrandContent = async () => {
        try {
            const earlyRows = await window.__floaaBrandRowsPromise;
            const rows = Array.isArray(earlyRows) && earlyRows.length
                ? earlyRows
                : await (async () => {
                    const response = await fetch(BRAND_CONTENT_URL);
                    if (!response.ok) {
                        throw new Error(`Brand content request failed: ${response.status}`);
                    }

                    return response.json();
                })();
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
        const logo = content.logo || content["floaa-logo"];
        if (logo?.value) {
            document.querySelectorAll(".brand-logo").forEach((image) => {
                image.src = logo.value;
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

        const footerPolicyText = getBrandValue(content, ["policy-message", "footer-policy", "return-policy"]);
        if (footerPolicyText) {
            document.querySelectorAll(".footer-policy").forEach((policy) => {
                policy.textContent = footerPolicyText;
            });
        }

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
            const copy = slide.querySelector(".hero-slide-copy");
            const heading = copy?.querySelector("h1");
            const button = copy?.querySelector(".btn");
            let kicker = copy?.querySelector(".hero-kicker");
            let subtitle = copy?.querySelector(".hero-subtitle");
            const slideImage = content[`hero-slide-${slideNumber}-image`] || content[`hero-slide-${slideNumber}`];
            const slideAlt = content[`hero-slide-${slideNumber}-alt`];
            const slideKicker = content[`hero-slide-${slideNumber}-kicker`];
            const slideHeading = content[`hero-slide-${slideNumber}-heading`];
            const slideSubtitle = content[`hero-slide-${slideNumber}-subtitle`] || content[`hero-slide-${slideNumber}-subtext`];
            const slideButtonText = content[`hero-slide-${slideNumber}-button-text`];
            const slideButtonLink = content[`hero-slide-${slideNumber}-button-link`];
            const hasSlideKicker = Object.prototype.hasOwnProperty.call(content, `hero-slide-${slideNumber}-kicker`);
            const hasSlideHeading = Object.prototype.hasOwnProperty.call(content, `hero-slide-${slideNumber}-heading`);
            const hasSlideSubtitle =
                Object.prototype.hasOwnProperty.call(content, `hero-slide-${slideNumber}-subtitle`) ||
                Object.prototype.hasOwnProperty.call(content, `hero-slide-${slideNumber}-subtext`);
            const hasSlideButtonText = Object.prototype.hasOwnProperty.call(content, `hero-slide-${slideNumber}-button-text`);
            const hasSlideButtonLink = Object.prototype.hasOwnProperty.call(content, `hero-slide-${slideNumber}-button-link`);

            if (image && slideImage?.value) {
                const nextImageSrc = normalizeImagePath(slideImage.value);
                if (nextImageSrc) {
                    setHeroSlideImage(image, nextImageSrc);
                }
            }
            if (image && slideAlt?.value) {
                image.alt = getPreferredAltText(slideAlt.value, slideHeading?.value || slideSubtitle?.value);
            }
            if (copy && hasSlideKicker) {
                if (!kicker) {
                    kicker = document.createElement("p");
                    kicker.className = "hero-kicker";
                    copy.insertBefore(kicker, heading || copy.firstChild);
                }
                kicker.textContent = slideKicker?.value || "";
                kicker.style.display = slideKicker?.value ? "" : "none";
            }
            if (heading && hasSlideHeading) {
                heading.textContent = slideHeading?.value || "";
            }
            if (copy && hasSlideSubtitle) {
                if (!subtitle) {
                    subtitle = document.createElement("p");
                    subtitle.className = "hero-subtitle";
                    if (button) {
                        copy.insertBefore(subtitle, button);
                    } else {
                        copy.append(subtitle);
                    }
                }
                subtitle.textContent = slideSubtitle?.value || "";
                subtitle.style.display = slideSubtitle?.value ? "" : "none";
            }
            if (button && hasSlideButtonText) {
                button.textContent = slideButtonText?.value || "";
                button.style.display = slideButtonText?.value ? "" : "none";
            }
            const socialProof = copy?.querySelector('.hero-social-proof');
            if (socialProof && button) {
                button.insertAdjacentElement('beforebegin', socialProof);
            }
            if (button && hasSlideButtonLink) {
                button.href = slideButtonLink?.value || "#";
            }
        });

        ["earrings", "necklaces", "bracelets", "combos"].forEach((category) => {
            const categoryImage = content[`category-${category}`] || content[`${category}-image`];
            const categoryTile = document.querySelector(`.category-tile[href="${category}.html"] .category-tile-media`);
            if (categoryTile && categoryImage?.value) {
                categoryTile.style.backgroundImage = `url("${normalizeImagePath(categoryImage.value)}")`;
            }
        });

        const combosImage = content["category-combos"] || content["combos-image"] || content["category-rings"] || content["rings-image"];
        const combosTile = document.querySelector('.category-tile[href="rings.html"] .category-tile-media');
        if (combosTile && combosImage?.value) {
            combosTile.style.backgroundImage = `url("${normalizeImagePath(combosImage.value)}")`;
        }

        const readAboutImage = content["read-about"] || content["read-about-image"];
        const readAboutSurface = document.querySelector(".feature-surface-one");
        if (readAboutSurface && readAboutImage?.value) {
            readAboutSurface.style.backgroundImage = `url("${normalizeImagePath(readAboutImage.value)}")`;
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

        try {
            items.forEach((item, index) => {
                if (!item?.name || !item?.image) return;
                const productCard = document.createElement("article");
                productCard.className = "product-card";
                productCard.dataset.productName = item.name;
                productCard.dataset.productCategory = item.category;

                const productMedia = document.createElement("div");
                productMedia.className = "product-media";
                const productImage = document.createElement("img");
                productImage.alt = getPreferredAltText(item.name, item.description);
                productImage.decoding = "async";
                productImage.src = item.image;

                const shouldKeepEager = (container.id === "shop-product-grid" || container.id === "category-product-grid") && index < 2;
                productImage.loading = shouldKeepEager ? "eager" : "lazy";

                productMedia.append(productImage);
                productMedia.setAttribute("role", "button");
                productMedia.setAttribute("tabindex", "0");
                productMedia.setAttribute("aria-label", `Open gallery for ${item.name}`);
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
                    const reserveBtn = document.createElement("button");
                    reserveBtn.className = "btn btn-primary";
                    reserveBtn.type = "button";
                    reserveBtn.textContent = "ORDER ON WHATSAPP";
                    reserveBtn.addEventListener("click", () => whatsappReserveModal.open(item, brandContent, reserveBtn));

                    const questionBtn = document.createElement("button");
                    questionBtn.className = "btn btn-whatsapp-secondary";
                    questionBtn.type = "button";
                    questionBtn.textContent = "ASK A QUESTION";
                    questionBtn.addEventListener("click", () => whatsappQuestionModal.open(item, brandContent, questionBtn));

                    productCtaGroup.append(reserveBtn, questionBtn);
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
                productCard.append(productMedia, productInfo);
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
        signalGridRefresh(container);
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
    const productsPromise = fetchProducts();
    const brandContentPromise = fetchBrandContent();
    const products = await productsPromise;

    const homeGrid = document.getElementById("home-product-grid");
    if (homeGrid) {
        renderProducts(homeGrid, products.slice(0, 8), "shop.html");
    }

    const shopGrid = document.getElementById("shop-product-grid");
    if (shopGrid) {
        const params = new URLSearchParams(window.location.search);
        const style = params.get("style");
        const price = params.get("price");
        const categoryFilter = params.get("filter") || params.get("categoryFilter") || "";
        const filtered = applyProductFilters(products, { style, price, categoryFilter });
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

    const categoryGrid = document.getElementById("category-product-grid");
    if (categoryGrid) {
        const category = document.body.dataset.category;
        const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
        const categoryProducts = products.filter((product) => {
            if (category === "combos") {
                return product.category === "combos" || product.category === "comboset";
            }

            return product.category === category;
        });
        renderProducts(categoryGrid, categoryProducts, "contact.html");
        filterButtons.forEach((button) => {
            button.setAttribute("aria-pressed", button.dataset.filter === "all" ? "true" : "false");
            button.addEventListener("click", () => {
                const filterValue = button.dataset.filter;
                const nextItems = applyProductFilters(categoryProducts, { categoryFilter: filterValue });
                trackEvent("category_filter_click", {
                    category,
                    filter_value: filterValue,
                    matching_products: nextItems.length
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

    brandContent = await brandContentPromise;
    applyBrandContent(brandContent);

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

};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePage, { once: true });
} else {
    void initializePage();
}

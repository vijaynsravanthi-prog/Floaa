const initializePage = async () => {
    const SHEET_ID = "1ZQzgsE-Yv7Ad6_t29hWi2UXe549YXcBu3dD_jEjygfs";
    const PRODUCTS_URL = `https://opensheet.elk.sh/${SHEET_ID}/1`;
    const BRAND_CONTENT_URL = `https://opensheet.elk.sh/${SHEET_ID}/BrandContent`;
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
            intervalId = window.setInterval(() => showSlide(activeIndex + 1), 4000);
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
        slide?.classList.remove("is-image-ready");
        const safeImageSrc = /^https?:\/\//i.test(nextImageSrc) ? nextImageSrc : encodeURI(nextImageSrc);

        if (image.getAttribute("src") === safeImageSrc) {
            if (image.complete) {
                slide?.classList.add("is-image-ready");
            }
            return;
        }

        const handleReady = () => {
            slide?.classList.add("is-image-ready");
        };
        const handleError = () => {
            image.removeAttribute("src");
            slide?.classList.remove("is-image-ready");
        };

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

        heroImages.forEach((image, index) => {
            if (image.complete) {
                markReady(image);
            } else if (image.getAttribute("src")) {
                image.addEventListener("load", () => markReady(image), { once: true });
            }

            if (index > 0 && image.getAttribute("src")) {
                const preload = new Image();
                preload.decoding = "async";
                preload.src = image.currentSrc || image.src;
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
    const applyProductFilters = (items, { style = "", price = "", categoryFilter = "" } = {}) => {
        const styleKey = normalizeKey(style);
        const categoryFilterKey = normalizeKey(categoryFilter);
        const hasStyleData = items.some((product) => product.style);
        const hasFilterData = items.some((product) => product.filters?.length);
        let filteredItems = styleKey && hasStyleData ? items.filter((product) => product.style === styleKey) : items;
        filteredItems = filterProductsByPrice(filteredItems, price);
        if (categoryFilterKey && categoryFilterKey !== "all" && hasFilterData) {
            filteredItems = filteredItems.filter((product) =>
                product.filters.includes(categoryFilterKey) ||
                product.style === categoryFilterKey ||
                filterProductsByPrice([product], categoryFilterKey).length > 0
            );
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
    const buildWhatsAppUrl = (number, message) => number
        ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
        : "";
    const handleWhatsAppOrder = (item, brandContent) => {
        const whatsappNumber = getWhatsAppNumber(brandContent);
        if (!whatsappNumber) return;
        const finalPrice = item.discountPrice || item.price;
        const imageUrl = item.image ? new URL(encodeURI(item.image), window.location.href).href : "";
        const message = [
            "Hi FLOAA,",
            "I want to order:",
            "",
            `Product: ${item.name}`,
            `Price: ${finalPrice}`,
            "Quantity: 1",
            imageUrl ? `Image: ${imageUrl}` : "",
            "",
            "Is this available? I'd like to place the order."
        ].filter(Boolean).join("\n");

        const whatsappUrl = buildWhatsAppUrl(whatsappNumber, message);
        window.open(whatsappUrl, "_blank", "noopener");
    };
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
            filters: [],
            style: "",
            tag: normalizedCategory.charAt(0).toUpperCase() + normalizedCategory.slice(1)
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
                link.href = whatsappUrl;
            });
        }

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
                image.alt = slideAlt.value;
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

    const renderProducts = (container, items, href) => {
        if (!container) return;
        container.innerHTML = "";

        items.forEach((item) => {
            const productCard = document.createElement("article");
            productCard.className = "product-card";

            const productMedia = document.createElement("div");
            productMedia.className = "product-media";
            productMedia.style.backgroundImage = `url("${item.image}")`;
            if (item.images?.length > 1) {
                let activeImageIndex = 0;
                productMedia.setAttribute("role", "button");
                productMedia.setAttribute("tabindex", "0");
                productMedia.setAttribute("aria-label", `View more images of ${item.name}`);

                const showNextImage = () => {
                    activeImageIndex = (activeImageIndex + 1) % item.images.length;
                    productMedia.style.backgroundImage = `url("${item.images[activeImageIndex]}")`;
                };

                productMedia.addEventListener("click", showNextImage);
                productMedia.addEventListener("keydown", (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        showNextImage();
                    }
                });
            }
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

            const productBtn = document.createElement("button");
            productBtn.className = "btn btn-primary";
            productBtn.type = "button";
            if (isSoldOut) {
                productBtn.classList.add("is-disabled");
                productBtn.disabled = true;
                productBtn.setAttribute("aria-disabled", "true");
                productBtn.textContent = "Sold Out";
            } else {
                productBtn.textContent = "Buy on WhatsApp";
                productBtn.productName = item.name;
                productBtn.productPrice = item.discountPrice || item.price;
                productBtn.setAttribute("onclick", "gtag('event', 'whatsapp_order_click', {'product_name': this.productName, 'product_price': this.productPrice});");
                productBtn.addEventListener("click", () => handleWhatsAppOrder(item, brandContent));
            }

            productInfo.append(productTag, productName, productPrice, productDescription, productStock, productBtn);
            productCard.append(productMedia, productInfo);
            container.append(productCard);
        });
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

    const bodyPage = document.body.dataset.page;
    const productsPromise = fetchProducts();
    const brandContentPromise = fetchBrandContent();

    const brandContent = await brandContentPromise;
    applyBrandContent(brandContent);

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
        const categoryProducts = products.filter((product) => {
            if (category === "combos") {
                return product.category === "combos" || product.category === "comboset";
            }

            return product.category === category;
        });
        renderProducts(categoryGrid, categoryProducts, "contact.html");

        document.querySelectorAll("[data-filter]").forEach((button) => {
            button.addEventListener("click", () => {
                const filterValue = button.dataset.filter;
                const nextItems = applyProductFilters(categoryProducts, { categoryFilter: filterValue });

                document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("is-active"));
                button.classList.add("is-active");
                renderProducts(categoryGrid, nextItems, "contact.html");
            });
        });
    }

    const navToggle = document.querySelector(".nav-toggle");
    const mainNav = document.getElementById("site-nav");
    if (navToggle && mainNav) {
        navToggle.addEventListener("click", () => {
            const isOpen = mainNav.classList.toggle("is-open");
            navToggle.setAttribute("aria-expanded", String(isOpen));
        });
    }
    if (!document.querySelector(".whatsapp-float")) {
        const whatsappUrl = buildWhatsAppUrl(getWhatsAppNumber(brandContent), getWhatsAppMessage(brandContent));
        if (!whatsappUrl) return;

        const whatsappButton = document.createElement("a");
        whatsappButton.href = whatsappUrl;
        whatsappButton.className = "whatsapp-float";
        whatsappButton.target = "_blank";
        whatsappButton.rel = "noopener";
        whatsappButton.setAttribute("aria-label", "Chat on WhatsApp");
        whatsappButton.setAttribute("onclick", "gtag('event', 'whatsapp_chat_click', {'location': 'floating_button'});");

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

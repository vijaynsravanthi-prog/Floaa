document.addEventListener("DOMContentLoaded", async () => {
    const montageImages = [
        "assets/floaa-jew-pics/floaa-01.jpeg",
        "assets/floaa-jew-pics/floaa-02.jpeg",
        "assets/floaa-jew-pics/floaa-03.jpeg",
        "assets/floaa-jew-pics/floaa-04.jpeg",
        "assets/floaa-jew-pics/floaa-05.jpeg",
        "assets/floaa-jew-pics/floaa-06.jpeg",
        "assets/floaa-jew-pics/floaa-07.jpeg",
        "assets/floaa-jew-pics/floaa-16.jpeg",
        "assets/floaa-jew-pics/floaa-17.jpeg"
    ];

    const SHEET_ID = "1ZQzgsE-Yv7Ad6_t29hWi2UXe549YXcBu3dD_jEjygfs";
    const PRODUCTS_URL = `https://opensheet.elk.sh/${SHEET_ID}/1`;
    const BRAND_CONTENT_URL = `https://opensheet.elk.sh/${SHEET_ID}/BrandContent`;
    const WHATSAPP_NUMBER = "919960144483";

    const normalizeValue = (value) => String(value || "").trim();
    const normalizeSlug = (value) => normalizeValue(value).toLowerCase();
    const normalizeKey = (value) => normalizeSlug(value).replace(/[\s_-]+/g, "-");
    const normalizeStatus = (value) => normalizeSlug(value).replace(/[\s-]+/g, "");
    const normalizeList = (value) => normalizeValue(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    const getGeneratedImagePath = (name) => {
        const imageName = normalizeSlug(name)
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        return imageName ? `assets/floaa-jew-pics/${imageName}.jpeg` : "";
    };
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
        let filteredItems = style ? items.filter((product) => product.style === style) : items;
        filteredItems = filterProductsByPrice(filteredItems, price);
        if (categoryFilter && categoryFilter !== "all") {
            filteredItems = filteredItems.filter((product) =>
                product.filters.includes(categoryFilter) || filterProductsByPrice([product], categoryFilter).length > 0
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
        const price = normalizeValue(value);
        return price ? `₹${price.replace(/^₹\s*/, "")}` : "";
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
        const image = normalizeValue(getRowValue(row, ["Image"])) || getGeneratedImagePath(name);
        const createdDate = normalizeValue(getRowValue(row, ["CreatedDate", "Created Date"]));
        const category = normalizeSlug(getRowValue(row, ["Category"]));
        const status = normalizeStatus(getRowValue(row, ["Status"]));
        const stockStatus = normalizeKey(getRowValue(row, ["StockStatus", "Stock Status"]));

        return {
            name,
            price: formatPrice(price),
            discountPrice: formatPrice(discountPrice),
            priceValue: parsePrice(price),
            discountPriceValue: parsePrice(discountPrice),
            image,
            createdDate,
            isNew: isNewArrival(createdDate),
            description: normalizeValue(getRowValue(row, ["Description"])),
            whatsappText: normalizeValue(getRowValue(row, ["WhatsAppText", "WhatsApp Text"])) || `Hi FLOAA, I am interested in ${name || "this product"}`,
            category,
            status,
            stockStatus,
            filters: normalizeList(getRowValue(row, ["Filters"])).map(normalizeSlug),
            style: normalizeSlug(getRowValue(row, ["Style"])),
            tag: normalizeValue(getRowValue(row, ["Tag"])) || category || "Jewellery"
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
                .filter((product) => product.name && product.status !== "inactive");
        } catch (error) {
            console.error(error);
            return [];
        }
    };

    const fetchBrandContent = async () => {
        try {
            const response = await fetch(BRAND_CONTENT_URL);
            if (!response.ok) {
                throw new Error(`Brand content request failed: ${response.status}`);
            }

            const rows = await response.json();
            if (!Array.isArray(rows)) return {};

            return rows.reduce((content, row) => {
                const key = normalizeKey(getRowValue(row, ["Key", "Name", "Asset", "Type"]));
                const value = normalizeValue(getRowValue(row, ["Value", "URL", "Url", "Path", "Image", "Video"]));
                if (!key || !value) return content;

                content[key] = {
                    value,
                    alt: normalizeValue(getRowValue(row, ["Alt", "AltText", "Description"]))
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

            const productBtn = document.createElement("a");
            productBtn.className = "btn btn-primary";
            if (isSoldOut) {
                productBtn.href = "#";
                productBtn.classList.add("is-disabled");
                productBtn.setAttribute("aria-disabled", "true");
                productBtn.textContent = "Sold Out";
            } else {
                productBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(item.whatsappText || "")}`;
                productBtn.target = "_blank";
                productBtn.rel = "noopener";
                productBtn.textContent = "Order on WhatsApp 💬";
            }

            productInfo.append(productTag, productName, productPrice, productDescription, productStock, productBtn);
            productCard.append(productMedia, productInfo);
            container.append(productCard);
        });
    };

    const bodyPage = document.body.dataset.page;
    const [products, brandContent] = await Promise.all([
        fetchProducts(),
        fetchBrandContent()
    ]);
    applyBrandContent(brandContent);

    const homeGrid = document.getElementById("home-product-grid");
    if (homeGrid) {
        renderProducts(homeGrid, products.slice(0, 8), "shop.html");
    }

    const shopGrid = document.getElementById("shop-product-grid");
    if (shopGrid) {
        const params = new URLSearchParams(window.location.search);
        const style = params.get("style");
        const price = params.get("price");
        const filtered = applyProductFilters(products, { style, price });
        renderProducts(shopGrid, filtered, "shop.html");

        document.querySelectorAll(".filter-chip").forEach((chip) => {
            const chipHref = chip.getAttribute("href");
            if (!chipHref) return;
            const chipUrl = new URL(chipHref, window.location.href);
            const chipStyle = chipUrl.searchParams.get("style");
            const chipPrice = chipUrl.searchParams.get("price");
            if ((chipStyle === style || (!style && !chipStyle)) && (chipPrice === price || (!price && !chipPrice))) {
                chip.classList.add("is-active");
            }
        });
    }

    const categoryGrid = document.getElementById("category-product-grid");
    if (categoryGrid) {
        const category = document.body.dataset.category;
        const categoryProducts = products.filter((product) => product.category === category);
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

    const mainMontage = document.getElementById("hero-montage-main");
    const thumbMontage = Array.from(document.querySelectorAll(".hero-montage-thumb"));
    if (mainMontage && thumbMontage.length === 3) {
        let activeIndex = 0;

        const renderMontage = () => {
            mainMontage.src = montageImages[activeIndex];
            thumbMontage.forEach((thumb, index) => {
                const nextIndex = (activeIndex + index + 1) % montageImages.length;
                thumb.src = montageImages[nextIndex];
            });
        };

        renderMontage();
        window.setInterval(() => {
            activeIndex = (activeIndex + 1) % montageImages.length;
            renderMontage();
        }, 2200);
    }

    const navToggle = document.querySelector(".nav-toggle");
    const mainNav = document.getElementById("site-nav");
    if (navToggle && mainNav) {
        navToggle.addEventListener("click", () => {
            const isOpen = mainNav.classList.toggle("is-open");
            navToggle.setAttribute("aria-expanded", String(isOpen));
        });
    }
  /* 👇 ADD YOUR CODE RIGHT HERE */
    if (!document.querySelector(".whatsapp-float")) {
        const whatsappButton = document.createElement("a");
        whatsappButton.href = "https://wa.me/919960144483?text=Hi%20FLOAA%2C%20I%20am%20interested%20in%20your%20collection";
        whatsappButton.className = "whatsapp-float";
        whatsappButton.target = "_blank";
        whatsappButton.rel = "noopener";
        whatsappButton.setAttribute("aria-label", "Chat on WhatsApp");

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

});

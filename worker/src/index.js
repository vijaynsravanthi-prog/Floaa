const PRODUCTS_URL = "https://opensheet.elk.sh/1ZQzgsE-Yv7Ad6_t29hWi2UXe549YXcBu3dD_jEjygfs/1";
const SPREADSHEET_ID = "1ZQzgsE-Yv7Ad6_t29hWi2UXe549YXcBu3dD_jEjygfs";
const ORDERS_SHEET_NAME = "Orders";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const RAZORPAY_PAYMENT_LINKS_URL = "https://api.razorpay.com/v1/payment_links";
const GOOGLE_SHEETS_API_BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values`;
const DEFAULT_SITE_URL = "https://floaa.in";
const WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_NAME = "floaa_order_confirmation";
const WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_LANGUAGE = "en_US";
const WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_NAME = "floaa_admin_order_alert";
const DEFAULT_WHATSAPP_COUNTRY_CODE = "91";
const DEFAULT_ORDER_CONFIRMATION_TEMPLATE_FIELDS = ["CustomerName", "OrderId", "Amount"];
const DEFAULT_ADMIN_ORDER_ALERT_TEMPLATE_FIELDS = [
  "OrderId",
  "CustomerName",
  "Phone",
  "Email",
  "ProductId",
  "ProductName",
  "ProductLink",
  "Amount",
  "AddressLine1",
  "City"
];
const ORDER_CONFIRMATION_UPDATED_BY = "worker:payment_link.paid";
const ADMIN_ORDER_NOTIFICATION_UPDATED_BY = "worker:payment_link.paid.admin_whatsapp";
const ALLOWED_ORIGINS = new Set([
  "http://localhost:8000",
  "https://www.floaa.in",
  "https://floaa.in"
]);
const ORDER_STATUSES = {
  CREATED: "Created",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled"
};
const PAYMENT_STATUSES = {
  CREATED: "Created",
  PAID: "Paid",
  EXPIRED: "Expired"
};
const PHONE_PATTERN = /^[6-9]\d{9}$/;
const PINCODE_PATTERN = /^\d{6}$/;

const getCorsHeaders = (request) => {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "";

  return {
    ...(allowedOrigin ? { "access-control-allow-origin": allowedOrigin } : {}),
    "access-control-allow-headers": "Content-Type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    vary: "Origin"
  };
};

const jsonResponse = (data, init = {}, request) =>
  new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(request ? getCorsHeaders(request) : {})
    },
    ...init
  });

const buildProductsResponseHeaders = (request, extraHeaders = {}) => ({
  "content-type": "application/json; charset=utf-8",
  ...(request ? getCorsHeaders(request) : {}),
  ...extraHeaders
});

const buildProductsError = (type, details = {}) => {
  const error = new Error(details.message || "Products request failed");
  error.type = type;
  error.status = details.status;
  error.contentType = details.contentType || "";
  error.bodyPreview = normalizeValue(details.bodyPreview).slice(0, 500);
  error.isArrayPayload = details.isArrayPayload;
  return error;
};

const fetchProducts = async () => {
  console.log("product fetch started");
  let response;

  try {
    response = await fetch(PRODUCTS_URL);
  } catch (error) {
    throw buildProductsError("fetch-failed", {
      message: error?.message || "Products request failed"
    });
  }

  const contentType = response.headers.get("content-type") || "";
  const responseText = await response.text();
  const bodyPreview = responseText.slice(0, 500);

  if (!response.ok) {
    throw buildProductsError("upstream-non-ok", {
      message: `Products request failed with status ${response.status}`,
      status: response.status,
      contentType,
      bodyPreview
    });
  }

  let products;

  try {
    products = JSON.parse(responseText);
  } catch (error) {
    throw buildProductsError("invalid-json", {
      message: error?.message || "Unable to parse products response JSON",
      status: response.status,
      contentType,
      bodyPreview
    });
  }

  if (!Array.isArray(products)) {
    throw buildProductsError("invalid-payload", {
      message: "Products payload is not an array",
      status: response.status,
      contentType,
      bodyPreview,
      isArrayPayload: false
    });
  }

  console.log("product fetch success", {
    count: products.length
  });
  return products;
};

const normalizeValue = (value) => String(value || "").trim();

const normalizeKey = (value) => normalizeValue(value).toLowerCase().replace(/[\s_-]+/g, "");

const buildProductSlug = (value) => normalizeValue(value)
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .replace(/-{2,}/g, "-");

const getRowValue = (row, names) => {
  const normalizedNames = names.map(normalizeKey);
  const matchingKey = Object.keys(row || {}).find((key) => normalizedNames.includes(normalizeKey(key)));
  return matchingKey ? row[matchingKey] : "";
};

const parsePriceToPaise = (value) => {
  const cleanedValue = normalizeValue(value).replace(/[^0-9.]/g, "");
  const price = Number(cleanedValue);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Invalid product price");
  }

  return Math.round(price * 100);
};

const normalizeDigits = (value) => normalizeValue(value).replace(/\D+/g, "");
const stripTrailingSlash = (value) => normalizeValue(value).replace(/\/+$/, "");
const getCheckoutCallbackBaseUrl = (request, env) => {
  const requestOrigin = normalizeValue(request?.headers?.get("origin"));
  if (ALLOWED_ORIGINS.has(requestOrigin)) {
    return stripTrailingSlash(requestOrigin);
  }

  const configuredSiteUrl = stripTrailingSlash(env?.PUBLIC_SITE_URL || "");
  return configuredSiteUrl || DEFAULT_SITE_URL;
};

const generateOrderId = () => {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `FLOAA-${year}${month}${day}-${hours}${minutes}${seconds}-${suffix}`;
};

const validateOrderRequest = (payload) => {
  const requiredFields = ["productId", "productName", "customerName", "phone"];
  const missingFields = requiredFields.filter((field) => {
    const value = payload?.[field];
    return typeof value !== "string" || !value.trim();
  });

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

const validatePaymentLinkRequest = (payload) => {
  const requiredFields = ["productId", "customerName", "phone", "addressLine1", "city", "state", "pincode"];
  const missingFields = requiredFields.filter((field) => {
    const value = payload?.[field];
    return typeof value !== "string" || !value.trim();
  });

  if (missingFields.length > 0) {
    return {
      isValid: false,
      missingFields,
      message: "Please fill in all required shipping details."
    };
  }

  const normalizedPhone = normalizeDigits(payload?.phone);
  if (!PHONE_PATTERN.test(normalizedPhone)) {
    return {
      isValid: false,
      missingFields: [],
      message: "Phone must be a valid 10-digit mobile number."
    };
  }

  const normalizedPincode = normalizeDigits(payload?.pincode);
  if (!PINCODE_PATTERN.test(normalizedPincode)) {
    return {
      isValid: false,
      missingFields: [],
      message: "Pincode must be a valid 6-digit code."
    };
  }

  return {
    isValid: true,
    missingFields: [],
    message: ""
  };
};

const getColumnLetter = (columnNumber) => {
  let current = columnNumber;
  let column = "";

  while (current > 0) {
    const remainder = (current - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    current = Math.floor((current - 1) / 26);
  }

  return column;
};

const buildHeaderMap = (headerRow) => headerRow.reduce((map, headerValue, index) => {
  const normalizedHeader = normalizeKey(headerValue);
  if (normalizedHeader) {
    map[normalizedHeader] = index;
  }

  return map;
}, {});

const toBase64Url = (value) =>
  btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const extractPrivateKey = (value) => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) return "";

  if (normalizedValue.startsWith("{")) {
    try {
      const parsedValue = JSON.parse(normalizedValue);
      if (typeof parsedValue.private_key === "string" && parsedValue.private_key.trim()) {
        return parsedValue.private_key;
      }
    } catch (error) {
      // Fall back to regex extraction below if the JSON blob is malformed.
    }
  }

  const privateKeyMatch = normalizedValue.match(/"private_key"\s*:\s*"([^"]+)"/);
  if (privateKeyMatch?.[1]) {
    return privateKeyMatch[1];
  }

  return normalizedValue;
};

const pemToArrayBuffer = (pem) => {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(pemContents);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
};

const getGoogleAccessToken = async (env) => {
  if (!env.GOOGLE_CLIENT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
    throw new Error("Google credentials missing");
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3600;
  const jwtHeader = {
    alg: "RS256",
    typ: "JWT"
  };
  const jwtClaimSet = {
    iss: env.GOOGLE_CLIENT_EMAIL,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: expiresAt,
    iat: issuedAt
  };
  const encodedHeader = toBase64Url(JSON.stringify(jwtHeader));
  const encodedClaimSet = toBase64Url(JSON.stringify(jwtClaimSet));
  const signingInput = `${encodedHeader}.${encodedClaimSet}`;
  const privateKey = extractPrivateKey(env.GOOGLE_PRIVATE_KEY).replace(/\\n/g, "\n");
  const signingKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    signingKey,
    new TextEncoder().encode(signingInput)
  );
  const binarySignature = String.fromCharCode(...new Uint8Array(signature));
  const assertion = `${signingInput}.${toBase64Url(binarySignature)}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  if (!response.ok) {
    throw new Error(`Google auth failed with status ${response.status}`);
  }

  const tokenData = await response.json();
  if (!tokenData.access_token) {
    throw new Error("Google auth response missing access token");
  }

  console.log("google auth success");
  return tokenData.access_token;
};

const logOrdersHeaderDiagnostics = (headerRow, headerMap) => {
  console.log("orders header row detected", headerRow);
  console.log("orders header index PaymentLinkId", headerMap[normalizeKey("PaymentLinkId")] ?? -1);
  console.log("orders header index PaymentStatus", headerMap[normalizeKey("PaymentStatus")] ?? -1);
  console.log("orders header index OrderStatus", headerMap[normalizeKey("OrderStatus")] ?? -1);
};

const fetchOrdersHeaderRow = async (env) => {
  const accessToken = await getGoogleAccessToken(env);
  const range = `${ORDERS_SHEET_NAME}!1:1`;
  const response = await fetch(`${GOOGLE_SHEETS_API_BASE_URL}/${encodeURIComponent(range)}`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Orders header lookup failed with status ${response.status}`);
  }

  const data = await response.json();
  const headerRow = Array.isArray(data.values?.[0]) ? data.values[0] : [];

  if (!headerRow.length) {
    throw new Error("Orders sheet header row not found");
  }

  const headerMap = buildHeaderMap(headerRow);
  logOrdersHeaderDiagnostics(headerRow, headerMap);

  return {
    accessToken,
    headerRow,
    headerMap
  };
};

const fetchOrdersSheetRows = async (env) => {
  const { accessToken, headerRow, headerMap } = await fetchOrdersHeaderRow(env);
  const range = `${ORDERS_SHEET_NAME}!A:${getColumnLetter(headerRow.length)}`;
  const response = await fetch(`${GOOGLE_SHEETS_API_BASE_URL}/${encodeURIComponent(range)}`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Order lookup failed with status ${response.status}`);
  }

  const data = await response.json();
  const rows = Array.isArray(data.values) ? data.values : [];

  return {
    accessToken,
    headerRow,
    headerMap,
    rows
  };
};

const buildOrdersSheetRow = (headerRow, order) => {
  const valueByHeader = {
    orderid: order.orderId,
    productid: order.productId,
    productname: order.productName,
    customername: order.customerName,
    phone: order.phone,
    email: order.email,
    city: order.city,
    state: order.state,
    orderstatus: order.orderStatus,
    paymentstatus: order.paymentStatus,
    createdat: order.createdAt,
    updatedat: order.updatedAt,
    notes: order.notes,
    source: order.source,
    amount: order.amount,
    currency: order.currency,
    paymentprovider: order.paymentProvider,
    paymentlink: order.paymentLink,
    paymentlinkid: order.paymentLinkId,
    paymentid: order.paymentId,
    paymentcapturedat: order.paymentCapturedAt,
    addressline1: order.addressLine1,
    addressline2: order.addressLine2,
    landmark: order.landmark,
    pincode: order.pincode,
    quantity: order.quantity
  };

  return headerRow.map((headerValue) => valueByHeader[normalizeKey(headerValue)] ?? "");
};

const appendOrder = async (order, env) => {
  const { accessToken, headerRow } = await fetchOrdersHeaderRow(env);
  const rowValues = buildOrdersSheetRow(headerRow, order);
  const range = `${ORDERS_SHEET_NAME}!A:${getColumnLetter(headerRow.length)}`;
  const response = await fetch(
    `${GOOGLE_SHEETS_API_BASE_URL}/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        values: [rowValues]
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Order append failed with status ${response.status}`);
  }
};

const appendPaymentLinkOrder = async (order, env) => {
  const { accessToken, headerRow } = await fetchOrdersHeaderRow(env);
  const rowValues = buildOrdersSheetRow(headerRow, order);
  const range = `${ORDERS_SHEET_NAME}!A:${getColumnLetter(headerRow.length)}`;
  const response = await fetch(
    `${GOOGLE_SHEETS_API_BASE_URL}/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        values: [rowValues]
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Payment order append failed with status ${response.status}`);
  }
};

const fetchProductById = async (productId) => {
  const products = await fetchProducts();
  const normalizedProductId = normalizeValue(productId);
  const normalizedLookupSlug = buildProductSlug(normalizedProductId);

  console.log("incoming productId", normalizedProductId);

  const product = Array.isArray(products)
    ? products.find((item) => {
      const rowProductId = normalizeValue(getRowValue(item, ["ProductId", "Product ID", "productId"]));
      const rowProductName = normalizeValue(getRowValue(item, ["Name", "ProductName", "Product Name"]));
      const rowProductSlug = buildProductSlug(rowProductName);
      return rowProductId === normalizedProductId || rowProductSlug === normalizedLookupSlug;
    })
    : null;

  if (!product) {
    const error = new Error("Product not found");
    error.status = 404;
    throw error;
  }

  const matchedProductId = normalizeValue(getRowValue(product, ["ProductId", "Product ID", "productId"]));
  const productName = normalizeValue(getRowValue(product, ["Name", "ProductName", "Product Name"]));
  const productStatus = normalizeKey(getRowValue(product, ["Product status", "ProductStatus", "Status"]));
  const stockStatus = normalizeKey(getRowValue(product, ["Stock", "Stock status", "StockStatus"]));
  const priceValue = getRowValue(product, ["Price"]);

  console.log("product status", productStatus);
  console.log("stock status", stockStatus);

  const unavailableStatuses = new Set(["soldout", "outofstock", "inactive"]);
  const isUnavailable = unavailableStatuses.has(productStatus) || unavailableStatuses.has(stockStatus);

  if (!matchedProductId || isUnavailable) {
    const error = new Error("Product not found");
    error.status = 404;
    throw error;
  }

  const amount = parsePriceToPaise(priceValue);

  console.log("matched ProductId", matchedProductId);
  console.log("matched product name", productName);
  console.log("matched price", normalizeValue(priceValue));
  console.log("product lookup success", { productId: matchedProductId });

  return {
    productId: matchedProductId,
    productName,
    amount
  };
};

const timingSafeEqual = (left, right) => {
  const leftValue = normalizeValue(left);
  const rightValue = normalizeValue(right);

  if (!leftValue || !rightValue || leftValue.length !== rightValue.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < leftValue.length; index += 1) {
    mismatch |= leftValue.charCodeAt(index) ^ rightValue.charCodeAt(index);
  }

  return mismatch === 0;
};

const computeHmacSha256Hex = async (secret, payload) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
};

const verifyRazorpayWebhookSignature = async (request, rawBody, env) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    console.error("razorpay webhook secret missing; rejecting webhook request");
    return false;
  }

  const providedSignature = request.headers.get("x-razorpay-signature") || "";
  if (!providedSignature) {
    return false;
  }

  const expectedSignature = await computeHmacSha256Hex(env.RAZORPAY_WEBHOOK_SECRET, rawBody);
  return timingSafeEqual(providedSignature, expectedSignature);
};

const toIsoTimestamp = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }

  const normalized = normalizeValue(value);
  if (!normalized) {
    return new Date().toISOString();
  }

  const numericValue = Number(normalized);
  if (Number.isFinite(numericValue)) {
    return new Date(numericValue * 1000).toISOString();
  }

  const parsedDate = new Date(normalized);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString();
  }

  return parsedDate.toISOString();
};

const buildOrderRecordFromRow = (headerRow, rowValues) => headerRow.reduce((record, headerValue, index) => {
  const value = normalizeValue(rowValues[index]);
  const normalizedHeader = normalizeKey(headerValue);

  if (headerValue) {
    record[headerValue] = value;
  }

  if (normalizedHeader && !(normalizedHeader in record)) {
    record[normalizedHeader] = value;
  }

  return record;
}, {});

const getOrderRecordValue = (orderRecord, fieldName) => {
  const normalizedField = normalizeKey(fieldName);
  return normalizeValue(orderRecord?.[fieldName] ?? orderRecord?.[normalizedField] ?? "");
};

const formatOrderAmountForTemplate = (orderRecord) => {
  const amount = getOrderRecordValue(orderRecord, "Amount");
  if (!amount) return "";

  const currency = getOrderRecordValue(orderRecord, "Currency").toUpperCase();
  if (currency === "INR" || !currency) {
    return normalizeValue(amount).replace(/^₹+\s*/u, "");
  }

  return `${currency} ${amount}`;
};

const formatOrderAmountForAdminMessage = (orderRecord) => {
  const amount = getOrderRecordValue(orderRecord, "Amount");
  if (!amount) return "";

  const currency = getOrderRecordValue(orderRecord, "Currency").toUpperCase();
  if (currency === "INR" || !currency) {
    const normalizedAmount = normalizeValue(amount).replace(/^₹+\s*/u, "");
    return normalizedAmount ? `₹${normalizedAmount}` : "";
  }

  return `${currency} ${amount}`;
};

const getOrderConfirmationTemplateFields = (env) => {
  const configuredFields = normalizeValue(env?.WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_FIELDS);
  if (!configuredFields) {
    return DEFAULT_ORDER_CONFIRMATION_TEMPLATE_FIELDS;
  }

  return configuredFields
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
};

const buildOrderConfirmationTemplateComponents = (orderRecord, env) => {
  const fieldNames = getOrderConfirmationTemplateFields(env);
  if (!fieldNames.length) {
    return [];
  }

  const missingFields = [];
  const parameters = fieldNames.map((fieldName) => {
    const value = normalizeKey(fieldName) === normalizeKey("Amount")
      ? formatOrderAmountForTemplate(orderRecord)
      : getOrderRecordValue(orderRecord, fieldName);

    if (!value) {
      missingFields.push(fieldName);
    }

    return {
      type: "text",
      text: value
    };
  });

  if (missingFields.length) {
    throw new Error(`Missing order confirmation template fields: ${missingFields.join(", ")}`);
  }

  return [
    {
      type: "body",
      parameters
    }
  ];
};

const getAdminOrderAlertTemplateFields = (env) => {
  const configuredFields = normalizeValue(env?.WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_FIELDS);
  if (!configuredFields) {
    return DEFAULT_ADMIN_ORDER_ALERT_TEMPLATE_FIELDS;
  }

  return configuredFields
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
};

const buildAdminOrderAlertTemplateComponents = (orderRecord, env) => {
  const fieldNames = getAdminOrderAlertTemplateFields(env);
  if (!fieldNames.length) {
    return [];
  }

  const missingFields = [];
  const parameters = fieldNames.map((fieldName) => {
    let value = "";
    const isEmailField = normalizeKey(fieldName) === normalizeKey("Email");

    if (normalizeKey(fieldName) === normalizeKey("Amount")) {
      value = formatOrderAmountForAdminMessage(orderRecord);
    } else {
      value = getOrderRecordValue(orderRecord, fieldName);
    }

    if (isEmailField && !normalizeValue(value)) {
      value = "No email provided";
    }

    if (!value) {
      missingFields.push(fieldName);
    }

    return {
      type: "text",
      text: value
    };
  });

  if (missingFields.length) {
    throw new Error(`Missing admin order alert template fields: ${missingFields.join(", ")}`);
  }

  return [
    {
      type: "body",
      parameters
    }
  ];
};

const getCanonicalProductPagePath = (categoryValue) => {
  const category = normalizeKey(categoryValue);
  if (category === "earrings") return "earrings.html";
  if (category === "bracelets") return "bracelets.html";
  if (category === "necklaces") return "necklaces.html";
  if (category === "combos" || category === "comboset") return "rings.html";
  return "shop.html";
};

const resolveCanonicalProductPagePathForOrder = async (orderRecord) => {
  const productId = getOrderRecordValue(orderRecord, "ProductId");
  const productName = getOrderRecordValue(orderRecord, "ProductName");
  const productSlug = buildProductSlug(productName);
  const products = await fetchProducts();

  if (!Array.isArray(products)) {
    return "shop.html";
  }

  const matchedProduct = products.find((item) => {
    const rowProductId = normalizeValue(getRowValue(item, ["ProductId", "Product ID", "productId"]));
    const rowProductName = normalizeValue(getRowValue(item, ["Name", "ProductName", "Product Name"]));
    const rowProductSlug = buildProductSlug(rowProductName);
    return rowProductId === productId || rowProductSlug === productSlug;
  });

  if (!matchedProduct) {
    return "shop.html";
  }

  const categoryValue = getRowValue(matchedProduct, ["Category", "ProductCategory", "Product Category"]);
  return getCanonicalProductPagePath(categoryValue);
};

const buildCanonicalProductUrlForOrder = async (orderRecord, env) => {
  const productName = getOrderRecordValue(orderRecord, "ProductName");
  const productAnchor = buildProductSlug(productName);
  const pagePath = await resolveCanonicalProductPagePathForOrder(orderRecord);
  const productBaseUrl = new URL(pagePath, `${stripTrailingSlash(env?.PUBLIC_SITE_URL || DEFAULT_SITE_URL)}/`);

  if (productAnchor) {
    productBaseUrl.hash = productAnchor;
  }

  return productBaseUrl.href;
};

const normalizeWhatsAppRecipient = (phone, env) => {
  const digits = normalizeDigits(phone);
  if (!digits) {
    const error = new Error("Phone is required");
    error.status = 400;
    throw error;
  }

  if (digits.length === 10) {
    const countryCode = normalizeDigits(env?.WHATSAPP_DEFAULT_COUNTRY_CODE || DEFAULT_WHATSAPP_COUNTRY_CODE);
    if (!countryCode) {
      return digits;
    }

    return `${countryCode}${digits}`;
  }

  return digits;
};

const sendWhatsAppTemplateMessage = async ({ phone, templateName, languageCode, components, env }) => {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error("WhatsApp credentials missing");
  }

  const normalizedPhone = normalizeWhatsAppRecipient(phone, env);
  const resolvedTemplateName = normalizeValue(templateName);
  const resolvedLanguageCode = normalizeValue(languageCode) || WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_LANGUAGE;
  if (!resolvedTemplateName) {
    throw new Error("WhatsApp template name is required");
  }

  const graphApiUrl = `https://graph.facebook.com/v25.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const requestPayload = {
    messaging_product: "whatsapp",
    to: normalizedPhone,
    type: "template",
    template: {
      name: resolvedTemplateName,
      language: {
        policy: "deterministic",
        code: resolvedLanguageCode
      }
    }
  };

  if (Array.isArray(components) && components.length) {
    requestPayload.template.components = components;
  }

  const response = await fetch(
    graphApiUrl,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(requestPayload)
    }
  );

  const responseText = await response.text();
  let metaResponse;

  try {
    metaResponse = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    metaResponse = {
      raw: responseText
    };
  }

  if (!response.ok) {
    const error = new Error("WhatsApp template message failed");
    error.status = response.status;
    error.metaResponse = metaResponse;
    error.requestPayload = requestPayload;
    console.error("whatsapp template send failed", {
      status: response.status,
      templateName: resolvedTemplateName,
      languageCode: resolvedLanguageCode,
      metaResponse,
      requestPayload
    });
    throw error;
  }

  return {
    requestPayload,
    metaResponse
  };
};

const sendWhatsAppTextMessage = async ({ phone, body, env }) => {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error("WhatsApp credentials missing");
  }

  const normalizedPhone = normalizeWhatsAppRecipient(phone, env);
  const messageBody = normalizeValue(body);
  if (!messageBody) {
    throw new Error("WhatsApp text body is required");
  }

  const graphApiUrl = `https://graph.facebook.com/v25.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const requestPayload = {
    messaging_product: "whatsapp",
    to: normalizedPhone,
    type: "text",
    text: {
      body: messageBody
    }
  };

  const response = await fetch(
    graphApiUrl,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(requestPayload)
    }
  );

  const responseText = await response.text();
  let metaResponse;

  try {
    metaResponse = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    metaResponse = {
      raw: responseText
    };
  }

  if (!response.ok) {
    const error = new Error("WhatsApp text message failed");
    error.status = response.status;
    error.metaResponse = metaResponse;
    error.requestPayload = requestPayload;
    throw error;
  }

  return {
    requestPayload,
    metaResponse
  };
};

const fetchOrderRowByPaymentLinkId = async (paymentLinkId, env) => {
  const { accessToken, headerRow, headerMap, rows } = await fetchOrdersSheetRows(env);
  const targetPaymentLinkId = normalizeValue(paymentLinkId);

  const paymentLinkIdIndex = headerMap[normalizeKey("PaymentLinkId")] ?? -1;
  if (paymentLinkIdIndex === -1) {
    throw new Error("PaymentLinkId column not found");
  }

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const rowPaymentLinkId = normalizeValue(row[paymentLinkIdIndex]);

    if (rowPaymentLinkId === targetPaymentLinkId) {
      return {
        accessToken,
        rowIndex: index + 1,
        headerRow,
        headerMap,
        rowValues: row,
        orderRecord: buildOrderRecordFromRow(headerRow, row)
      };
    }
  }

  throw new Error("Payment link not found");
};

const fetchMatchedOrderRowValues = async ({ paymentLinkId, env }) => fetchOrderRowByPaymentLinkId(paymentLinkId, env);

const updateOrderRowFields = async ({ paymentLinkId, updates, env }) => {
  const { accessToken, rowIndex, headerMap } = await fetchOrderRowByPaymentLinkId(paymentLinkId, env);
  const fieldsToUpdate = {
    ...updates,
    PaymentLinkId: paymentLinkId
  };

  for (const [columnName, value] of Object.entries(fieldsToUpdate)) {
    const columnIndex = headerMap[normalizeKey(columnName)] ?? -1;
    if (columnIndex === -1) {
      throw new Error(`${columnName} column not found`);
    }

    const columnLetter = getColumnLetter(columnIndex + 1);
    const updateRange = `${ORDERS_SHEET_NAME}!${columnLetter}${rowIndex}`;
    const response = await fetch(
      `${GOOGLE_SHEETS_API_BASE_URL}/${encodeURIComponent(updateRange)}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json; charset=utf-8"
        },
        body: JSON.stringify({
          values: [[value]]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Payment status update failed with status ${response.status}`);
    }
  }
};

const updatePaymentStatus = async ({ paymentLinkId, paymentId, paidAt, env }) => {
  const paidAtIso = toIsoTimestamp(paidAt);
  const updatedAt = new Date().toISOString();

  await updateOrderRowFields({
    paymentLinkId,
    updates: {
      OrderStatus: ORDER_STATUSES.CONFIRMED,
      PaymentStatus: PAYMENT_STATUSES.PAID,
      PaymentId: paymentId,
      PaymentCapturedAt: paidAtIso,
      UpdatedAt: updatedAt
    },
    env
  });

  console.log("payment status updated", { paymentLinkId, paymentId });
};

const updateExpiredPaymentStatus = async ({ paymentLinkId, env }) => {
  const updatedAt = new Date().toISOString();

  await updateOrderRowFields({
    paymentLinkId,
    updates: {
      PaymentStatus: PAYMENT_STATUSES.EXPIRED,
      UpdatedAt: updatedAt
    },
    env
  });

  console.log("payment expired updated", { paymentLinkId });
};

const sendOrderConfirmationWhatsApp = async ({ paymentLinkId, env }) => {
  const { orderRecord } = await fetchMatchedOrderRowValues({ paymentLinkId, env });
  const existingSentAt = getOrderRecordValue(orderRecord, "CustomerWhatsAppSentAt");
  if (existingSentAt) {
    console.log("order confirmation whatsapp already sent", { paymentLinkId, sentAt: existingSentAt });
    return {
      skipped: true,
      reason: "already_sent",
      sentAt: existingSentAt
    };
  }

  const paymentStatus = getOrderRecordValue(orderRecord, "PaymentStatus");
  if (paymentStatus !== PAYMENT_STATUSES.PAID) {
    throw new Error(`Payment status must be ${PAYMENT_STATUSES.PAID} before sending confirmation`);
  }

  const phone = getOrderRecordValue(orderRecord, "Phone");
  const components = buildOrderConfirmationTemplateComponents(orderRecord, env);
  const { requestPayload, metaResponse } = await sendWhatsAppTemplateMessage({
    phone,
    templateName: normalizeValue(env?.WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_NAME) || WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_NAME,
    languageCode: normalizeValue(env?.WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_LANGUAGE) || WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_LANGUAGE,
    components,
    env
  });
  const sentAt = new Date().toISOString();

  await updateOrderRowFields({
    paymentLinkId,
    updates: {
      CustomerWhatsAppSentAt: sentAt,
      LastUpdatedBy: ORDER_CONFIRMATION_UPDATED_BY,
      LastUpdatedAt: sentAt
    },
    env
  });

  console.log("order confirmation whatsapp sent", {
    paymentLinkId,
    phone: normalizeWhatsAppRecipient(phone, env)
  });

  return {
    skipped: false,
    sentAt,
    requestPayload,
    metaResponse
  };
};

const buildAdminOrderNotificationMessage = async (orderRecord, env) => {
  const orderId = getOrderRecordValue(orderRecord, "OrderId");
  const customerName = getOrderRecordValue(orderRecord, "CustomerName");
  const phone = getOrderRecordValue(orderRecord, "Phone");
  const email = getOrderRecordValue(orderRecord, "Email");
  const productId = getOrderRecordValue(orderRecord, "ProductId");
  const productName = getOrderRecordValue(orderRecord, "ProductName");
  const amount = formatOrderAmountForAdminMessage(orderRecord);
  const city = getOrderRecordValue(orderRecord, "City");
  const productLink = await buildCanonicalProductUrlForOrder(orderRecord, env);

  return [
    "🛍 New FLOAA Order",
    "",
    `Order ID: ${orderId}`,
    "",
    `Customer: ${customerName}`,
    `Phone: ${phone}`,
    `Email: ${email || "-"}`,
    "",
    `Product ID: ${productId}`,
    `Product: ${productName}`,
    `Product Link: ${productLink}`,
    "",
    `Amount: ${amount}`,
    "",
    `City: ${city}`,
    "",
    "Payment: Paid"
  ].join("\n");
};

const sendAdminOrderWhatsApp = async ({ paymentLinkId, env }) => {
  const adminPhone = normalizeValue(env?.WHATSAPP_ADMIN_PHONE);
  if (!adminPhone) {
    console.log("admin whatsapp skipped: WHATSAPP_ADMIN_PHONE not configured", { paymentLinkId });
    return {
      skipped: true,
      reason: "admin_phone_not_configured"
    };
  }

  const { orderRecord } = await fetchMatchedOrderRowValues({ paymentLinkId, env });
  const existingSentAt = getOrderRecordValue(orderRecord, "AdminWhatsAppSentAt");
  if (existingSentAt) {
    console.log("admin whatsapp already sent", { paymentLinkId, sentAt: existingSentAt });
    return {
      skipped: true,
      reason: "already_sent",
      sentAt: existingSentAt
    };
  }

  const paymentStatus = getOrderRecordValue(orderRecord, "PaymentStatus");
  if (paymentStatus !== PAYMENT_STATUSES.PAID) {
    throw new Error(`Payment status must be ${PAYMENT_STATUSES.PAID} before sending admin notification`);
  }

  const productLink = await buildCanonicalProductUrlForOrder(orderRecord, env);
  const components = buildAdminOrderAlertTemplateComponents({
    ...orderRecord,
    ProductLink: productLink,
    productlink: productLink
  }, env);
  const { requestPayload, metaResponse } = await sendWhatsAppTemplateMessage({
    phone: adminPhone,
    templateName: normalizeValue(env?.WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_NAME) || WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_NAME,
    languageCode: normalizeValue(env?.WHATSAPP_ADMIN_ORDER_ALERT_TEMPLATE_LANGUAGE)
      || normalizeValue(env?.WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_LANGUAGE)
      || WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_LANGUAGE,
    components,
    env
  });
  const sentAt = new Date().toISOString();

  await updateOrderRowFields({
    paymentLinkId,
    updates: {
      AdminWhatsAppSentAt: sentAt,
      LastUpdatedBy: ADMIN_ORDER_NOTIFICATION_UPDATED_BY,
      LastUpdatedAt: sentAt
    },
    env
  });

  console.log("admin whatsapp sent", {
    paymentLinkId,
    phone: normalizeWhatsAppRecipient(adminPhone, env),
    messageId: metaResponse?.messages?.[0]?.id || null
  });

  return {
    skipped: false,
    sentAt,
    requestPayload,
    metaResponse
  };
};

const sendTestWhatsAppMessage = async ({ phone, env }) => {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error("WhatsApp credentials missing");
  }

  const normalizedPhone = normalizeDigits(phone);
  if (!normalizedPhone) {
    const error = new Error("Phone is required");
    error.status = 400;
    throw error;
  }

  const graphApiUrl = `https://graph.facebook.com/v25.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const requestPayload = {
    messaging_product: "whatsapp",
    to: normalizedPhone,
    type: "text",
    text: {
      body: "Hello Vijay, FLOAA WhatsApp integration is working."
    }
  };

  console.log("test whatsapp graph api url", graphApiUrl);
  console.log("test whatsapp phone number id", env.WHATSAPP_PHONE_NUMBER_ID);
  console.log("test whatsapp normalized phone", normalizedPhone);
  console.log("test whatsapp request payload", JSON.stringify(requestPayload));

  const response = await fetch(
    graphApiUrl,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(requestPayload)
    }
  );

  const responseText = await response.text();
  console.log("test whatsapp meta status", response.status);
  console.log("test whatsapp meta response body", responseText);
  let metaResponse;

  try {
    metaResponse = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    metaResponse = {
      raw: responseText
    };
  }

  if (!response.ok) {
    const error = new Error("WhatsApp test message failed");
    error.status = response.status;
    error.metaResponse = metaResponse;
    throw error;
  }

  return metaResponse;
};

const fetchTestWhatsAppMessageStatus = async ({ messageId, env }) => {
  if (!env.WHATSAPP_ACCESS_TOKEN) {
    throw new Error("WhatsApp credentials missing");
  }

  const normalizedMessageId = normalizeValue(messageId);
  if (!normalizedMessageId) {
    const error = new Error("Message ID is required");
    error.status = 400;
    throw error;
  }

  const graphApiUrl = `https://graph.facebook.com/v25.0/${encodeURIComponent(normalizedMessageId)}`;
  console.log("test whatsapp status graph api url", graphApiUrl);
  console.log("test whatsapp status message id", normalizedMessageId);

  const response = await fetch(graphApiUrl, {
    method: "GET",
    headers: {
      authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`
    }
  });

  const responseText = await response.text();
  console.log("test whatsapp status meta status", response.status);
  console.log("test whatsapp status meta response body", responseText);

  let metaResponse;

  try {
    metaResponse = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    metaResponse = {
      raw: responseText
    };
  }

  if (!response.ok) {
    const error = new Error("WhatsApp status lookup failed");
    error.status = response.status;
    error.metaResponse = metaResponse;
    throw error;
  }

  return metaResponse;
};

const createRazorpayPaymentLink = async ({ orderId, product, customer, env, callbackUrl }) => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials missing");
  }

  const razorpayPayload = {
    amount: product.amount,
    currency: "INR",
    accept_partial: false,
    reference_id: orderId,
    description: `FLOAA order ${orderId} for ${product.productName}`,
    customer: {
      name: customer.customerName,
      contact: customer.phone,
      email: customer.email || undefined
    },
    notify: {
      sms: true,
      email: Boolean(customer.email)
    },
    options: {
      checkout: {
        prefill: {
          name: customer.customerName,
          email: customer.email || undefined,
          contact: customer.phone
        }
      }
    },
    reminder_enable: true,
    callback_url: callbackUrl,
    callback_method: "get",
    notes: {
      orderId,
      productId: product.productId,
      productName: product.productName,
      city: customer.city || "",
      state: customer.state || ""
    }
  };

  const response = await fetch(RAZORPAY_PAYMENT_LINKS_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`,
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(razorpayPayload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      "razorpay payment link error",
      {
        status: response.status,
        body: errorBody,
        orderId,
        productId: product.productId,
        amount: product.amount
      }
    );
    throw new Error(`Razorpay payment link creation failed: ${errorBody}`);
  }

  const paymentLink = await response.json();
  if (!paymentLink.id || !paymentLink.short_url) {
    throw new Error("Razorpay payment link response missing required fields");
  }

  console.log("payment link created", { orderId, paymentLinkId: paymentLink.id });

  return {
    paymentLinkId: paymentLink.id,
    paymentUrl: paymentLink.short_url
  };
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && (url.pathname === "/orders" || url.pathname === "/create-payment-link" || url.pathname === "/razorpay-webhook" || url.pathname === "/whatsapp-webhook" || url.pathname === "/test-whatsapp" || url.pathname === "/test-whatsapp-status" || url.pathname === "/api/products")) {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request)
      });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return Response.json({
        status: "ok",
        service: env.APP_NAME || "floaa-api"
      });
    }

    if (request.method === "GET" && url.pathname === "/whatsapp-webhook") {
      const hubMode = url.searchParams.get("hub.mode") || "";
      const hubVerifyToken = url.searchParams.get("hub.verify_token") || "";
      const hubChallenge = url.searchParams.get("hub.challenge") || "";

      if (hubMode === "subscribe" && hubVerifyToken && hubVerifyToken === env.WHATSAPP_VERIFY_TOKEN) {
        console.log("whatsapp webhook verified");
        return new Response(hubChallenge, {
          status: 200,
          headers: request ? getCorsHeaders(request) : {}
        });
      }

      return new Response("Forbidden", {
        status: 403,
        headers: request ? getCorsHeaders(request) : {}
      });
    }

    if (request.method === "POST" && url.pathname === "/whatsapp-webhook") {
      let payload;

      try {
        payload = await request.json();
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Invalid WhatsApp webhook payload"
          },
          { status: 400 },
          request
        );
      }

      console.log("whatsapp webhook received");
      console.log("object", normalizeValue(payload?.object));
      console.log("entry count", Array.isArray(payload?.entry) ? payload.entry.length : 0);

      return jsonResponse(
        {
          success: true
        },
        {},
        request
      );
    }

    if (request.method === "POST" && url.pathname === "/test-whatsapp") {
      console.log("test whatsapp request received");

      let payload;

      try {
        payload = await request.json();
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid JSON request body"
          },
          { status: 400 },
          request
        );
      }

      const phone = typeof payload?.phone === "string" ? payload.phone.trim() : "";
      if (!phone) {
        return jsonResponse(
          {
            success: false,
            error: "Phone is required"
          },
          { status: 400 },
          request
        );
      }

      try {
        const metaResponse = await sendTestWhatsAppMessage({
          phone,
          env
        });

        console.log("test whatsapp message sent", { phone: normalizeDigits(phone) });

        return jsonResponse(
          {
            success: true,
            metaResponse
          },
          {},
          request
        );
      } catch (error) {
        console.error("test whatsapp send failed", {
          message: error?.message || "Unknown error",
          status: error?.status,
          metaResponse: error?.metaResponse || null
        });

        return jsonResponse(
          {
            success: false,
            error: error?.metaResponse || error?.message || "Unable to send test WhatsApp message"
          },
          { status: error?.status || 500 },
          request
        );
      }
    }

    if (request.method === "GET" && url.pathname === "/test-whatsapp-status") {
      console.log("test whatsapp status request received");

      const messageId = url.searchParams.get("id") || "";
      if (!messageId) {
        return jsonResponse(
          {
            success: false,
            error: "Message ID is required"
          },
          { status: 400 },
          request
        );
      }

      try {
        const metaResponse = await fetchTestWhatsAppMessageStatus({
          messageId,
          env
        });

        return jsonResponse(
          {
            success: true,
            metaResponse
          },
          {},
          request
        );
      } catch (error) {
        console.error("test whatsapp status lookup failed", {
          message: error?.message || "Unknown error",
          status: error?.status,
          metaResponse: error?.metaResponse || null
        });

        return jsonResponse(
          {
            success: false,
            error: error?.metaResponse || error?.message || "Unable to fetch WhatsApp message status"
          },
          { status: error?.status || 500 },
          request
        );
      }
    }

    if (request.method === "GET" && url.pathname === "/products") {
      console.log("/products request received");

      try {
        const products = await fetchProducts();

        return jsonResponse(
          {
            success: true,
            count: Array.isArray(products) ? products.length : 0,
            products
          },
          {},
          request
        );
      } catch (error) {
        console.error("product fetch failure", error);

        return jsonResponse(
          {
            success: false,
            message: "Unable to fetch products"
          },
          { status: 500 },
          request
        );
      }
    }

    if (request.method === "GET" && url.pathname === "/api/products") {
      console.log("api products request received");

      try {
        const products = await fetchProducts();
        console.log("api products fetch success", {
          count: products.length
        });

        return new Response(JSON.stringify(products), {
          status: 200,
          headers: buildProductsResponseHeaders(request, {
            "x-floaa-products-source": "opensheet"
          })
        });
      } catch (error) {
        const errorType = error?.type || "fetch-failed";
        const errorMessage = error?.message || "Unknown error";
        const errorStatus = Number.isFinite(error?.status) ? error.status : null;
        const errorContentType = error?.contentType || "";
        const errorBodyPreview = normalizeValue(error?.bodyPreview || "").slice(0, 500);
        const isArrayPayload = typeof error?.isArrayPayload === "boolean" ? error.isArrayPayload : null;
        const errorHeaderValue = errorType === "invalid-payload" ? "invalid-payload" : errorType;
        const responseMessage = errorType === "invalid-payload"
          ? "Invalid products response"
          : "Unable to fetch products";

        console.error("api products fetch failed", {
          type: errorType,
          upstreamStatus: errorStatus,
          contentType: errorContentType,
          message: errorMessage,
          bodyPreview: errorBodyPreview,
          isArrayPayload
        });

        return new Response(JSON.stringify({
          success: false,
          message: responseMessage
        }), {
          status: 502,
          headers: buildProductsResponseHeaders(request, {
            "x-floaa-products-error": errorHeaderValue
          })
        });
      }
    }

    if (request.method === "POST" && url.pathname === "/orders") {
      console.log("order request received");

      let payload;

      try {
        payload = await request.json();
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Invalid JSON request body"
          },
          { status: 400 },
          request
        );
      }

      const validation = validateOrderRequest(payload);
      if (!validation.isValid) {
        return jsonResponse(
          {
            success: false,
            message: "Missing required fields",
            missingFields: validation.missingFields
          },
          { status: 400 },
          request
        );
      }

      try {
        const orderId = generateOrderId();
        const createdAt = new Date().toISOString();
        const updatedAt = createdAt;
        const order = {
          orderId,
          productId: payload.productId,
          productName: payload.productName,
          customerName: payload.customerName,
          phone: payload.phone,
          email: typeof payload.email === "string" ? payload.email.trim() : "",
          city: typeof payload.city === "string" ? payload.city.trim() : "",
          state: typeof payload.state === "string" ? payload.state.trim() : "",
          orderStatus: ORDER_STATUSES.CREATED,
          paymentStatus: PAYMENT_STATUSES.CREATED,
          createdAt,
          updatedAt,
          notes: "",
          source: "Website"
        };

        await appendOrder(order, env);
        console.log("order write success", { orderId: order.orderId });

        return jsonResponse(
          {
            success: true,
            orderId: order.orderId,
            message: "Order received"
          },
          {},
          request
        );
      } catch (error) {
        console.error("order write failure", error);
        return jsonResponse(
          {
            success: false,
            message: "Unable to create order"
          },
          { status: 500 },
          request
        );
      }
    }

    if (request.method === "POST" && url.pathname === "/create-payment-link") {
      console.log("payment link request received");

      let payload;

      try {
        payload = await request.json();
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Invalid JSON request body"
          },
          { status: 400 },
          request
        );
      }

      const validation = validatePaymentLinkRequest(payload);
      if (!validation.isValid) {
        return jsonResponse(
          {
            success: false,
            message: validation.message || "Missing required fields",
            missingFields: validation.missingFields
          },
          { status: 400 },
          request
        );
      }

      try {
        const product = await fetchProductById(payload.productId);
        const orderId = generateOrderId();
        const callbackBaseUrl = getCheckoutCallbackBaseUrl(request, env);
        const createdAt = new Date().toISOString();
        const updatedAt = createdAt;
        const customer = {
          customerName: payload.customerName.trim(),
          phone: normalizeDigits(payload.phone),
          email: typeof payload.email === "string" ? payload.email.trim() : "",
          addressLine1: payload.addressLine1.trim(),
          addressLine2: typeof payload.addressLine2 === "string" ? payload.addressLine2.trim() : "",
          landmark: typeof payload.landmark === "string" ? payload.landmark.trim() : "",
          city: typeof payload.city === "string" ? payload.city.trim() : "",
          state: typeof payload.state === "string" ? payload.state.trim() : "",
          pincode: normalizeDigits(payload.pincode)
        };
        const paymentLink = await createRazorpayPaymentLink({
          orderId,
          product,
          customer,
          env,
          callbackUrl: `${callbackBaseUrl}/order-success/index.html`
        });
        const order = {
          orderId,
          productId: product.productId,
          productName: product.productName,
          customerName: customer.customerName,
          phone: customer.phone,
          email: customer.email,
          addressLine1: customer.addressLine1,
          addressLine2: customer.addressLine2,
          landmark: customer.landmark,
          city: customer.city,
          state: customer.state,
          pincode: customer.pincode,
          orderStatus: ORDER_STATUSES.CREATED,
          paymentStatus: PAYMENT_STATUSES.CREATED,
          createdAt,
          updatedAt,
          notes: "",
          source: "Website",
          amount: product.amount / 100,
          currency: "INR",
          paymentProvider: "Razorpay",
          paymentLink: paymentLink.paymentUrl,
          paymentLinkId: paymentLink.paymentLinkId,
          paymentId: "",
          paymentCapturedAt: "",
          quantity: 1
        };

        await appendPaymentLinkOrder(order, env);

        return jsonResponse(
          {
            success: true,
            orderId,
            paymentUrl: paymentLink.paymentUrl
          },
          {},
          request
        );
      } catch (error) {
        if (error?.status === 404) {
          return jsonResponse(
            {
              success: false,
              message: "Product not found"
            },
            { status: 404 },
            request
          );
        }

        if (typeof error?.message === "string" && error.message.includes("Razorpay payment link creation failed:")) {
          return jsonResponse(
            {
              success: false,
              message: error.message
            },
            { status: 500 },
            request
          );
        }

        console.error("payment link failure", error);

        return jsonResponse(
          {
            success: false,
            message: "Unable to create payment link"
          },
          { status: 500 },
          request
        );
      }
    }

    if (request.method === "POST" && url.pathname === "/razorpay-webhook") {
      console.log("webhook received");
      const rawBody = await request.text();
      let payload;

      try {
        payload = JSON.parse(rawBody);
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Invalid webhook payload"
          },
          { status: 400 },
          request
        );
      }

      const isSignatureValid = await verifyRazorpayWebhookSignature(request, rawBody, env);
      if (!isSignatureValid) {
        return jsonResponse(
          {
            success: false,
            message: "Invalid webhook signature"
          },
          { status: 401 },
          request
        );
      }

      console.log("webhook signature verified");

      if (payload?.event === "payment_link.paid") {
        const paymentLinkId = normalizeValue(payload?.payload?.payment_link?.entity?.id);
        const paymentId = normalizeValue(payload?.payload?.payment?.entity?.id);
        const paidAt = payload?.payload?.payment_link?.entity?.paid_at
          || payload?.payload?.payment?.entity?.captured_at
          || payload?.payload?.payment?.entity?.created_at;

        if (!paymentLinkId || !paymentId) {
          return jsonResponse(
            {
              success: false,
              message: "Webhook payload missing payment details"
            },
            { status: 400 },
            request
          );
        }

        try {
          await updatePaymentStatus({
            paymentLinkId,
            paymentId,
            paidAt,
            env
          });
          await sendOrderConfirmationWhatsApp({
            paymentLinkId,
            env
          });

          try {
            await sendAdminOrderWhatsApp({
              paymentLinkId,
              env
            });
          } catch (error) {
            console.error("admin whatsapp failure", error);
          }
        } catch (error) {
          console.error("payment link failure", {
            message: error?.message || "Unknown error",
            status: error?.status,
            metaResponse: error?.metaResponse || null,
            requestPayload: error?.requestPayload || null
          });
          return jsonResponse(
            {
              success: false,
              message: "Unable to process paid payment link"
            },
            { status: 500 },
            request
          );
        }
      }

      if (payload?.event === "payment_link.expired") {
        const paymentLinkId = normalizeValue(payload?.payload?.payment_link?.entity?.id);

        if (!paymentLinkId) {
          return jsonResponse(
            {
              success: false,
              message: "Webhook payload missing payment link id"
            },
            { status: 400 },
            request
          );
        }

        try {
          await updateExpiredPaymentStatus({
            paymentLinkId,
            env
          });
        } catch (error) {
          console.error("payment link expiry failure", error);
          return jsonResponse(
            {
              success: false,
              message: "Unable to update expired payment status"
            },
            { status: 500 },
            request
          );
        }
      }

      return jsonResponse(
        {
          success: true
        },
        {},
        request
      );
    }

    return new Response("Not Found", { status: 404 });
  }
};

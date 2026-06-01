const PRODUCTS_URL = "https://opensheet.elk.sh/1ZQzgsE-Yv7Ad6_t29hWi2UXe549YXcBu3dD_jEjygfs/1";
const SPREADSHEET_ID = "1ZQzgsE-Yv7Ad6_t29hWi2UXe549YXcBu3dD_jEjygfs";
const ORDERS_SHEET_NAME = "Orders";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const RAZORPAY_PAYMENT_LINKS_URL = "https://api.razorpay.com/v1/payment_links";
const GOOGLE_SHEETS_API_BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values`;
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

const fetchProducts = async () => {
  console.log("product fetch started");

  const response = await fetch(PRODUCTS_URL);
  if (!response.ok) {
    throw new Error(`Products request failed with status ${response.status}`);
  }

  const products = await response.json();
  console.log("product fetch success");
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

  return {
    accessToken,
    headerRow
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
  const accessToken = await getGoogleAccessToken(env);
  const range = `${ORDERS_SHEET_NAME}!A:N`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        values: [[
          order.orderId,
          order.productId,
          order.productName,
          order.customerName,
          order.phone,
          order.email,
          order.city,
          order.state,
          order.orderStatus,
          order.paymentStatus,
          order.createdAt,
          order.updatedAt,
          order.notes,
          order.source
        ]]
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
    return true;
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

const fetchOrderRowByPaymentLinkId = async (paymentLinkId, env) => {
  const accessToken = await getGoogleAccessToken(env);
  const range = `${ORDERS_SHEET_NAME}!A:V`;
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
  const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
  const targetPaymentLinkId = normalizeValue(paymentLinkId);

  const paymentLinkIdIndex = headerRow.findIndex((value) => normalizeKey(value) === normalizeKey("PaymentLinkId"));
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
        headerRow
      };
    }
  }

  throw new Error("Payment link not found");
};

const updateOrderRowFields = async ({ paymentLinkId, updates, env }) => {
  const { accessToken, rowIndex, headerRow } = await fetchOrderRowByPaymentLinkId(paymentLinkId, env);
  const fieldsToUpdate = {
    ...updates,
    PaymentLinkId: paymentLinkId
  };

  for (const [columnName, value] of Object.entries(fieldsToUpdate)) {
    const columnIndex = headerRow.findIndex((headerValue) => normalizeKey(headerValue) === normalizeKey(columnName));
    if (columnIndex === -1) {
      throw new Error(`${columnName} column not found`);
    }

    const columnLetter = String.fromCharCode(65 + columnIndex);
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

const createRazorpayPaymentLink = async ({ orderId, product, customer, env }) => {
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
    reminder_enable: true,
    callback_url: "https://floaa.in/order-success",
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

    if (request.method === "OPTIONS" && (url.pathname === "/orders" || url.pathname === "/create-payment-link" || url.pathname === "/razorpay-webhook")) {
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
          env
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
        } catch (error) {
          console.error("payment link failure", error);
          return jsonResponse(
            {
              success: false,
              message: "Unable to update payment status"
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

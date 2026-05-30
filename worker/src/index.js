const PRODUCTS_URL = "https://opensheet.elk.sh/1ZQzgsE-Yv7Ad6_t29hWi2UXe549YXcBu3dD_jEjygfs/1";
const SPREADSHEET_ID = "1ZQzgsE-Yv7Ad6_t29hWi2UXe549YXcBu3dD_jEjygfs";
const ORDERS_SHEET_NAME = "Orders";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const jsonResponse = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8"
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

const generateOrderId = () => {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");
  return `FLOAA-${year}${month}${day}-${hours}${minutes}${seconds}`;
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

const toBase64Url = (value) =>
  btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const pemToArrayBuffer = (pem) => {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
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
  const privateKey = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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

        return jsonResponse({
          success: true,
          count: Array.isArray(products) ? products.length : 0,
          products
        });
      } catch (error) {
        console.error("product fetch failure", error);

        return jsonResponse(
          {
            success: false,
            message: "Unable to fetch products"
          },
          { status: 500 }
        );
      }
    }

    if (request.method === "POST" && url.pathname === "/orders") {
      console.log("order request received");

      if (env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
        console.log("Google credentials configured");
      } else {
        console.log("Google credentials missing");
      }

      let payload;

      try {
        payload = await request.json();
      } catch (error) {
        console.log("validation failure");
        return jsonResponse(
          {
            success: false,
            message: "Invalid JSON request body"
          },
          { status: 400 }
        );
      }

      const validation = validateOrderRequest(payload);
      if (!validation.isValid) {
        console.log("validation failure");
        return jsonResponse(
          {
            success: false,
            message: "Missing required fields",
            missingFields: validation.missingFields
          },
          { status: 400 }
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
          orderStatus: "Created",
          paymentStatus: "Pending",
          createdAt,
          updatedAt,
          notes: "",
          source: "Website"
        };

        console.log("order generated", { orderId: order.orderId });
        await appendOrder(order, env);
        console.log("order write success", { orderId: order.orderId });

        return jsonResponse({
          success: true,
          orderId: order.orderId,
          message: "Order received"
        });
      } catch (error) {
        console.error("order write failure", error);
        return jsonResponse(
          {
            success: false,
            message: "Unable to create order"
          },
          { status: 500 }
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};

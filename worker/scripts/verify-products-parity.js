#!/usr/bin/env node

const OPENSHEET_URL = process.env.OPEN_SHEET_URL
  || "https://opensheet.elk.sh/1ZQzgsE-Yv7Ad6_t29hWi2UXe549YXcBu3dD_jEjygfs/1";
const GOOGLE_PRODUCTS_URL = process.env.GOOGLE_PRODUCTS_URL
  || "http://127.0.0.1:8788/api/products";

const fail = (message) => {
  console.error(message);
  process.exitCode = 1;
};

const fetchJson = async (url, label) => {
  const response = await fetch(url);
  const text = await response.text();
  let json;

  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${error.message}`);
  }

  return {
    response,
    json
  };
};

const formatValue = (value) => JSON.stringify(value);

const compareKeyOrder = (leftKeys, rightKeys) => {
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key, index) => key === rightKeys[index]);
};

const main = async () => {
  const opensheetResult = await fetchJson(OPENSHEET_URL, "OpenSheet");
  const googleResult = await fetchJson(GOOGLE_PRODUCTS_URL, "Google products implementation");

  if (!Array.isArray(opensheetResult.json)) {
    throw new Error("OpenSheet payload is not an array");
  }

  if (!Array.isArray(googleResult.json)) {
    throw new Error("Google products payload is not an array");
  }

  const opensheetProducts = opensheetResult.json;
  const googleProducts = googleResult.json;

  console.log(`OpenSheet count: ${opensheetProducts.length}`);
  console.log(`Google count: ${googleProducts.length}`);
  console.log(`Google headers: source=${googleResult.response.headers.get("x-floaa-products-source") || ""} cache=${googleResult.response.headers.get("x-floaa-products-cache") || ""} count=${googleResult.response.headers.get("x-floaa-products-count") || ""} fetch-ms=${googleResult.response.headers.get("x-floaa-products-fetch-ms") || ""} version=${googleResult.response.headers.get("x-floaa-products-version") || ""}`);

  const differences = [];

  if (opensheetProducts.length !== googleProducts.length) {
    differences.push(`Product count differs: OpenSheet=${opensheetProducts.length}, Google=${googleProducts.length}`);
  }

  const maxLength = Math.max(opensheetProducts.length, googleProducts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const opensheetProduct = opensheetProducts[index];
    const googleProduct = googleProducts[index];

    if (!opensheetProduct || !googleProduct) {
      differences.push(`Product order differs at index ${index}: OpenSheet=${formatValue(opensheetProduct)}, Google=${formatValue(googleProduct)}`);
      continue;
    }

    const opensheetProductId = opensheetProduct.ProductId || `(index ${index})`;
    const opensheetKeys = Object.keys(opensheetProduct);
    const googleKeys = Object.keys(googleProduct);

    if (!compareKeyOrder(opensheetKeys, googleKeys)) {
      differences.push(`Key order or key names differ for ${opensheetProductId}: OpenSheet=${formatValue(opensheetKeys)}, Google=${formatValue(googleKeys)}`);
    }

    const allKeys = Array.from(new Set([...opensheetKeys, ...googleKeys]));
    for (const key of allKeys) {
      const leftHasKey = Object.prototype.hasOwnProperty.call(opensheetProduct, key);
      const rightHasKey = Object.prototype.hasOwnProperty.call(googleProduct, key);

      if (!leftHasKey || !rightHasKey) {
        differences.push(`Missing key for ${opensheetProductId}: key=${key}, OpenSheetHas=${leftHasKey}, GoogleHas=${rightHasKey}`);
        continue;
      }

      if (opensheetProduct[key] !== googleProduct[key]) {
        differences.push(`Value differs for ${opensheetProductId}, key=${key}: OpenSheet=${formatValue(opensheetProduct[key])}, Google=${formatValue(googleProduct[key])}`);
      }
    }
  }

  if (differences.length) {
    fail("Products parity check failed.");
    differences.slice(0, 50).forEach((difference) => console.error(`- ${difference}`));
    if (differences.length > 50) {
      console.error(`- ...and ${differences.length - 50} more differences`);
    }
    return;
  }

  console.log("Products parity check passed with zero differences.");
};

main().catch((error) => {
  fail(error.stack || error.message);
});

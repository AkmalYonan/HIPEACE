const axios = require("axios");
const crypto = require("crypto");
const config = require("./config.json");

const tripayConfig = {
  mode: config.tripayMode,
  apiKey: config.tripayApiKey,
  privateKey: config.tripayPrivateKey,
  merchantCode: config.tripayMerchantCode,
  baseUrl:
    config.tripayMode === "production"
      ? "https://tripay.co.id/api"
      : "https://tripay.co.id/api-sandbox",
};

async function createQrisTransaction(product, discordUserTag) {
  const merchantRef = `discord_${product.id}_${Date.now()}`;
  const amount = parseInt(product.price);

  // Data request
  const data = {
    method: "QRIS",
    merchant_ref: merchantRef,
    amount: amount,
    merchant_code: tripayConfig.merchantCode,
    customer_name: discordUserTag,
    customer_email: "user@discord.com",
    order_items: [
      {
        sku: String(product.id),
        name: product.name,
        price: amount,
        quantity: 1,
      },
    ],
    signature: "",
  };

  // --- PERHITUNGAN SIGNATURE (HMAC SHA256) ---
  const merchantCode = String(tripayConfig.merchantCode).trim();
  const privateKey = String(tripayConfig.privateKey).trim();
  const amountStr = String(amount);

  // Rumus yang Anda minta: merchant_code + merchant_ref + amount
  const rawSignature = merchantCode + merchantRef + amountStr;

  // Hash menggunakan HMAC SHA256 dengan privateKey
  const signatureHash = crypto
    .createHmac("sha256", privateKey)
    .update(rawSignature)
    .digest("hex");

  console.log("=== TRIPAY DEBUG SIGNATURE (SHA256) ===");
  console.log("Merchant Code:", merchantCode);
  console.log("Merchant Ref:", merchantRef);
  console.log("Amount:", amountStr);
  console.log("Raw String:", rawSignature);
  console.log("Calculated Signature:", signatureHash);
  console.log("=========================================");

  data.signature = signatureHash;

  try {
    const response = await axios.post(
      `${tripayConfig.baseUrl}/transaction/create`,
      data,
      {
        headers: {
          Authorization: `Bearer ${tripayConfig.apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data.success) {
      const transactionData = response.data.data;
      return {
        status: true,
        token: transactionData.uuid,
        qr_string: transactionData.qr_string,
        qr_url: transactionData.qr_url,
        checkout_url: transactionData.checkout_url,
        amount: transactionData.amount,
        merchant_ref: transactionData.merchant_ref,
        raw_response: transactionData,
      };
    } else {
      throw new Error(response.data.message);
    }
  } catch (err) {
    console.error(
      "[TRIPAY ERROR]",
      err.response ? err.response.data : err.message,
    );
    throw err;
  }
}

module.exports = { createQrisTransaction };

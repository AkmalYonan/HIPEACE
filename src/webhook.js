const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const config = require("./config/config.json");
const { EmbedBuilder } = require("discord.js");

const {
  createTransaction,
  getTransactionByRef,
  updateTransactionStatus,
} = require("./database/transactions");
const client = require("./core/client");
const { updateStock, getActiveProducts } = require("./database/products");

const app = express();
app.use(bodyParser.json());

app.post("/webhook/tripay", (req, res) => {
  console.log("🔥 WEBHOOK MASUK");
  console.log("📦 BODY:", req.body);

  const callbackSignature = req.header("X-Callback-Signature");

  const localSignature = crypto
    .createHmac("sha256", config.tripayPrivateKey)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (callbackSignature !== localSignature) {
    console.log("❌ SIGNATURE TIDAK VALID");
    return res.status(403).json({ success: false });
  }

  console.log("✅ SIGNATURE VALID");
  console.log("🚀 MEMANGGIL handleTripayWebhook");

  res.status(200).json({ success: true });

  handleTripayWebhook(req.body)
    .then(() => console.log("🎉 handleTripayWebhook SELESAI"))
    .catch((err) => console.error("🔥 handleTripayWebhook ERROR", err));
});

async function handleTripayWebhook(data) {
  const status = String(data.status || "")
    .trim()
    .toUpperCase();
  const merchantRef = data.merchant_ref;

  console.log("🔎 STATUS DITERIMA:", status);
  console.log("🧾 MERCHANT_REF:", merchantRef);

  if (!merchantRef) {
    console.error("❌ merchant_ref kosong");
    return;
  }

  // Ambil transaksi dari DB
  const trx = await getTransactionByRef(merchantRef);

  if (!trx) {
    console.error("❌ TRANSAKSI TIDAK DITEMUKAN:", merchantRef);
    return;
  }

  /* =====================================================
     STATUS: PAID
  ===================================================== */
  if (status === "PAID") {
    if (trx.status === "PAID") {
      console.log("🔁 TRANSAKSI SUDAH PAID, SKIP:", merchantRef);
      return;
    }

    console.log("🟢 UPDATE TRANSAKSI KE PAID:", merchantRef);

    // 1️⃣ Update status transaksi
    await updateTransactionStatus(merchantRef, "PAID");

    // 2️⃣ Kurangi stok
    await updateStock(trx.product_id, -1);

    // 3️⃣ DM User
    try {
      const user = await client.users.fetch(trx.user_id);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71) // hijau = sukses
        .setTitle("✅ Pembayaran Berhasil")
        .setDescription(
          "Terima kasih, pembayaran kamu telah **berhasil diproses** 🎉\n" +
            "Berikut detail transaksinya:",
        )
        .addFields(
          {
            name: "🧾 Reference ID",
            value: `\`${merchantRef}\``,
            inline: false,
          },
          {
            name: "💰 Jumlah Pembayaran",
            value: `Rp ${Number(trx.amount).toLocaleString("id-ID")}`,
            inline: true,
          },
          {
            name: "📦 Status",
            value: "PAID",
            inline: true,
          },
        )
        .setFooter({
          text: "Terima kasih telah bertransaksi 🙏",
        })
        .setTimestamp();

      await user.send({ embeds: [embed] });

      console.log(`📩 DM terkirim ke user ${trx.user_id}`);
    } catch (err) {
      console.error("❌ Gagal DM user:", err.message);
    }

    console.log(`✅ TRANSAKSI SELESAI | ${merchantRef}`);
    return;
  }

  /* =====================================================
     STATUS: UNPAID / PENDING
  ===================================================== */
  if (status === "UNPAID" || status === "PENDING") {
    if (trx.status !== "UNPAID") {
      console.log("🟡 UPDATE STATUS KE UNPAID:", merchantRef);
      await updateTransactionStatus(merchantRef, "UNPAID");
    }

    console.log("⏳ MENUNGGU PEMBAYARAN:", merchantRef);
    return;
  }

  /* =====================================================
     STATUS: EXPIRED / FAILED
  ===================================================== */
  if (status === "EXPIRED" || status === "FAILED") {
    console.log("⛔ TRANSAKSI EXPIRED:", merchantRef);

    await updateTransactionStatus(merchantRef, "EXPIRED");
    return;
  }

  /* =====================================================
     STATUS TIDAK DIKENAL
  ===================================================== */
  console.warn("⚠️ STATUS TIDAK DIKENAL:", status);
}

process.on("unhandledRejection", (err) => {
  console.error("🔥 UNHANDLED REJECTION", err);
});

process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION", err);
});

app.post("/ping", (req, res) => {
  res.json({ pong: true });
});

function startWebhook() {
  app.listen(3000, () => console.log("🚀 Webhook Tripay aktif di port 3000"));
}

module.exports = { startWebhook };

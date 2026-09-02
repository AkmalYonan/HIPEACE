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
const { updateStock, getProductById } = require("./database/products");
const { getLogChannel } = require("./database/botSettings");
const { getAdminRole } = require("./database/adminRoles");
const { getAllActiveShopMessages } = require("./database/shopMessages");
const { buildShopMessage } = require("./utils/shopEmbed");

const app = express();

app.use(bodyParser.json());

// ─────────────────────────────────────────────────────────────────────────────
// Helper: send an announcement embed to the configured log channel
// ─────────────────────────────────────────────────────────────────────────────
async function sendLogAnnouncement(guildId, logType, embed) {
  try {
    const setting = await getLogChannel(guildId, logType);
    if (!setting) return; // no channel configured for this type

    const channel = await client.channels
      .fetch(setting.channel_id)
      .catch(() => null);
    if (!channel) {
      console.warn(
        `⚠️  Channel ${setting.channel_id} not found for log type '${logType}'`,
      );
      return;
    }

    // Resolve mention string if admin_type is set
    let mentionStr = "";
    if (setting.admin_type) {
      const roleRow = await getAdminRole(guildId, setting.admin_type);
      if (roleRow) mentionStr = `<@&${roleRow.roles_id}> `;
    }

    await channel.send({ content: mentionStr || undefined, embeds: [embed] });
    console.log(
      `📣 Log '${logType}' terkirim ke channel ${setting.channel_id}`,
    );
  } catch (err) {
    console.error(`❌ Gagal kirim log '${logType}':`, err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook endpoint
// ─────────────────────────────────────────────────────────────────────────────
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

  res.status(200).json({ success: true });

  handleTripayWebhook(req.body)
    .then(() => console.log("🎉 handleTripayWebhook SELESAI"))
    .catch((err) => console.error("🔥 handleTripayWebhook ERROR", err));
});

// ─────────────────────────────────────────────────────────────────────────────
// Core handler
// ─────────────────────────────────────────────────────────────────────────────
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

  const trx = await getTransactionByRef(merchantRef);
  if (!trx) {
    console.error("❌ TRANSAKSI TIDAK DITEMUKAN:", merchantRef);
    return;
  }

  // We need the guild_id to look up log channels.
  // Fetch it from the guild the bot is primarily in (first guild).
  const guild = client.guilds.cache.first();
  const guildId = guild?.id || null;

  /* ===================================================================
     STATUS: PAID
  =================================================================== */
  if (status === "PAID") {
    if (trx.status === "PAID") {
      console.log("🔁 TRANSAKSI SUDAH PAID, SKIP:", merchantRef);
      return;
    }

    console.log("🟢 UPDATE TRANSAKSI KE PAID:", merchantRef);

    await updateTransactionStatus(merchantRef, "PAID");
    await updateStock(trx.product_id, -1);

    // ── Auto Live-Refresh Shop Messages ─────────────────────────
    try {
      const product = await getProductById(trx.product_id);
      if (product && product.category_id) {
        const shopRows = await getAllActiveShopMessages();
        for (const shopRow of shopRows) {
          try {
            const channel = await client.channels
              .fetch(shopRow.channel_id)
              .catch(() => null);
            if (!channel) continue;

            const msg = await channel.messages
              .fetch(shopRow.message_id)
              .catch(() => null);
            if (!msg || !msg.components?.length) continue;

            // Check if this message belongs to the affected category
            const firstButton = msg.components[0]?.components[0];
            const customId = firstButton?.customId || "";
            // customId pattern: shop_prev_<catId>_<page> or buy_cat_<catId>_<page> or shop_refresh_<catId>_<page>
            const parts = customId.split("_");
            if (parts.length >= 4) {
              const msgCatId = parseInt(parts[2], 10);
              const msgPage = parseInt(parts[3], 10) || 1;
              if (msgCatId === product.category_id) {
                const refreshedData = await buildShopMessage(msgCatId, msgPage);
                await msg.edit({
                  embeds: refreshedData.embeds,
                  components: refreshedData.components,
                });
                console.log(`🔄 Auto-refreshed shop message ${msg.id} in #${channel.name}`);
              }
            }
          } catch (err) {
            console.warn(`[SHOP REFRESH WARNING] Gagal refresh message ${shopRow.message_id}:`, err.message);
          }
        }
      }
    } catch (refreshErr) {
      console.error("[AUTO REFRESH ERROR]", refreshErr.message);
    }


    // ── DM User ────────────────────────────────────────────────
    try {
      const user = await client.users.fetch(trx.user_id);
      const dmEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
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
          { name: "📦 Status", value: "PAID", inline: true },
        )
        .setFooter({ text: "Terima kasih telah bertransaksi 🙏" })
        .setTimestamp();

      await user.send({ embeds: [dmEmbed] });
      console.log(`📩 DM terkirim ke user ${trx.user_id}`);
    } catch (err) {
      console.error("❌ Gagal DM user:", err.message);
    }

    // ── Announcement ke log channel ────────────────────────────
    if (guildId) {
      const announceEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("💳 Transaksi PAID — Pembayaran Berhasil")
        .addFields(
          {
            name: "👤 User",
            value: `<@${trx.user_id}> (\`${trx.user_id}\`)`,
            inline: false,
          },
          {
            name: "📦 Produk",
            value: trx.product_name || `ID ${trx.product_id}`,
            inline: true,
          },
          {
            name: "💰 Total",
            value: `Rp ${Number(trx.amount).toLocaleString("id-ID")}`,
            inline: true,
          },
          { name: "🧾 Reference", value: `\`${merchantRef}\``, inline: false },
        )
        .setFooter({ text: "Hipeace | Paid Transaction Log" })
        .setTimestamp();

      // Send to 'log_paid' type channel AND 'announcement' type channel
      await sendLogAnnouncement(guildId, "log_paid", announceEmbed);
      await sendLogAnnouncement(guildId, "announcement", announceEmbed);
    }

    console.log(`✅ TRANSAKSI SELESAI | ${merchantRef}`);
    return;
  }

  /* ===================================================================
     STATUS: UNPAID / PENDING
  =================================================================== */
  if (status === "UNPAID" || status === "PENDING") {
    if (trx.status !== "UNPAID") {
      console.log("🟡 UPDATE STATUS KE UNPAID:", merchantRef);
      await updateTransactionStatus(merchantRef, "UNPAID");
    }

    console.log("⏳ MENUNGGU PEMBAYARAN:", merchantRef);

    // ── Announcement ke log channel (log_unpaid) ───────────────
    if (guildId) {
      const unpaidEmbed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("⏳ Transaksi UNPAID — Menunggu Pembayaran")
        .addFields(
          {
            name: "👤 User",
            value: `<@${trx.user_id}> (\`${trx.user_id}\`)`,
            inline: false,
          },
          {
            name: "📦 Produk",
            value: trx.product_name || `ID ${trx.product_id}`,
            inline: true,
          },
          {
            name: "💰 Total",
            value: `Rp ${Number(trx.amount).toLocaleString("id-ID")}`,
            inline: true,
          },
          { name: "🧾 Reference", value: `\`${merchantRef}\``, inline: false },
        )
        .setFooter({ text: "Hipeace | Unpaid Transaction Log" })
        .setTimestamp();

      await sendLogAnnouncement(guildId, "log_unpaid", unpaidEmbed);
    }

    return;
  }

  /* ===================================================================
     STATUS: EXPIRED / FAILED
  =================================================================== */
  if (status === "EXPIRED" || status === "FAILED") {
    console.log("⛔ TRANSAKSI EXPIRED/FAILED:", merchantRef);
    await updateTransactionStatus(merchantRef, "EXPIRED");
    return;
  }

  /* ===================================================================
     STATUS TIDAK DIKENAL
  =================================================================== */
  console.warn("⚠️ STATUS TIDAK DIKENAL:", status);
}

// ─────────────────────────────────────────────────────────────────────────────
// Misc
// ─────────────────────────────────────────────────────────────────────────────
process.on("unhandledRejection", (err) =>
  console.error("🔥 UNHANDLED REJECTION", err),
);
process.on("uncaughtException", (err) =>
  console.error("🔥 UNCAUGHT EXCEPTION", err),
);

app.post("/ping", (req, res) => res.json({ pong: true }));

function startWebhook() {
  app.listen(3000, () => console.log("🚀 Webhook Tripay aktif di port 3000"));
}

module.exports = { startWebhook };

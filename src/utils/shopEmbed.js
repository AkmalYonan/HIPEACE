const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getCategoryById } = require("../database/categories");
const { getActiveProductsByCategory } = require("../database/products");

const DELIVERY_LABELS = {
  auto_role: "🎭 Auto Role",
  ingame_link: "🔗 Ingame Link",
  voucher: "🎟️ Voucher",
  raw_text: "📄 Raw Text",
};

/**
 * Generate shop embed and interactive pagination buttons
 * @param {number} categoryId
 * @param {number} page
 * @returns {Promise<{embeds: EmbedBuilder[], components: ActionRowBuilder[], category: object|null}>}
 */
async function buildShopMessage(categoryId, page = 1) {
  const category = await getCategoryById(categoryId);
  if (!category) {
    const notFoundEmbed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("❌ Kategori Tidak Ditemukan")
      .setDescription(
        "Kategori ini tidak ditemukan atau mungkin sudah dinonaktifkan.",
      )
      .setTimestamp();
    return {
      embeds: [notFoundEmbed],
      components: [],
      category: null,
    };
  }

  const products = await getActiveProductsByCategory(categoryId);
  const pageSize = 3;
  const totalProducts = products.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
  const currentPage = Math.min(Math.max(1, parseInt(page, 10) || 1), totalPages);

  const deliveryLabel =
    DELIVERY_LABELS[category.delivery_type] || category.delivery_type || "Standard";

  if (totalProducts === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setTitle(`🛍️ KATALOG TOKO — ${category.name}`)
      .setDescription(
        `${category.description ? `*${category.description}*\n\n` : ""}` +
          `🚚 **Tipe Pengiriman:** ${deliveryLabel}\n\n` +
          `⚠️ Saat ini **belum ada produk aktif** yang tersedia pada kategori ini.\n` +
          `Silakan hubungi staff atau klik **Refresh** secara berkala.`,
      )
      .setFooter({
        text: `Halaman 1/1 • Live Refresh System • Update: ${new Date().toLocaleTimeString("id-ID")}`,
      })
      .setTimestamp();

    const refreshRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_refresh_${categoryId}_1`)
        .setLabel("Refresh")
        .setEmoji("🔄")
        .setStyle(ButtonStyle.Primary),
    );

    return {
      embeds: [emptyEmbed],
      components: [refreshRow],
      category,
    };
  }

  const startIndex = (currentPage - 1) * pageSize;
  const currentProducts = products.slice(startIndex, startIndex + pageSize);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🛍️ KATALOG TOKO — ${category.name}`)
    .setDescription(
      `${category.description ? `*${category.description}*\n\n` : ""}` +
        `🚚 **Tipe Pengiriman:** ${deliveryLabel}\n` +
        `Pilih produk di bawah untuk melakukan pembelian otomatis via QRIS.`,
    );

  currentProducts.forEach((p) => {
    const isAvailable = p.stock > 0;
    const statusDot = isAvailable ? "🟢" : "🔴";
    const stockText = isAvailable
      ? `\`${p.stock}\` item`
      : "**❌ Stok Habis**";
    const descText = p.description ? `\n> 📝 *${p.description}*` : "";

    embed.addFields({
      name: `${statusDot} ${p.name}`,
      value:
        `💰 **Harga:** Rp ${Number(p.price).toLocaleString("id-ID")}\n` +
        `📊 **Stok:** ${stockText}` +
        descText,
      inline: false,
    });
  });

  embed.setFooter({
    text: `Halaman ${currentPage}/${totalPages} • Total: ${totalProducts} Produk • Live Refresh System • Update: ${new Date().toLocaleTimeString("id-ID")}`,
  });
  embed.setTimestamp();

  const hasAnyStock = products.some((p) => p.stock > 0);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop_prev_${categoryId}_${currentPage}`)
      .setEmoji("⬅️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage <= 1),
    new ButtonBuilder()
      .setCustomId(`buy_cat_${categoryId}_${currentPage}`)
      .setLabel("Beli Sekarang")
      .setEmoji("🛒")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!hasAnyStock),
    new ButtonBuilder()
      .setCustomId(`shop_next_${categoryId}_${currentPage}`)
      .setEmoji("➡️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages),
    new ButtonBuilder()
      .setCustomId(`shop_refresh_${categoryId}_${currentPage}`)
      .setLabel("Refresh")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Primary),
  );

  return {
    embeds: [embed],
    components: [row],
    category,
  };
}

module.exports = {
  buildShopMessage,
  DELIVERY_LABELS,
};

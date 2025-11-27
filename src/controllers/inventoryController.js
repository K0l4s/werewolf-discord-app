const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const Inventory = require("../models/Inventory");

class InventoryController {
    static async showInventoryEmbed(userId, page = 1) {
        const inventoryItems = await Inventory.find({
            userId,
            quantity: { $gt: 0 }
        })
            .populate("item")
            .skip((page - 1) * 16)
            .limit(16);

        const totalItems = await Inventory.countDocuments({ userId, quantity: { $gt: 0 } });
        const totalPages = Math.ceil(totalItems / 16);
        const embed = new EmbedBuilder()
            .setTitle("🎒 Kho đồ của bạn")
            .setColor("#FFD700")
            .setTimestamp()
            .setFooter({ text: `Trang ${page} / ${totalPages} | Tổng số vật phẩm: ${totalItems}` });

        if (!inventoryItems.length) {
            embed.addFields({
                name: "Không có vật phẩm",
                value: "Bạn chưa sở hữu vật phẩm nào trong kho.",
                inline: false
            });
            return { embeds: [embed] };
        }

        // Gom 2 item mỗi dòng
        // Gom 4 item mỗi dòng
        const rows = [];
        for (let i = 0; i < inventoryItems.length; i += 4) {
            const items = inventoryItems.slice(i, i + 4);

            const strings = items.map((inv) => {
                if (!inv) return "";
                return `${"`"}[${inv.item.itemRef}]${"`"} ${inv.item.icon} (x${inv.quantity.toLocaleString("en-US")})`;
            });

            // Ghép bằng " || " nhưng bỏ slot trống
            const rowValue = strings.filter(Boolean).join(" **||** ");

            rows.push({
                name: "\u200B",
                value: rowValue,
                inline: false
            });
        }


        embed.addFields(rows);
        const prevButtonDisabled = page <= 1;
        const nextButtonDisabled = inventoryItems.length < 10;
        const prevButton = new ButtonBuilder()
            .setCustomId(`inventory|${userId}|${page - 1}`)
            .setLabel('Previous')
            .setStyle('Primary')
            .setDisabled(prevButtonDisabled);
        const nextButton = new ButtonBuilder()
            .setCustomId(`inventory|${userId}|${page + 1}`)
            .setLabel('Next')
            .setStyle('Primary')
            .setDisabled(nextButtonDisabled);
        const actionRow = new ActionRowBuilder().addComponents(prevButton, nextButton);

        return { embeds: [embed], components: [actionRow] };
    }
}
module.exports = InventoryController;
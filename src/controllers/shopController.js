const { Embed, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const ItemService = require("../services/itemService");
const { wolfCoin, wolfIcon } = require("../utils/wolfCoin");
const UserService = require("../services/userService");
const InventoryService = require("../services/inventoryService");
const Inventory = require("../models/Inventory");
class ShopController {
    static async getShopEmbed(page = 1, limit = 5) {
        const { items, totalItems, currentPage, totalPages } = await ItemService.getAllItems(page, limit);

        const embed = new EmbedBuilder()
            .setTitle("🛒 Shop")
            .setColor("Blue");

        if (items.length === 0) {
            embed.setDescription("Hiện tại shop chưa có item nào.");
        } else {
            // Nếu có items nhưng không muốn description chính, vẫn set mô tả ngắn
            embed.setDescription("Danh sách items có sẵn: ");
            items.forEach((item) => {
                embed.addFields({
                    name: `[${item.itemRef}]. ${item.icon} ${item.name}`,
                    value: `💰 Giá: ${wolfCoin(item.price)}\n📖 ${item.description || "Không có mô tả"}`
                });
            });
        }

        embed.setFooter({ text: `Trang ${currentPage}/${totalPages} | Items trên trang: ${totalItems}` });

        const prevPageButton = new ButtonBuilder()
            .setCustomId(`shop_prev_${currentPage - 1}`)
            .setLabel("⬅️ Trước")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage <= 1);

        const nextPageButton = new ButtonBuilder()
            .setCustomId(`shop_next_${currentPage + 1}`)
            .setLabel("Tiếp ➡️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage >= totalPages);

        const row = new ActionRowBuilder()
            .addComponents(prevPageButton, nextPageButton);

        return { embeds: [embed], components: [row] }; // phải là embeds: [embed]

    }
    static async buyItem(userId, itemRef, quantity) {
    try {
        const user = await UserService.findUserById(userId);
        const item = await ItemService.getItemByRef(itemRef);
        
        if (!item) {
            return `Don't find any item with ref: ${itemRef}!`;
        }

        const userCoin = Number(user.coin);
        const totalItemsPrice = Number(item.price) * Number(quantity);
        
        if (userCoin < totalItemsPrice) {
            return `You don't have enough ${wolfIcon()}`;
        }

        // Trừ coin
        user.coin -= totalItemsPrice;
        await user.save();

        // Sử dụng findOneAndUpdate với upsert để đảm bảo không bị lỗi
        const inv = await Inventory.findOneAndUpdate(
            {
                userId: userId,
                item: item._id
            },
            {
                $inc: { quantity: quantity }
            },
            {
                upsert: true, // Tạo mới nếu không tồn tại
                new: true, // Trả về document sau khi update
                setDefaultsOnInsert: true
            }
        ).populate('item'); // Populate để lấy thông tin item

        const embed = new EmbedBuilder();
        embed.setTitle(`✅ Success!`)
            .setDescription(`You bought ${quantity} x ${item.icon} ${item.name} (${wolfCoin(item.price)}) = ${wolfCoin(totalItemsPrice)} \nYou have: ${inv.quantity} ${item.icon} ${item.name} now`)
            .setFooter({ text: "@Werewolf Shop" })
            .setTimestamp()
            .setColor(0x00FF00);

        return { embeds: [embed] };

    } catch (error) {
        console.error('Error in buyItem:', error);
        return `An error occurred while purchasing the item.`;
    }
}
}
module.exports = ShopController;
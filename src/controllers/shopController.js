const { Embed, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");
const ItemService = require("../services/itemService");
const { wolfCoin, wolfIcon, wolfToken } = require("../utils/wolfCoin");
const UserService = require("../services/userService");
const InventoryService = require("../services/inventoryService");
const Inventory = require("../models/Inventory");
const { ITEM_RARITY, ITEM_TYPE } = require("../config/constants");
const { formatType, rarityIcons } = require("../utils/format");
class ShopController {
    static async getShopEmbed(page = 1, limit = 5, sortBy = 'name', sortOrder = 'asc', rarityFilter = 'all', typeFilter = 'all') {
        // Lấy dữ liệu items với các tham số lọc và sắp xếp
        const { items, totalItems, currentPage, totalPages } = await ItemService.getAllItems(
            page,
            limit,
            sortBy,
            sortOrder,
            rarityFilter,
            typeFilter,
            true
        );
        const rarityIcons = {
            "Common": "❤️️",
            "Super Common": "🍀",
            "Rare": "💎",
            "Super Rare": "🔥",
            "Epic": "🌌",
            "Super Epic": "⚔️",
            "Legendary": "👑",
            "Super Legendary": "🌟",
            "Mythic": "🐉",
            "Super Mythic": "🚀"
        };
        const embed = new EmbedBuilder()
            .setTitle("🛒 Shop")
            .setColor("Blue");

        if (items.length === 0) {
            embed.setDescription("Hiện tại shop chưa có item nào phù hợp với bộ lọc.");
        } else {
            // Tạo mô tả với thông tin về bộ lọc và sắp xếp hiện tại
            let description = "Danh sách items có sẵn:\n";

            // Hiển thị thông tin bộ lọc
            if (rarityFilter !== 'all' || typeFilter !== 'all') {
                description += "**Bộ lọc:** ";
                if (rarityFilter !== 'all') description += `Độ hiếm: ${rarityFilter} `;
                if (typeFilter !== 'all') description += `Loại: ${typeFilter} `;
                description += "\n";
            }

            // Hiển thị thông tin sắp xếp
            const sortText = {
                name: 'Tên',
                price: 'Giá',
                rarity: 'Độ hiếm'
            };
            description += `**Sắp xếp:** ${sortText[sortBy] || sortBy} (${sortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'})\n\n`;

            embed.setDescription(description);
            items.forEach((item, index) => {
                const itemNumber = (currentPage - 1) * limit + index + 1;
                const rarityIcon = rarityIcons[item.rarity] || '❔';

                embed.addFields({
                    name: `[${itemNumber}] ${item.itemRef} | ${item.icon} ${item.name} | ${wolfCoin(item.price)} | ${item.tokenPrice? wolfToken(item.tokenPrice): ""} | ${rarityIcon} ${item.rarity}`,
                    value: `📖 ${item.description || "Không có mô tả"}`, 
                    inline: false
                });
            });
        }

        embed.setFooter({ text: `Trang ${currentPage}/${totalPages} | Tổng items: ${totalItems} | Sử dụng /buy [itemRef] để mua` });

        // Tạo nút phân trang
        const prevPageButton = new ButtonBuilder()
            .setCustomId(`shop_prev_${currentPage - 1}_${sortBy}_${sortOrder}_${rarityFilter}_${typeFilter}`)
            .setLabel("⬅️ Trước")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage <= 1);

        const nextPageButton = new ButtonBuilder()
            .setCustomId(`shop_next_${currentPage + 1}_${sortBy}_${sortOrder}_${rarityFilter}_${typeFilter}`)
            .setLabel("Tiếp ➡️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage >= totalPages);

        const raritySelect = new StringSelectMenuBuilder()
            .setCustomId('shop_rarity_filter')
            .setPlaceholder('Lọc theo độ hiếm')
            .addOptions([
                {
                    label: 'Tất cả độ hiếm',
                    value: 'all',
                    default: rarityFilter === 'all'
                },
                ...Object.values(ITEM_RARITY).map(rarity => ({
                    label: `
                    ${rarityIcons[rarity] || '❔'}
                    ${rarity}`,
                    value: rarity,
                    default: rarityFilter === rarity
                }))
            ]);

        // Tạo dropdown lọc theo loại item
        const typeSelect = new StringSelectMenuBuilder()
            .setCustomId('shop_type_filter')
            .setPlaceholder('Lọc theo loại')
            .addOptions([
                {
                    label: 'Tất cả loại',
                    value: 'all',
                    default: typeFilter === 'all'
                },
                ...Object.values(ITEM_TYPE).map(type => ({
                    label: `${type === ITEM_TYPE.PET_FOOD ? "🐾" :
                        type === ITEM_TYPE.PRESENT_BOX ? "🎁" : "🛍️"
                        } ${formatType(type)}`,
                    value: type,
                    default: typeFilter === type
                }))
            ]);

        // Tạo dropdown sắp xếp
        const sortSelect = new StringSelectMenuBuilder()
            .setCustomId('shop_sort')
            .setPlaceholder('Sắp xếp theo')
            .addOptions([
                {
                    label: 'Tên (A-Z)',
                    value: 'name_asc',
                    default: sortBy === 'name' && sortOrder === 'asc'
                },
                {
                    label: 'Tên (Z-A)',
                    value: 'name_desc',
                    default: sortBy === 'name' && sortOrder === 'desc'
                },
                {
                    label: 'Giá (Thấp-Cao)',
                    value: 'price_asc',
                    default: sortBy === 'price' && sortOrder === 'asc'
                },
                {
                    label: 'Giá (Cao-Thấp)',
                    value: 'price_desc',
                    default: sortBy === 'price' && sortOrder === 'desc'
                },
                {
                    label: 'Độ hiếm (Thấp-Cao)',
                    value: 'rarity_asc',
                    default: sortBy === 'rarity' && sortOrder === 'asc'
                },
                {
                    label: 'Độ hiếm (Cao-Thấp)',
                    value: 'rarity_desc',
                    default: sortBy === 'rarity' && sortOrder === 'desc'
                }
            ]);

        // Tạo các hàng component
        const paginationRow = new ActionRowBuilder()
            .addComponents(prevPageButton, nextPageButton);

        const filterRow = new ActionRowBuilder()
            .addComponents(raritySelect);

        const typeRow = new ActionRowBuilder()
            .addComponents(typeSelect);

        const sortRow = new ActionRowBuilder()
            .addComponents(sortSelect);


        return {
            embeds: [embed],
            components: [filterRow, typeRow, sortRow, paginationRow]
        };
    }
    // static async getShopEmbed(page = 1, limit = 5) {
    //     const { items, totalItems, currentPage, totalPages } = await ItemService.getAllItems(page, limit);

    //     const embed = new EmbedBuilder()
    //         .setTitle("🛒 Shop")
    //         .setColor("Blue");

    //     if (items.length === 0) {
    //         embed.setDescription("Hiện tại shop chưa có item nào.");
    //     } else {
    //         // Nếu có items nhưng không muốn description chính, vẫn set mô tả ngắn
    //         embed.setDescription("Danh sách items có sẵn: ");
    //         items.forEach((item) => {
    //             embed.addFields({
    //                 name: `[${item.itemRef}]. ${item.icon} ${item.name}`,
    //                 value: `💰 Giá: ${wolfCoin(item.price)}\n📖 ${item.description || "Không có mô tả"}`
    //             });
    //         });
    //     }

    //     embed.setFooter({ text: `Trang ${currentPage}/${totalPages} | Items trên trang: ${totalItems}` });

    //     const prevPageButton = new ButtonBuilder()
    //         .setCustomId(`shop_prev_${currentPage - 1}`)
    //         .setLabel("⬅️ Trước")
    //         .setStyle(ButtonStyle.Primary)
    //         .setDisabled(currentPage <= 1);

    //     const nextPageButton = new ButtonBuilder()
    //         .setCustomId(`shop_next_${currentPage + 1}`)
    //         .setLabel("Tiếp ➡️")
    //         .setStyle(ButtonStyle.Primary)
    //         .setDisabled(currentPage >= totalPages);

    //     const row = new ActionRowBuilder()
    //         .addComponents(prevPageButton, nextPageButton);

    //     return { embeds: [embed], components: [row] }; // phải là embeds: [embed]

    // }
    static async buyItemByCoin(userId, itemRef, quantity) {
        try {
            const user = await UserService.findUserById(userId);
            const item = await ItemService.getItemByRef(itemRef);

            if (!item) {
                return `Don't find any item with ref: ${itemRef}!`;
            }
            if (!item.isBuy) {
                return `Item ${item.icon} ${item.name} is not for sale!`;
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
                .setDescription(`You bought ${quantity} x ${item.icon} ${item.name} (${wolfToken(item.tokenPrice)}) = ${wolfToken(totalItemsPrice)} \nYou have: ${inv.quantity} ${item.icon} ${item.name} now`)
                .setFooter({ text: "@Keldo Shop" })
                .setTimestamp()
                .setColor(0x00FF00);

            return { embeds: [embed] };

        } catch (error) {
            console.error('Error in buyItem:', error);
            return `An error occurred while purchasing the item.`;
        }
    }
    static async buyItemByToken(userId, itemRef, quantity) {
        try {
            const user = await UserService.findUserById(userId);
            const item = await ItemService.getItemByRef(itemRef);

            if (!item) {
                return `Don't find any item with ref: ${itemRef}!`;
            }
            if (!item.isBuy) {
                return `Item ${item.icon} ${item.name} is not for sale!`;
            }
            if (!item.tokenPrice)
                return `Can't buy by token!`;

            const userCoin = Number(user.token) || 0;
            const totalItemsPrice = Number(item.tokenPrice) * Number(quantity);

            if (userCoin < totalItemsPrice) {
                return `You don't have enough ${wolfIcon()}`;
            }

            // Trừ coin
            user.token -= totalItemsPrice;
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
                .setFooter({ text: "@Keldo Shop" })
                .setTimestamp()
                .setColor(0x00FF00);

            return { embeds: [embed] };

        } catch (error) {
            console.error('Error in buyItem:', error);
            return `An error occurred while purchasing the item.`;
        }
    }
    static async buyItemRequest(userId, itemRef, quantity) {
        try {
            // const user = await UserService.findUserById(userId);
            const item = await ItemService.getItemByRef(itemRef);

            if (!item) {
                return `Don't find any item with ref: ${itemRef}!`;
            }
            if (!item.isBuy) {
                return `Item ${item.icon} ${item.name} is not for sale!`;
            }
            // const userCoin = Number(user.coin);
            // const totalItemsPrice = Number(item.price) * Number(quantity);

            // if (userCoin < totalItemsPrice) {
            //     return `You don't have enough ${wolfIcon()}`;
            // }
            let isBuyCoin = false;
            let isBuyToken = false;

            if (item.price)
                isBuyCoin = true
            if (item.tokenPrice)
                isBuyToken = true
            const buyByCoinBtn = new ButtonBuilder()
                .setCustomId(`buy|coin|${userId}|${itemRef}|${quantity}`)
                .setEmoji("<:wolf_coin:1443472537425022996>")
                .setDisabled(!isBuyCoin)
                .setLabel("Mua bằng coin")
                .setStyle(ButtonStyle.Secondary)

            const buyByTokenBtn = new ButtonBuilder()
                .setCustomId(`buy|token|${userId}|${itemRef}|${quantity}`)
                .setEmoji("<:token:1443472738303082677>")
                .setDisabled(!isBuyToken)
                .setLabel("Mua bằng token")
                .setStyle(ButtonStyle.Secondary)

            const row = new ActionRowBuilder().addComponents(buyByCoinBtn, buyByTokenBtn)
            
            const embed = new EmbedBuilder();
            embed.setTitle(`Buy Request!`)
                .setDescription(`Method Payment \n **${isBuyCoin? wolfCoin(item.price):""}** ${isBuyToken? "or **"+wolfToken(item.tokenPrice)+"**":""}`)
                .setFooter({ text: "@Keldo Shop" })
                .setTimestamp()
                .setColor(0x00FF00);

            return { embeds: [embed], components: [row] };

        } catch (error) {
            console.error('Error in buyItem:', error);
            return `An error occurred while purchasing the item.`;
        }
    }
}
module.exports = ShopController;
const { EmbedBuilder, ActionRowBuilder } = require("discord.js");
const { ITEM_RARITY } = require("../../config/constants");
const SpiritService = require("../../services/DauLaDaiLuc/spiritService");
const SpiritMaster = require("../../models/DauLaDaiLuc/SpiritMaster");
const Item = require("../../models/Item");
const Inventory = require("../../models/Inventory");
const Spirit = require("../../models/DauLaDaiLuc/Spirit");

class SpiritController {
    static async awakenRandomSpirit(userId) {
        try {
            // Đếm số lần thức tỉnh của userId
            const awakeningCount = await SpiritMaster.countDocuments({ userId });

            // Nếu đã thức tỉnh 2 lần
            if (awakeningCount >= 2) {
                return SpiritController.createErrorEmbed('❌ Đã đạt giới hạn thức tỉnh!', 'Bạn đã thức tỉnh tối đa 2 vũ hồn. Không thể thức tỉnh thêm.');
            }

            // Nếu đã thức tỉnh 1 lần (chuẩn bị thức tỉnh lần 2)
            if (awakeningCount === 1) {
                // Kiểm tra vật phẩm "Tẩy lễ võ hồn"
                const resetItem = await Item.findOne({
                    itemRef: 'SPI1',
                    name: 'Tẩy lễ võ hồn'
                });

                if (!resetItem) {
                    return SpiritController.createErrorEmbed('❌ Lỗi hệ thống!', 'Vật phẩm thức tỉnh không tồn tại.');
                }

                // Kiểm tra trong inventory
                const userInventory = await Inventory.findOne({
                    userId,
                    item: resetItem._id
                });

                if (!userInventory || userInventory.quantity < 1) {
                    return SpiritController.createErrorEmbed('❌ Thiếu vật phẩm!', 'Bạn cần có "Tẩy lễ võ hồn" để thức tỉnh song sinh võ hồn.');
                }

                // Trừ vật phẩm
                await Inventory.findOneAndUpdate(
                    { userId, item: resetItem._id },
                    { $inc: { quantity: -1 } }
                );
            }

            // Lấy ngẫu nhiên một vũ hồn từ database
            const randomSpirit = await SpiritController.getRandomSpirit();

            if (!randomSpirit) {
                return SpiritController.createErrorEmbed('❌ Lỗi hệ thống!', 'Không tìm thấy vũ hồn nào trong database.');
            }

            // Tạo record thức tỉnh mới
            const newSpiritMaster = new SpiritMaster({
                userId,
                spirit: randomSpirit._id,
                equipRing: []
            });

            await newSpiritMaster.save();

            // Lấy tất cả vũ hồn của user để hiển thị
            const userSpirits = await SpiritMaster.find({ userId })
                .populate('spirit')
                .populate('equipRing');

            return SpiritController.createSuccessEmbed(userSpirits, awakeningCount + 1);

        } catch (error) {
            console.error('Lỗi thức tỉnh vũ hồn:', error);
            return SpiritController.createErrorEmbed('❌ Lỗi hệ thống!', 'Đã xảy ra lỗi khi thức tỉnh vũ hồn.');
        }
    }

    // Hàm lấy ngẫu nhiên một vũ hồn từ database
    static async getRandomSpirit() {
        try {
            const totalSpirits = await Spirit.countDocuments();
            if (totalSpirits === 0) return null;

            const randomIndex = Math.floor(Math.random() * totalSpirits);
            return await Spirit.findOne().skip(randomIndex);
        } catch (error) {
            console.error('Lỗi khi lấy vũ hồn ngẫu nhiên:', error);
            return null;
        }
    }

    // Hàm tạo embed lỗi
    static createErrorEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    }

    // Hàm tạo embed thành công
    static createSuccessEmbed(userSpirits, awakeningNumber) {
        const latestSpirit = userSpirits[userSpirits.length - 1].spirit;
        const isSecondAwakening = awakeningNumber === 2;

        const embed = new EmbedBuilder()
            .setColor(SpiritController.getRarityColor(latestSpirit.rarity))
            .setTitle(`🎉 ${isSecondAwakening ? 'Thức Tỉnh Song Thành Công!' : 'Thức Tỉnh Thành Công!'}`)
            .setDescription(`**${latestSpirit.name}** - ${latestSpirit.rarity} (Thức tỉnh lần ${awakeningNumber})`)
            .setThumbnail(latestSpirit.imgUrl)
            .addFields(
                { name: '📛 Tên Vũ Hồn', value: latestSpirit.name, inline: true },
                { name: '⭐ Cấp Độ', value: latestSpirit.rarity, inline: true },
                { name: '⚔️ Tấn Công', value: latestSpirit.atk.toString(), inline: true },
                { name: '🛡️ Phòng Thủ', value: latestSpirit.def.toString(), inline: true },
                { name: '🌀 Tốc Độ', value: latestSpirit.sp.toString(), inline: true },
                { name: '📖 Mô Tả', value: latestSpirit.description.substring(0, 100) + (latestSpirit.description.length > 100 ? '...' : '') }
            );

        // Thêm thông tin về số vũ hồn hiện có
        if (isSecondAwakening) {
            embed.addFields(
                { name: '🎯 Trạng thái', value: 'Đã thức tỉnh song sinh vũ hồn!', inline: false }
            );
        }

        embed.setFooter({
            text: isSecondAwakening ?
                'Song sinh võ hồn đã được kích hoạt!' :
                `Bạn có thể thức tỉnh thêm ${2 - awakeningNumber} vũ hồn nữa`
        }).setTimestamp();

        return embed;
    }

    // Hàm lấy màu theo rarity
    static getRarityColor(rarity) {
        const rarityColors = {
            'C': 0x808080, 'SM': 0x00FF00, 'R': 0x0000FF, 'SR': 0x800080,
            'E': 0xFFA500, 'SE': 0xFF0000, 'L': 0xFFFF00, 'SL': 0x00FFFF,
            'MY': 0xFF00FF, 'SMY': 0xFFD700
        };
        return rarityColors[rarity] || 0xFFFFFF;
    }

    // Hàm tạo embed danh sách vũ hồn
    static createSpiritListEmbed(userSpirits, userId) {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`📋 Danh sách Vũ Hồn - User: ${userId}`)
            .setDescription(`Tổng số: ${userSpirits.length}/2 vũ hồn`);

        userSpirits.forEach((spiritMaster, index) => {
            const spirit = spiritMaster.spirit;
            embed.addFields({
                name: `🎯 Vũ Hồn ${index + 1}: ${spirit.name} [${spirit.rarity}]`,
                value: `⚔️ ATK: ${spirit.atk} | 🛡️ DEF: ${spirit.def} | 🌀 SP: ${spirit.sp}\n${spirit.description.substring(0, 50)}...`,
                inline: false
            });
        });

        if (userSpirits.length < 2) {
            embed.addFields({
                name: '💡 Thông tin',
                value: `Bạn có thể thức tỉnh thêm ${2 - userSpirits.length} vũ hồn nữa. Lần thứ 2 cần "Tẩy lễ võ hồn".`,
                inline: false
            });
        }

        return embed;
    }

    static async showAllSpirits(page = 1) {
        try {
            const limit = 5;
            const { spirits, page: currentPage, totalPages, total } = await SpiritService.getAllSpirits(page, limit);

            if (spirits.length === 0) {
                return new EmbedBuilder()
                    .setTitle('📚 Danh Sách Vũ Hồn')
                    .setDescription('❌ Hiện không có Vũ Hồn nào trong database!')
                    .setColor(0xFF0000);
            }

            const embed = new EmbedBuilder()
                .setTitle('📚 Danh Sách Tất Cả Vũ Hồn')
                .setDescription(`**Tổng số:** ${total} Vũ Hồn • **Trang:** ${currentPage}/${totalPages}\n\nDưới đây là danh sách các Vũ Hồn hiện có:`)
                .setColor(this.getRarityColor(spirits[0].rarity))
                .setFooter({
                    text: totalPages > 1 ?
                        `Sử dụng /spirit <trang> để xem trang khác • Trang ${currentPage}/${totalPages}` :
                        `Sử dụng /spirit <tên> để xem chi tiết`
                })
                .setTimestamp();

            spirits.forEach((spirit, index) => {
                const position = (page - 1) * limit + index + 1;
                const evolutionInfo = spirit.nextId ? '🔄' : '⏹️';

                embed.addFields({
                    name: `${this.getRarityEmoji(spirit.rarity)} ${position}. ${spirit.name} ${evolutionInfo}`,
                    value: `⚔️${spirit.atk} 🛡️${spirit.def} ⚡${spirit.sp} • **${spirit.rarity}**\n${spirit.description.substring(0, 80)}...`,
                    inline: false
                });
            });

            return embed;

        } catch (error) {
            console.error('❌ Lỗi khi hiển thị danh sách Vũ Hồn:', error);
            return new EmbedBuilder()
                .setTitle('❌ Lỗi')
                .setDescription('Đã xảy ra lỗi khi tải danh sách Vũ Hồn!')
                .setColor(0xFF0000);
        }
    }

    // Hàm lấy emoji theo độ hiếm
    static getRarityEmoji(rarity) {
        const emojiMap = {
            [ITEM_RARITY.C]: '⚪',   // Common
            [ITEM_RARITY.SM]: '🔵',  // Semi-Mythic
            [ITEM_RARITY.R]: '🟢',   // Rare
            [ITEM_RARITY.SR]: '🔴',  // Super Rare
            [ITEM_RARITY.E]: '🟣',   // Epic
            [ITEM_RARITY.SE]: '🟠',  // Super Epic
            [ITEM_RARITY.L]: '🟡',   // Legendary
            [ITEM_RARITY.SL]: '🟤',  // Super Legendary
            [ITEM_RARITY.MY]: '✨',  // Mythic
            [ITEM_RARITY.SMY]: '🌟'  // Super Mythic
        };
        return emojiMap[rarity] || '⚪';
    }

    // Hàm lấy màu theo độ hiếm
    static getRarityColor(rarity) {
        const colorMap = {
            [ITEM_RARITY.C]: 0x888888,   // Gray
            [ITEM_RARITY.SM]: 0x0000FF,  // Blue
            [ITEM_RARITY.R]: 0x00FF00,   // Green
            [ITEM_RARITY.SR]: 0xFF0000,  // Red
            [ITEM_RARITY.E]: 0x800080,   // Purple
            [ITEM_RARITY.SE]: 0xFFA500,  // Orange
            [ITEM_RARITY.L]: 0xFFFF00,   // Yellow
            [ITEM_RARITY.SL]: 0x964B00,  // Brown
            [ITEM_RARITY.MY]: 0xFFD700,  // Gold
            [ITEM_RARITY.SMY]: 0xE6E6FA  // Lavender
        };
        return colorMap[rarity] || 0x0099FF;
    }
    static async addSpirit() {
        try {
            const spiritData = {
                name: "Tà Mâu Bạch Hổ",
                description: "Vũ Hồn thiên phú của Đới Mộc Bạch. Là thú vũ hồn hệ cường công. Có tiềm năng trở thành Vũ Hồn mạnh nhất.",
                imgUrl: "https://i.ibb.co/XxjTqtJ3/BachHo.png",
                atk: 90,
                def: 78,
                sp: 56
            };

            // Tìm hoặc tạo mới
            const spirit = await Spirit.findOneAndUpdate(
                { name: "Nhu Cốt Thỏ" }, // Điều kiện tìm
                spiritData, // Dữ liệu cập nhật
                {
                    upsert: true, // Nếu không tìm thấy thì tạo mới
                    new: true, // Trả về document sau khi update
                    runValidators: true // Chạy validation
                }
            );
            const spiritData1 = {
                name: "Nhu Cốt Thỏ",
                description: "Vũ Hồn thiên phú của Tiểu Vũ. Là thú vũ hồn hệ mẫn công. Có tiềm năng trở thành Vũ Hồn mạnh nhất.",
                imgUrl: "https://i.ibb.co/XxjTqtJ3/BachHo.png",
                atk: 85,
                def: 56,
                sp: 95
            };

            // Tìm hoặc tạo mới
            const spirit1 = await Spirit.findOneAndUpdate(
                { name: "Nhu Cốt Thỏ" }, // Điều kiện tìm
                spiritData1, // Dữ liệu cập nhật
                {
                    upsert: true, // Nếu không tìm thấy thì tạo mới
                    new: true, // Trả về document sau khi update
                    runValidators: true // Chạy validation
                }
            );

            const spiritData2 = {
                name: "Tà Hỏa Phượng Hoàng",
                description: "Vũ Hồn thiên phú của Mã Hồng Tuấn. Là thú vũ hồn hệ cường công. Có tiềm năng trở thành Vũ Hồn mạnh nhất.",
                imgUrl: "https://i.ibb.co/XxjTqtJ3/BachHo.png",
                atk: 95,
                def: 87,
                sp: 78
            };

            // Tìm hoặc tạo mới
            const spirit2 = await Spirit.findOneAndUpdate(
                { name: "Tà Hỏa Phượng Hoàng" }, // Điều kiện tìm
                spiritData2, // Dữ liệu cập nhật
                {
                    upsert: true, // Nếu không tìm thấy thì tạo mới
                    new: true, // Trả về document sau khi update
                    runValidators: true // Chạy validation
                }
            );
            const spiritData3 = {
                name: "La Tam Pháo",
                description: "Vũ Hồn thiên phú của Lão Sư. Là thú vũ hồn biến dị từ Lam Điện Bá Vương Long. Có tiềm năng trở thành Vũ Hồn mạnh nhất.",
                imgUrl: "https://i.ibb.co/C3kXGWbv/La-Tam-Phao.png",
                atk: 65,
                def: 56,
                sp: 56
            };

            // Tìm hoặc tạo mới
            const spirit3 = await Spirit.findOneAndUpdate(
                { name: "La Tam Pháo" }, // Điều kiện tìm
                spiritData3, // Dữ liệu cập nhật
                {
                    upsert: true, // Nếu không tìm thấy thì tạo mới
                    new: true, // Trả về document sau khi update
                    runValidators: true // Chạy validation
                }
            );

            const spiritData4 = {
                name: "U Minh Linh Miêu",
                description: "Vũ Hồn thiên phú của Chu Trúc Thanh. Là thú vũ hồn hệ mẫn công. Có tiềm năng trở thành Vũ Hồn mạnh nhất.",
                imgUrl: "https://i.ibb.co/s8m84d1/UMinh-Linh-Mieu.png",
                atk: 78,
                def: 67,
                sp: 89
            };

            // Tìm hoặc tạo mới
            const spirit4 = await Spirit.findOneAndUpdate(
                { name: "U Minh Linh Miêu" }, // Điều kiện tìm
                spiritData4, // Dữ liệu cập nhật
                {
                    upsert: true, // Nếu không tìm thấy thì tạo mới
                    new: true, // Trả về document sau khi update
                    runValidators: true // Chạy validation
                }
            );
            const spiritData5 = {
                name: "Hạo Thiên Chùy",
                description: "Vũ Hồn thiên phú của Hạo Thiên Tông. Là thú vũ hồn hệ cường công. Có tiềm năng trở thành Vũ Hồn mạnh nhất.",
                imgUrl: "https://i.ibb.co/hRcjzSRc/Hao-Thien-Chuy.png",
                atk: 99,
                def: 89,
                sp: 78
            };

            // Tìm hoặc tạo mới
            const spirit5 = await Spirit.findOneAndUpdate(
                { name: "Hạo Thiên Chùy" }, // Điều kiện tìm
                spiritData5, // Dữ liệu cập nhật
                {
                    upsert: true, // Nếu không tìm thấy thì tạo mới
                    new: true, // Trả về document sau khi update
                    runValidators: true // Chạy validation
                }
            );
            // console.log('✅ Lam Ngân Thảo Hoàng đã được import thành công:', spirit);
            console.log(spirit1)
            console.log(spirit2)
            console.log(spirit3)
            console.log(spirit4)
            console.log(spirit5)

            return spirit;

        } catch (error) {
            console.error('❌ Lỗi khi import Lam Ngân Thảo Hoàng:', error);
            throw error;
        }
    }
}

module.exports = SpiritController;
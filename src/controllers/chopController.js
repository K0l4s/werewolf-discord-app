const { EmbedBuilder } = require("discord.js");
const { ITEM_TYPE, ITEM_RARITY } = require("../config/constants");
const Inventory = require("../models/Inventory");
const Item = require("../models/Item");
const UserService = require("../services/userService");
const ToolUse = require("../models/ToolUse");

const CHOP_COOLDOWN = 10 * 1000; // cooldown

// Danh sách khu rừng
const forestAreas = [
    {
        name: "🌲 Rừng Sồi Xanh",
        requiredLevel: 1,
        rarityRates: {
            [ITEM_RARITY.C]: 55,
            [ITEM_RARITY.SM]: 25,
            [ITEM_RARITY.R]: 12,
            [ITEM_RARITY.SR]: 6,
            [ITEM_RARITY.E]: 2,
        },
    },
    {
        name: "🌳 Rừng Cổ Thụ",
        requiredLevel: 15,
        rarityRates: {
            [ITEM_RARITY.C]: 40,
            [ITEM_RARITY.SM]: 30,
            [ITEM_RARITY.R]: 15,
            [ITEM_RARITY.SR]: 10,
            [ITEM_RARITY.E]: 5,
        },
    },
    {
        name: "🎋 Khu Tre Trăm Năm",
        requiredLevel: 30,
        rarityRates: {
            [ITEM_RARITY.SM]: 25,
            [ITEM_RARITY.R]: 25,
            [ITEM_RARITY.SR]: 20,
            [ITEM_RARITY.E]: 15,
            [ITEM_RARITY.SE]: 10,
            [ITEM_RARITY.L]: 5,
        },
    },
    {
        name: "🌕 Rừng Ánh Trăng",
        requiredLevel: 50,
        rarityRates: {
            [ITEM_RARITY.R]: 20,
            [ITEM_RARITY.SR]: 25,
            [ITEM_RARITY.E]: 20,
            [ITEM_RARITY.SE]: 15,
            [ITEM_RARITY.L]: 10,
            [ITEM_RARITY.SL]: 5,
            [ITEM_RARITY.MY]: 3,
            [ITEM_RARITY.SMY]: 2,
        },
    }
];

// Range số lượng theo độ hiếm của RÌU
const rarityRange = {
    [ITEM_RARITY.R]: 20,
    [ITEM_RARITY.SR]: 15,
    [ITEM_RARITY.E]: 12,
    [ITEM_RARITY.SE]: 10,
    [ITEM_RARITY.L]: 7,
    [ITEM_RARITY.SL]: 5,
    [ITEM_RARITY.MY]: 3,
    [ITEM_RARITY.SMY]: 1,
};

function randomByRarity(rarity) {
    const max = rarityRange[rarity] || 1;
    return Math.floor(Math.random() * max) + 1;
}

function randomRarity(rates) {
    const total = Object.values(rates).reduce((a, b) => a + b, 0);
    const rand = Math.random() * total;
    let sum = 0;
    for (const [rarity, rate] of Object.entries(rates)) {
        sum += rate;
        if (rand < sum) return rarity;
    }
    return ITEM_RARITY.C;
}

const chopCooldowns = new Map();

class ChopController {

    static async chop(userId, areaIndex) {
        try {
            const user = await UserService.findUserById(userId);
            if (!user) throw new Error("Không tìm thấy người dùng.");

            const area = forestAreas[areaIndex];
            if (!area) throw new Error("Khu chặt cây không hợp lệ.");

            // Lấy tool RÌU
            const toolUses = await ToolUse.find({ userId }).populate("item");
            const axe = toolUses.find(t => t.item?.type === ITEM_TYPE.AXE);

            if (!axe || axe.remainingUse <= 0)
                throw new Error("You must use axe first!");

            // Kiểm tra level
            if (user.lvl < area.requiredLevel) {
                throw new Error(`❌ Cần level ${area.requiredLevel} để vào ${area.name}`);
            }

            // Cooldown
            const userCooldown = chopCooldowns.get(userId) || {};
            const lastChop = userCooldown[areaIndex];

            if (lastChop && Date.now() - lastChop < CHOP_COOLDOWN) {
                const remain = Math.ceil((CHOP_COOLDOWN - (Date.now() - lastChop)) / 1000);
                throw new Error(`⏳ Vui lòng chờ ${remain}s để tiếp tục chặt cây.`);
            }

            // Random độ hiếm
            const rarity = randomRarity(area.rarityRates);

            // Tìm resource GỖ theo độ hiếm
            const wood = await Item.findOne({
                type: ITEM_TYPE.WOOD,
                rarity: rarity
            });

            if (!wood) throw new Error(`Không tìm thấy loại gỗ ${rarity}`);

            // Tính số lượng theo độ hiếm rìu
            let quantity = randomByRarity(axe.item.rarity);

            // Tăng vào kho
            let inv = await Inventory.findOne({ userId, item: wood._id });

            if (inv) inv.quantity += quantity;
            else inv = new Inventory({ userId, item: wood._id, quantity: quantity });

            // Giảm độ bền rìu
            if (axe.remainingUse === 1) {
                await ToolUse.findByIdAndDelete(axe._id);
            } else {
                await ToolUse.findByIdAndUpdate(axe._id, { $inc: { remainingUse: -1 } });
            }

            await inv.save();

            // Set cooldown
            userCooldown[areaIndex] = Date.now();
            chopCooldowns.set(userId, userCooldown);

            // Embed kết quả
            const embed = new EmbedBuilder()
                .setTitle("🌲 Kết Quả Chặt Cây 🌲")
                .setDescription(
                    `Bạn đã chặt được **${quantity} ${wood.icon} ${wood.name}**\n` +
                    `⭐ Độ hiếm: **${wood.rarity.toUpperCase()}**\n` +
                    `📍 Khu vực: **${area.name}**`
                )
                .addFields({
                    name: `Độ bền rìu:`,
                    value: `${axe.item.icon} ${axe.item.name} còn ${axe.remainingUse - 1 || 0} lượt sử dụng`
                })
                .setColor(0x34c759)
                .setThumbnail(wood.iconURL || null)
                .setFooter({ text: `${user.globalName} | Cấp độ: ${user.lvl}` })
                .setTimestamp();

            return {
                success: true,
                message: { embeds: [embed] }
            };

        } catch (err) {
            return { success: false, message: err.message };
        }
    }
}

module.exports = ChopController;

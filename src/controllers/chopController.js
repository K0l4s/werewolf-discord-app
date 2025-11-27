const { EmbedBuilder } = require("discord.js");
const { ITEM_TYPE, ITEM_RARITY, DEFAULT_EXP_LVL1, STEP_EXP } = require("../config/constants");
const Inventory = require("../models/Inventory");
const Item = require("../models/Item");
const UserService = require("../services/userService");
const ToolUse = require("../models/ToolUse");
const { rarityIcons } = require("../utils/format");

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
    },
    {
            name: "🔥 Rừng Nguyên Sinh",
            requiredLevel: 55,
            rarityRates: {
                [ITEM_RARITY.R]: 10,
                [ITEM_RARITY.SR]: 20,
                [ITEM_RARITY.E]: 20,
                [ITEM_RARITY.SE]: 15,
                [ITEM_RARITY.L]: 15,
                [ITEM_RARITY.SL]: 10,
                [ITEM_RARITY.MY]: 7,
                [ITEM_RARITY.SMY]: 3,
            },
        },
];

// thay thế rarityRange cũ bằng mapping có ý nghĩa hơn
const dropMaxByRarity = {
    [ITEM_RARITY.C]: 20,   // Common => rớt nhiều nhất
    [ITEM_RARITY.SM]: 16,  // Super Common
    [ITEM_RARITY.R]: 10,   // Rare
    [ITEM_RARITY.SR]: 6,   // Super Rare
    [ITEM_RARITY.E]: 4,    // Epic
    [ITEM_RARITY.SE]: 3,   // Super Epic
    [ITEM_RARITY.L]: 2,    // Legendary
    [ITEM_RARITY.SL]: 2,   // Super Legendary (giữ 2)
    [ITEM_RARITY.MY]: 1,   // Mythic
    [ITEM_RARITY.SMY]: 1,  // Super Mythic (ít nhất)
};

// trả về 1..max (max dựa trên phẩm chất: phẩm chất cao => max nhỏ hơn)
function randomByRarity(rarity) {
    // phòng khi dữ liệu rarity là chuỗi khác -> fallback an toàn
    const max = dropMaxByRarity[rarity] ?? 1;
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
                throw new Error(`<a:deny:1433805273595904070> Cần level ${area.requiredLevel} để vào ${area.name}`);
            }

            // Cooldown
            const userCooldown = chopCooldowns.get(userId) || {};
            const lastChop = userCooldown[areaIndex];

            if (lastChop && Date.now() - lastChop < CHOP_COOLDOWN) {
                const remain = Math.ceil((CHOP_COOLDOWN - (Date.now() - lastChop)) / 1000);
                throw new Error(`<a:alarm:1433097857740574840> Vui lòng chờ ${remain}s để tiếp tục chặt cây.`);
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
            let quantity = Math.ceil(randomByRarity(wood.rarity) * (axe.item.multiplierRate || 1));

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
            user.exp += 10
            let levelsGained = 0;
            let levelUpText = '';
            const originalLevel = user.lvl;
            const expToNextLevel = () => Number(user.lvl) * Number(DEFAULT_EXP_LVL1) * Number(STEP_EXP);

            while (user.exp >= expToNextLevel()) {
                user.exp -= expToNextLevel();
                user.lvl += 1;
                levelsGained += 1;
            }
            if (levelsGained > 0) {
                if (levelsGained === 1) {
                    levelUpText = `<a:rocket:1433022000112074862> **Level Up!** Level ${originalLevel} → **${user.lvl}**`;
                } else {
                    levelUpText = `<a:rocket:1433022000112074862> **Level Up!** +${levelsGained} levels (${originalLevel} → **${user.lvl}**)`;
                }
            }
            await user.save()
            // Set cooldown
            userCooldown[areaIndex] = Date.now();
            chopCooldowns.set(userId, userCooldown);

            // Embed kết quả
            const embed = new EmbedBuilder()
                .setTitle("<a:rwhitesmoke:1433076077642780705> Kết Quả Chặt Cây <a:lwhitesmoke:1433024102636982284>")
                .setDescription(
                    `Bạn đã chặt được **${quantity} ${wood.icon} ${wood.name}**\n` +
                    `<a:yellowarr:1433016945589882891> Độ hiếm: ${rarityIcons[wood.rarity] || ""} **${wood.rarity.toUpperCase()}**\n` +
                    `<a:arrowbluelite:1433016969304735804> Khu vực: **${area.name}**`
                )
                .addFields({
                    name: `Độ bền rìu:`,
                    value: `${axe.item.icon} ${axe.item.name} còn ${axe.remainingUse - 1 || 0} lượt sử dụng`
                })
                .setColor(0x34c759)
                .setThumbnail(wood.iconURL || null)
                .setFooter({ text: `Keldo Chop | Cấp độ: ${user.lvl}` })
                .setTimestamp();
            if (levelUpText) {
                embed.addFields({ name: '<a:yellowsparklies:1437402422371815477> Thành tựu', value: levelUpText, inline: false });
            }
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

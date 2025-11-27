const { EmbedBuilder } = require("discord.js");
const { ITEM_TYPE, ITEM_RARITY, DEFAULT_EXP_LVL1, STEP_EXP } = require("../config/constants");
const Inventory = require("../models/Inventory");
const Item = require("../models/Item");
const UserService = require("../services/userService");
const ToolUse = require("../models/ToolUse");
const UserController = require("./userController");
const { rarityIcons } = require("../utils/format");
const MINE_COOLDOWN = 10 * 1000; // 5 phút
const mineAreas = [
    {
        name: "⛰️ Khu 1: Hẻm Núi Đá Xám",
        requiredLevel: 1,
        rarityRates: {
            [ITEM_RARITY.C]: 60,
            [ITEM_RARITY.SM]: 25,
            [ITEM_RARITY.R]: 10,
            [ITEM_RARITY.SR]: 4,
            [ITEM_RARITY.E]: 1,
        },
    },
    {
        name: "💎 Khu 2: Hang Pha Lê",
        requiredLevel: 15,
        rarityRates: {
            [ITEM_RARITY.C]: 45,
            [ITEM_RARITY.SM]: 25,
            [ITEM_RARITY.R]: 15,
            [ITEM_RARITY.SR]: 10,
            [ITEM_RARITY.E]: 5,
        },
    },
    {
        name: "🌋 Khu 3: Núi Lửa Đỏ",
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
        name: "🌕 Khu 4: Hầm Ánh Trăng",
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
        name: "🔥 Khu 5: Lõi Trái Đất",
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

const mineCooldowns = new Map();
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
class MineController {

    static async mine(userId, areaIndex) {
        try {
            // const user = await User.findOne({ userId });
            const user = await UserService.findUserById(userId)

            if (!user) throw new Error("Không tìm thấy người dùng.");

            const area = mineAreas[areaIndex];
            if (!area) throw new Error("Khu đào không hợp lệ.");
            const toolUses = await ToolUse.find({ userId: userId }).populate("item");
            console.log(toolUses)
            const item = toolUses.find(t => t.item?.type === ITEM_TYPE.PICKACE);
            if (!item || item.remainingUse <= 0)
                throw new Error("You must use pickage first!")
            console.log(item)
            // check level mở khóa
            if (user.lvl < area.requiredLevel) {
                throw new Error(`<a:deny:1433805273595904070> Cần level ${area.requiredLevel} để vào ${area.name}`);
            }

            // check cooldown riêng từng khu
            const userCooldown = mineCooldowns.get(userId) || {};
            const lastMine = userCooldown[areaIndex];
            if (lastMine && Date.now() - lastMine < MINE_COOLDOWN) {
                const remain = Math.ceil((MINE_COOLDOWN - (Date.now() - lastMine)) / 1000);
                throw new Error(`<a:alarm:1433097857740574840> Hãy chờ ${remain}s trước khi đào tiếp khu này.`);
            }

            // random kết quả
            const rarity = randomRarity(area.rarityRates);
            console.log(rarity)

            const mineral = await Item.findOne({
                type: ITEM_TYPE.MINERAL,
                rarity: rarity
                // rarity: Object.keys(ITEM_RARITY).find(key => ITEM_RARITY[key] === rarity),
            });

            if (!mineral) throw new Error(`Không tìm thấy khoáng thạch loại ${rarity}`);

            // cập nhật inventory
            let inv = await Inventory.findOne({ userId, item: mineral._id });
            let quantity = Math.ceil(randomByRarity(mineral.rarity) * (item.item.multiplierRate || 1));
            // if (rarity)
            if (inv) inv.quantity += quantity;
            else inv = new Inventory({ userId, item: mineral._id, quantity: quantity });
            if (item.remainingUse === 1) {
                // Nếu chỉ còn 1 thì xóa luôn document
                await ToolUse.findByIdAndDelete(item._id);
            } else {
                // Ngược lại giảm số lượng
                await ToolUse.findByIdAndUpdate(
                    item._id,
                    { $inc: { remainingUse: -1 } }
                )
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
            // cập nhật cooldown
            userCooldown[areaIndex] = Date.now();
            mineCooldowns.set(userId, userCooldown);
            const embed = new EmbedBuilder()
                .setTitle("<a:rwhitesmoke:1433076077642780705> Kết Quả Khai Thác <a:lwhitesmoke:1433024102636982284>")
                .setDescription(
                    `Bạn đã đào được **${quantity} ${mineral.icon} ${mineral.name}**\n` +
                    `<a:yellowarr:1433016945589882891> Độ hiếm: ${rarityIcons[mineral.rarity] || ""} **${mineral.rarity.toUpperCase()}**\n` +
                    `<a:arrowbluelite:1433016969304735804> Khu vực: **${area.name}**`
                )
                .addFields({ name: `Độ bền ${item.item.icon} ${item.item.name}:`, value: `Còn lại ${item.remainingUse - 1 || 0} lượt sử dụng` })
                .setColor(
                    mineral.rarity === "common" ? 0xaaaaaa :
                        mineral.rarity === "uncommon" ? 0x00ff99 :
                            mineral.rarity === "rare" ? 0x007bff :
                                mineral.rarity === "epic" ? 0xbf00ff :
                                    mineral.rarity === "legendary" ? 0xffd700 :
                                        0xffffff
                )
                .setThumbnail(mineral.iconURL || "https://cdn-icons-png.flaticon.com/512/854/854878.png")
                .setFooter({
                    text: `Keldo Mine | Cấp độ: ${user.lvl}`,
                    // iconURL: user.avatar || undefined
                })
                .setTimestamp();
            if (levelUpText) {
                embed.addFields({ name: '<a:yellowsparklies:1437402422371815477> Thành tựu', value: levelUpText, inline: false });
            }
            return {
                success: true,
                message: {
                    embeds: [embed]
                }
            };
        } catch (e) {
            return {
                success: false,
                message: e.message,
            };
        }
    }


}

module.exports = MineController
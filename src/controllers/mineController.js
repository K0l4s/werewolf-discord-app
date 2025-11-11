const { EmbedBuilder } = require("discord.js");
const { ITEM_TYPE, ITEM_RARITY } = require("../config/constants");
const Inventory = require("../models/Inventory");
const Item = require("../models/Item");
const UserService = require("../services/userService")
const MINE_COOLDOWN = 5 * 60 * 1000; // 5 phút
const mineAreas = [
    {
        name: "⛰️ Khu 1: Hẻm Núi Đá Xám",
        requiredLevel: 10,
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
        requiredLevel: 30,
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
        requiredLevel: 60,
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
        requiredLevel: 90,
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
        requiredLevel: 120,
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

            if (!mineral) throw new Error(`Không tìm thấy khoáng vật loại ${rarity}`);

            // cập nhật inventory
            let inv = await Inventory.findOne({ userId, item: mineral._id });
            if (inv) inv.quantity += 1;
            else inv = new Inventory({ userId, item: mineral._id, quantity: 1 });
            await inv.save();

            // cập nhật cooldown
            userCooldown[areaIndex] = Date.now();
            mineCooldowns.set(userId, userCooldown);
            const embed = new EmbedBuilder()
                .setTitle("<a:hammer:1437444063635706037> Kết Quả Khai Thác")
                .setDescription(
                    `Bạn đã đào được **${mineral.icon} ${mineral.name}**\n` +
                    `> Độ hiếm: **${mineral.rarity.toUpperCase()}**\n` +
                    `> Khu vực: **${area.name}**`
                )
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
                    text: `${user.globalName} | Cấp độ: ${user.lvl}`,
                    iconURL: user.avatar || undefined
                })
                .setTimestamp();
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
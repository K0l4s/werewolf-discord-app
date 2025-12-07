const { EmbedBuilder } = require("discord.js");
const BoxDropRate = require("../models/BoxDropRate");
const Inventory = require("../models/Inventory");
const Item = require("../models/Item");
const ItemService = require("../services/itemService");

class BoxController {
    static randomDrop(dropList) {
        // Tính tổng tỷ lệ
        const total = dropList.reduce((acc, cur) => acc + cur.dropRate, 0)

        // Random từ 0 → total
        let random = Math.random() * total

        for (const drop of dropList) {
            if (random < drop.dropRate) {
                return drop
            }
            random -= drop.dropRate
        }

        return null
    }
    static async openBox(itemRef, userId, quantity) {
        try {
            // 0. Limit số lượng mở 1 lần
            if (quantity > 15) quantity = 15;

            const item = await ItemService.getItemByRef(itemRef);
            if (!item) throw new Error("Not found item");

            const inv = await Inventory.findOne({ item: item._id, userId });
            if (!inv || inv.quantity < quantity) {
                throw new Error(`You don't have enough ${item.icon} **${item.name}**`);
            }

            const box = await BoxDropRate.findOne({ box: item._id });
            if (!box) throw new Error("This item can't open!");

            const dropList = box.items;
            if (!dropList || dropList.length === 0) {
                throw new Error("This box has no drop items!");
            }

            // Kết quả tổng sau khi mở nhiều box
            const finalRewards = new Map(); // id → { quantity, dropRate }

            // ===============================
            // 1. Lặp theo số lượng box
            // ===============================
            for (let i = 0; i < quantity; i++) {
                const rawRewards = [];

                // Random cho từng box
                for (const drop of dropList) {
                    if (Math.random() < drop.dropRate) {
                        const qty = drop.maxQuantity > 1
                            ? Math.floor(Math.random() * drop.maxQuantity) + 1
                            : 1;

                        rawRewards.push({
                            id: drop.id,
                            quantity: qty,
                            dropRate: drop.dropRate
                        });
                    }
                }

                // Nếu box không rớt gì → bỏ qua box đó
                if (rawRewards.length === 0) continue;

                // Giới hạn số item theo maxDrop
                const limited = rawRewards
                    .sort((a, b) => b.dropRate - a.dropRate)
                    .slice(0, box.maxDrop);

                // Gộp vào finalRewards
                for (const r of limited) {
                    if (!finalRewards.has(r.id)) {
                        finalRewards.set(r.id, {
                            quantity: r.quantity,
                            dropRate: r.dropRate
                        });
                    } else {
                        finalRewards.get(r.id).quantity += r.quantity;
                    }
                }
            }

            // ===============================
            // 2. Trừ số lượng box đã mở
            // ===============================
            inv.quantity -= quantity;
            if (inv.quantity <= 0) await Inventory.deleteOne({ _id: inv._id });
            else await inv.save();

            // ===============================
            // 3. Cộng item rơi vào inventory
            // ===============================
            for (const [id, rw] of finalRewards) {
                let rewardInv = await Inventory.findOne({ userId, item: id });

                if (!rewardInv) {
                    rewardInv = new Inventory({
                        userId,
                        item: id,
                        quantity: rw.quantity
                    });
                } else {
                    rewardInv.quantity += rw.quantity;
                }

                await rewardInv.save();
            }

            // ===============================
            // 4. Build embed result
            // ===============================
            const detailed = [];
            for (const [id, rw] of finalRewards) {
                const rwItem = await Item.findById(id);
                detailed.push({
                    name: rwItem.name,
                    icon: rwItem.icon,
                    quantity: rw.quantity
                });
            }

            const fields = detailed.map(it => ({
                name: `${it.icon} ${it.name}`,
                value: `Số lượng: **${it.quantity}**`,
                inline: true
            }));

            const embed = new EmbedBuilder()
                .setTitle(`🎁 Bạn đã mở x${quantity} ${item.icon} ${item.name}!`)
                .setDescription(`Bạn nhận được **${detailed.length}** loại vật phẩm:`)
                .addFields(fields)
                .setColor(0xffd700)
                .setTimestamp();

            return {
                success: true,
                message: { embeds: [embed] }
            };
        } catch (e) {
            return {
                success: false,
                message: e.message
            }
        }
    }



}

module.exports = BoxController
const { EmbedBuilder } = require("discord.js");
const BoxDropRate = require("../models/BoxDropRate");
const Inventory = require("../models/Inventory");
const Item = require("../models/Item");
const ItemService = require("../services/itemService");
const { default: mongoose } = require("mongoose");

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
        if (quantity > 15) quantity = 15;

        const item = await ItemService.getItemByRef(itemRef);
        if (!item) throw new Error("Item not found");

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

        // ==============================================
        // 1. PRELOAD item info để không cần findById 100 lần
        // ==============================================
        const itemIds = dropList.map(i => i.id);
        const itemDocs = await Item.find({ _id: { $in: itemIds } });
        const itemMap = new Map();
        itemDocs.forEach(it => itemMap.set(it._id.toString(), it));

        // ==============================================
        // 2. DROP TỪNG LẦN MỞ
        // ==============================================
        const allDrops = []; 
        const summary = new Map();

        for (let i = 0; i < quantity; i++) {
            const raw = [];

            for (const drop of dropList) {
                if (Math.random() < drop.dropRate) {
                    const qty = drop.maxQuantity > 1
                        ? Math.floor(Math.random() * drop.maxQuantity) + 1
                        : 1;

                    raw.push({
                        id: drop.id.toString(),
                        quantity: qty,
                        dropRate: drop.dropRate
                    });
                }
            }

            if (raw.length === 0) {
                allDrops.push([]); // lần này không rớt gì
                continue;
            }

            const limited = raw
                .sort((a, b) => b.dropRate - a.dropRate)
                .slice(0, box.maxDrop);

            allDrops.push(limited);

            // Gộp summary
            for (const r of limited) {
                if (!summary.has(r.id)) summary.set(r.id, r.quantity);
                else summary.set(r.id, summary.get(r.id) + r.quantity);
            }
        }

        // ==============================================
        // 3. TRỪ BOX
        // ==============================================
        inv.quantity -= quantity;
        if (inv.quantity <= 0) await Inventory.deleteOne({ _id: inv._id });
        else await inv.save();

        // ==============================================
        // 4. CỘNG ITEM RƠI VÀO INVENTORY
        // ==============================================
        for (const [id, qty] of summary) {
            const objId = new mongoose.Types.ObjectId(id);

            let rewardInv = await Inventory.findOne({ userId, item: objId });

            if (!rewardInv) {
                rewardInv = new Inventory({
                    userId,
                    item: objId,
                    quantity: qty
                });
            } else {
                rewardInv.quantity += qty;
            }

            await rewardInv.save();
        }

        // ==============================================
        // 5. BUILD EMBED CHI TIẾT
        // ==============================================
        const allDropsDesc = [];
        let count = 1;

        for (const dropListOne of allDrops) {
            if (dropListOne.length === 0) {
                allDropsDesc.push(`**Lần ${count}**: Không rớt gì 😢`);
            } else {
                let line = "";

                for (const dr of dropListOne) {
                    const rwItem = itemMap.get(dr.id);
                    line += `• ${rwItem.icon} ${rwItem.name} x **${dr.quantity}**\n`;
                }

                allDropsDesc.push(`**Lần ${count}**:\n${line}`);
            }

            count++;
        }

        // Summary text
        let summaryText = "";
        for (const [id, qty] of summary) {
            const it = itemMap.get(id);
            summaryText += `${it.icon} ${it.name}: **${qty}**\n`;
        }

        const embed = new EmbedBuilder()
            .setTitle(`🎁 Mở ${quantity} ${item.icon} ${item.name}`)
            .setDescription(`**🎲 Chi tiết từng lần mở:**\n\n${allDropsDesc.join("\n")}`)
            .addFields({
                name: "📦 Tổng kết",
                value: summaryText || "Không có vật phẩm nào."
            })
            .setColor(0xffd700)
            .setTimestamp();

        return { success: true, message: { embeds: [embed] } };

    } catch (e) {
        return {
            success: false,
            message: e.message
        };
    }
}





}

module.exports = BoxController
const { EmbedBuilder } = require("discord.js");
const Inventory = require("../models/Inventory");
const Item = require("../models/Item");

class SellController {

    // ============================
    // 1. AUTO SELL (bán tự động 30 món)
    // ============================
    static async sellAuto(userId) {
        try {
            const items = await Inventory.find({ userId }).populate("item").limit(30);
            const sellable = items.filter(i => i.item.sell > 0 && i.quantity > 0);

            if (sellable.length === 0) {
                return new EmbedBuilder()
                    .setTitle("❌ Không có vật phẩm nào có thể bán!")
                    .setColor("Red");
            }

            let totalEarned = 0;
            let lines = [];

            for (const inv of sellable) {
                const earn = inv.item.sell * inv.quantity;
                totalEarned += earn;
                lines.push(`${inv.item.icon} **${inv.item.name}** × ${inv.quantity} → 💰 **${earn}**`);

                await Inventory.deleteOne({ _id: inv._id });
            }

            return new EmbedBuilder()
                .setTitle("💰 Bán Tự Động")
                .setColor("Green")
                .setDescription(`${lines.join("\n")}\n\n👉 **Tổng thu được: ${totalEarned}**`);

        } catch (err) {
            console.error(err);
            return new EmbedBuilder()
                .setTitle("❌ Lỗi hệ thống!")
                .setColor("Red");
        }
    }

    // ============================
    // 2. BÁN LẺ TỪNG MÓN
    // ============================
    static async sellOne(userId, itemRef, quantity) {
        try {
            const item = await Item.findOne({ itemRef });
            if (!item) {
                return new EmbedBuilder().setTitle("❌ Không tìm thấy vật phẩm!").setColor("Red");
            }

            if (!item.sell || item.sell <= 0) {
                return new EmbedBuilder().setTitle("❌ Vật phẩm này không thể bán!").setColor("Red");
            }

            const inv = await Inventory.findOne({ userId, item: item._id });
            if (!inv || inv.quantity <= 0) {
                return new EmbedBuilder()
                    .setTitle("❌ Bạn không sở hữu vật phẩm này!")
                    .setColor("Red");
            }

            if (quantity <= 0) quantity = 1;
            if (quantity > inv.quantity) {
                return new EmbedBuilder()
                    .setTitle("❌ Bạn không đủ số lượng!")
                    .setDescription(`Bạn có: **${inv.quantity}**`)
                    .setColor("Red");
            }

            const earn = quantity * item.sell;

            inv.quantity -= quantity;
            if (inv.quantity <= 0) await Inventory.deleteOne({ _id: inv._id });
            else await inv.save();

            return new EmbedBuilder()
                .setTitle("💰 Bán Vật Phẩm")
                .setColor("Green")
                .setDescription(
                    `${item.icon} **${item.name}** × ${quantity}\n👉 Thu được: **${earn}**`
                );

        } catch (err) {
            console.error(err);
            return new EmbedBuilder().setTitle("❌ Lỗi hệ thống!").setColor("Red");
        }
    }

    // ============================
    // 3. BÁN THEO TYPE (WOOD, FRUIT, MINERAL,...)
    // ============================
    static async sellByType(userId, type) {
        try {
            // Lấy inventory + populate item coi type có đúng không
            const items = await Inventory.find({ userId }).populate("item");

            // Lọc theo type và chỉ bán được (sell > 0)
            const filtered = items.filter(
                i => i.item.type === type && i.item.sell > 0 && i.quantity > 0
            );

            if (filtered.length === 0) {
                return new EmbedBuilder()
                    .setTitle("❌ Không có vật phẩm nào thuộc loại này có thể bán!")
                    .setColor("Red");
            }

            let total = 0;
            let lines = [];

            for (const inv of filtered) {
                const earn = inv.item.sell * inv.quantity;
                total += earn;

                lines.push(`${inv.item.icon} **${inv.item.name}** × ${inv.quantity} → 💰 **${earn}**`);

                // Xoá item sau bán
                await Inventory.deleteOne({ _id: inv._id });
            }

            return new EmbedBuilder()
                .setTitle(`💰 Bán Theo Loại: ${type}`)
                .setColor("Green")
                .setDescription(`${lines.join("\n")}\n\n👉 **Tổng thu được: ${total}**`);

        } catch (err) {
            console.error(err);
            return new EmbedBuilder()
                .setTitle("❌ Lỗi hệ thống khi bán theo loại!")
                .setColor("Red");
        }
    }

}

module.exports = SellController;

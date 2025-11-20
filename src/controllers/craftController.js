const { EmbedBuilder } = require("discord.js");
const CraftItem = require("../models/CraftItem");
const ItemService = require("../services/itemService");
const UserService = require("../services/userService");
const Inventory = require("../models/Inventory");
const Item = require("../models/Item");
class CraftController {
    static async craftItem(userId, itemRef, quantity = 1) {
        try {
            const item = await ItemService.getItemByRef(itemRef);
            if (!item) throw new Error("Vật phẩm không tồn tại.");

            const craft = await CraftItem.findOne({ item: item._id })
                .populate("components.component");

            if (!craft) throw new Error("Vật phẩm này không thể chế tạo.");

            const user = await UserService.findUserById(userId);
            if (!user) throw new Error("Không tìm thấy người dùng.");

            // kiểm tra cấp độ
            const requiredLevel = craft.conditions?.requiredLevel || 1;
            if (user.lvl < requiredLevel) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setDescription(`❌ Cần cấp độ **${requiredLevel}** để chế tạo **${item.name}**.`);
                return { embeds: [embed] };
            }

            // kiểm tra nguyên liệu
            const components = craft.components || [];
            const missingItems = [];

            for (const comp of components) {
                const inv = await Inventory.findOne({ userId, item: comp.component._id });
                const requiredQty = comp.quantity * quantity;
                if (!inv || inv.quantity < requiredQty) {
                    missingItems.push(`${comp.component.icon} ${comp.component.name} x${requiredQty}`);
                }
            }

            if (missingItems.length > 0) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("❌ Thiếu nguyên liệu để chế tạo:")
                    .setDescription(missingItems.join("\n"));
                return { embeds: [embed] };
            }

            // trừ nguyên liệu trước
            for (const comp of components) {
                const requiredQty = comp.quantity * quantity;

                const updated = await Inventory.findOneAndUpdate(
                    { userId, item: comp.component._id },
                    { $inc: { quantity: -requiredQty } },
                    { new: true } // trả về document sau khi cập nhật
                );

                // Nếu không còn tài nguyên hoặc âm thì xóa luôn
                if (updated && updated.quantity <= 0) {
                    await Inventory.deleteOne({ _id: updated._id });
                }
            }


            // ===============================
            // 🎲 TỶ LỆ THÀNH CÔNG / THẤT BẠI
            // ===============================
            const successRate = craft.successRate ?? 1; // mặc định 100%
            const isSuccess = Math.random() < successRate;

            if (!isSuccess) {
                // ❌ thất bại – mất nguyên liệu, không nhận item
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("💥 Chế tạo thất bại!")
                    .setDescription(
                        `Rất tiếc! Bạn đã **thất bại** khi chế tạo **${item.icon} ${item.name}**.\n` +
                        `Toàn bộ nguyên liệu đã bị **tiêu hao**.`
                    )
                    .setFooter({ text: "Hệ thống chế tạo vật phẩm" });

                return { embeds: [embed] };
            }

            // ===============================
            // 🎉 THÀNH CÔNG – CỘNG VẬT PHẨM
            // ===============================
            await Inventory.findOneAndUpdate(
                { userId, item: item._id },
                { $inc: { quantity } },
                { upsert: true }
            );

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("<a:confetti:1433017019141197895> Chế tạo thành công!")
                .setDescription(`Bạn đã chế tạo được **${item.icon} ${item.name} x${quantity}**`)
                .setFooter({ text: "Hệ thống chế tạo vật phẩm" });

            return { embeds: [embed] };

        } catch (err) {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setDescription(`⚠️ Lỗi: ${err.message}`);
            return { embeds: [embed] };
        }
    }

}

module.exports = CraftController;
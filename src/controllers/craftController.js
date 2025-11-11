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

            console.log(item);
            const all = await CraftItem.find().lean();
            console.log(JSON.stringify(all, null, 2));

            const craft = await CraftItem.findOne({ item: item._id }).populate("item.components.component");
            console.log(craft);

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
                    const com = await Item.findById(comp.component._id);
                    missingItems.push(`${com.icon} ${com.name} x${requiredQty}`);
                }
            }

            if (missingItems.length > 0) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("❌ Thiếu nguyên liệu để chế tạo:")
                    .setDescription(missingItems.join("\n"));
                return { embeds: [embed] };
            }

            // đủ nguyên liệu => trừ và thêm item
            for (const comp of components) {
                const requiredQty = comp.quantity * quantity;
                await Inventory.findOneAndUpdate(
                    { userId, item: comp.component._id },
                    { $inc: { quantity: -requiredQty } }
                );
            }

            // cộng vật phẩm chế tạo
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
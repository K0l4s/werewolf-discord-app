const { EmbedBuilder } = require("discord.js")
const UserService = require("../services/userService");
const ItemService = require("../services/itemService");

const Inventory = require("../models/Inventory");
const Item = require("../models/Item");
const { ITEM_TYPE } = require("../config/constants");
const ToolUse = require("../models/ToolUse");

class ToolUseController {
    static async usedTool(userId, toolRef) {
        try {
            // const user = await UserService.findUserById(userId)
            const item = await ItemService.getItemByRef(toolRef)
            if (!item)
                throw new Error("Not found item")
            if (!item.limitedUse)
                throw new Error(`Can't use **${item.name}**!`)
            let inv = await Inventory.findOne({ userId, item: item._id });
            if (!inv || inv.quantity <= 0)
                throw new Error(`You don't have enough ${item.name}`)
            const toolUses = await ToolUse.find({ userId: userId }).populate("item");

            const duplicate = toolUses.some(t => t.item?.type === item.type);

            if (duplicate) {
                throw new Error(`You already have an active tool of type **${item.type}**!`);
            }

            // Giảm số lượng item trong inventory
            if (inv.quantity === 1) {
                // Nếu chỉ còn 1 thì xóa luôn document
                await Inventory.findByIdAndDelete(inv._id);
            } else {
                // Ngược lại giảm số lượng
                await Inventory.findByIdAndUpdate(
                    inv._id,
                    { $inc: { quantity: -1 } }
                );
            }
            const newToolUse = await ToolUse.create({
                item: item._id,
                remainingUse:item.limitedUse,
                userId:userId
            })
            const embed = new EmbedBuilder()
            .setTitle("Trang bị công cụ thành công")
            .setDescription(`Bạn đã sử dụng ${item.icon} ${item.name} thành công! \nCòn lại ${newToolUse.remainingUse} lần sử dụng`)
            .setFooter({text:"Keldo Bot"})
            return {
                success:true,
                message: {embeds:[embed]}
            }
        } catch (e) {
            return {
                success: false,
                message: e.message
            }
        }
    }
}

module.exports = ToolUseController
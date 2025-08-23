const Inventory = require("../models/Inventory");

class InventoryService {
    static async createNewSlots(userId, itemId) {
        const inv = new Inventory({
            userId: userId,
            item: itemId,
            quantity: 0
        })
        return inv
    }
    static async findItemsAndCreate(userId, itemId) {
        let inventory = await Inventory.findOne({ userId }).populate("item");
        if (!inventory)
            inventory = await this.createNewSlots(userId, itemId)
        return inventory;
    }
}

module.exports = InventoryService;
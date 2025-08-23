
const { } = require('discord.js');
const Item = require('../models/Item');

class ItemService {
    static async getAllItems(page = 1, limit = 10) {
        try {
            // tính toán số bản ghi bỏ qua
            const skip = (page - 1) * limit;

            // lấy dữ liệu phân trang
            const items = await Item.find()
                .skip(skip)
                .limit(limit);

            // tổng số bản ghi (để tính tổng số trang)
            const totalItems = await Item.countDocuments();

            return {
                items,
                totalItems,
                currentPage: page,
                totalPages: Math.ceil(totalItems / limit)
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
    static async getItemById(itemId) {
        const item = await Item.findById(itemId);
        return item;
    }
    static async getItemByRef(itemRef) {
        const item = await Item.findOne({ itemRef: itemRef })
        return item;
    }
}
module.exports = ItemService;
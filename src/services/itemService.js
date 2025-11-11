
const { } = require('discord.js');
const Item = require('../models/Item');

class ItemService {
    static async getAllItems(page = 1, limit = 5, sortBy = 'name', sortOrder = 'asc', rarityFilter = 'all', typeFilter = 'all', isBuyFilter = true) {
        // Xây dựng query lọc
        const filter = {};
        if (rarityFilter !== 'all') filter.rarity = rarityFilter;
        if (typeFilter !== 'all') filter.type = typeFilter;
        // isBuy required is false. Only get items that can be bought or not have isBuy field
        if (isBuyFilter) {
            filter.$or = [{ isBuy: true }, { isBuy: { $exists: false } }];
        }

        // Xây dựng options sắp xếp
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Tính toán skip
        const skip = (page - 1) * limit;

        // Thực hiện truy vấn
        const items = await Item.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);

        const totalItems = await Item.countDocuments(filter);
        const totalPages = Math.ceil(totalItems / limit);

        return {
            items,
            totalItems,
            currentPage: page,
            totalPages
        };
    }
    // static async getAllItems(page = 1, limit = 10) {
    //     try {
    //         // tính toán số bản ghi bỏ qua
    //         const skip = (page - 1) * limit;

    //         // lấy dữ liệu phân trang
    //         const items = await Item.find()
    //             .skip(skip)
    //             .limit(limit);

    //         // tổng số bản ghi (để tính tổng số trang)
    //         const totalItems = await Item.countDocuments();

    //         return {
    //             items,
    //             totalItems,
    //             currentPage: page,
    //             totalPages: Math.ceil(totalItems / limit)
    //         };
    //     } catch (error) {
    //         throw new Error(error.message);
    //     }
    // }
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
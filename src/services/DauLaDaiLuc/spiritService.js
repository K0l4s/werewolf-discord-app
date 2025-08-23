const Spirit = require('../../models/DauLaDaiLuc/Spirit');


class SpiritService {
    static async getAllSpirits(page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            const spirits = await Spirit.find()
                .sort({ rarity: -1, name: 1 }) // Sắp xếp theo độ hiếm giảm dần
                .skip(skip)
                .limit(limit);

            const total = await Spirit.countDocuments();
            const totalPages = Math.ceil(total / limit);

            return { spirits, page, totalPages, total };
        } catch (error) {
            console.error('❌ Lỗi khi lấy danh sách Vũ Hồn:', error);
            throw error;
        }
    }
    static async getSpiritByRef(ref) {
        try {
            return await Spirit.findOne({ ref });
        } catch (error) {
            console.error('❌ Lỗi khi tìm Vũ Hồn theo ref:', error);
            throw error;
        }
    }
}

module.exports = SpiritService;
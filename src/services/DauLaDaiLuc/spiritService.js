const Spirit = require('../../models/DauLaDaiLuc/Spirit');
const SpiritMaster = require('../../models/DauLaDaiLuc/SpiritMaster');


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
    static async getSpiritsByUserId(userId) {
        const spirits = await SpiritMaster.find({
            userId: userId
        })
        return spirits;
    }
    static async getSpiritByRef(ref) {
        try {
            return await Spirit.findOne({ ref });
        } catch (error) {
            console.error('❌ Lỗi khi tìm Vũ Hồn theo ref:', error);
            throw error;
        }
    }
    static async getSpiritById(id) {
        try {
            return await Spirit.findById(id);
        } catch (error) {
            console.error('❌ Lỗi khi tìm Vũ Hồn theo ref:', error);
            throw error;
        }
    }
    static async getSpiritMasters(userId) {
        const masters = await SpiritMaster.aggregate([
            { $match: { userId } },
            {
                $lookup: {
                    from: "spirits", // tên collection thật (plural, lowercase)
                    localField: "spirit",
                    foreignField: "_id",
                    as: "spirit"
                }
            },
            { $unwind: "$spirit" },
            {
                $lookup: {
                    from: "spiritrings", // tên collection thật của SpiritRing
                    localField: "equipRing",
                    foreignField: "_id",
                    as: "equipRing"
                }
            }
        ]);
        return masters
    }
}
module.exports = SpiritService;
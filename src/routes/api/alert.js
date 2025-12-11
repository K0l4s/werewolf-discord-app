// routes/notification.js
const express = require('express');
const router = express.Router();
const Notification = require("../../models/Notification");
const { authenticateAndCheckPermission } = require('../../utils/checkPermission');
const EmbedTemplate = require('../../models/EmbedTemplate');

// Áp dụng middleware xác thực cho tất cả routes
// router.use("/:guildId", authenticateAndCheckPermission);
router.get("/:guildId", async (req, res) => {
    try {
        const { guildId } = req.params;

        const config = await Notification.findOne({ guildId })
            .populate("channels.embed");
        res.status(200).json({
            success: true,
            message: config.channels
        })
    } catch (e) {
        console.error('Error creating/updating notification:', e);
        res.status(500).json({
            success: false,
            message: e.message || 'Lỗi khi tạo hoặc cập nhật cấu hình server'
        });
    }
})
router.delete("/:guildId/:alertId", async (req, res) => {
    try {
        const { guildId, alertId } = req.params;

        // Sử dụng findOneAndUpdate với toán tử $pull
        const updatedNotification = await Notification.findOneAndUpdate(
            { guildId: guildId }, // 1. Tìm document theo guildId
            {
                $pull: {
                    channels: { _id: alertId } // 2. Xóa phần tử trong mảng channels có _id trùng khớp
                }
            },
            { new: true } // 3. Trả về dữ liệu mới sau khi đã update
        );

        // Kiểm tra xem Guild có tồn tại không
        if (!updatedNotification) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cấu hình cho Guild này."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Xóa alert thành công!",
            data: updatedNotification // Trả về data mới để frontend cập nhật lại state
        });

    } catch (error) {
        console.error("Lỗi khi xóa alert:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi Server nội bộ",
            error: error.message
        });
    }
});
// Lấy cấu hình server theo guildId
router.post('/:guildId', async (req, res) => {
    try {
        const { guildId } = req.params;
        // Lấy message và các field khác từ body
        const { channelId, channelType, message, isEmbed, imageUrl, embedData } = req.body;

        // 1. Validate cơ bản
        if (!channelId || !channelType) {
            throw new Error("Missing required fields: channelId, channelType");
        }

        // 2. Validate Embed (Nếu bật embed thì bắt buộc phải có data)
        if (isEmbed) {
            if (!embedData || !embedData.title?.trim() || !embedData.description?.trim()) {
                throw new Error("Khi bật chế độ Embed, bắt buộc phải nhập Tiêu đề và Nội dung!");
            }
        }

        let config = await Notification.findOne({ guildId });

        // =========================================================
        // TRƯỜNG HỢP 1: CHƯA CÓ CONFIG -> TẠO MỚI
        // =========================================================
        if (!config) {
            let embedId = null;

            // Nếu bật embed thì tạo template
            if (isEmbed) {
                const embed = await EmbedTemplate.create(embedData);
                embedId = embed._id;
            }

            config = await Notification.create({
                guildId,
                channels: [{
                    channelId,
                    channelType,
                    message,       // Lưu message bình thường
                    isEmbed,       // Trạng thái bật/tắt embed
                    embed: embedId,// ID embed (nếu có)
                    imageUrl
                }]
            });

            return res.json({ success: true, data: config });
        }

        // =========================================================
        // TRƯỜNG HỢP 2: ĐÃ CÓ CONFIG -> CẬP NHẬT HOẶC THÊM CHANNEL
        // =========================================================

        // Tìm xem channelType này đã được cấu hình chưa
        const idx = config.channels.findIndex(ch => ch.channelType === channelType);

        if (idx !== -1) {
            // --- A. CẬP NHẬT CHANNEL CŨ ---
            const oldChannel = config.channels[idx];

            // 1. Cập nhật các thông tin chung (LUÔN CHẠY)
            oldChannel.channelId = channelId;
            oldChannel.message = message;     // Cập nhật message bất kể isEmbed ra sao
            oldChannel.imageUrl = imageUrl || null;
            oldChannel.isEmbed = isEmbed;

            // 2. Xử lý logic Embed
            if (isEmbed) {
                // Nếu đang BẬT Embed
                if (oldChannel.embed) {
                    // Đã có template -> Update
                    await EmbedTemplate.findByIdAndUpdate(oldChannel.embed, embedData, { new: true });
                } else {
                    // Chưa có template -> Tạo mới
                    const newEmbed = await EmbedTemplate.create(embedData);
                    oldChannel.embed = newEmbed._id;
                }
            } else {
                // Nếu đang TẮT Embed
                if (oldChannel.embed) {
                    // Xoá template cũ cho sạch database
                    await EmbedTemplate.findByIdAndDelete(oldChannel.embed);
                    oldChannel.embed = null; // Quan trọng: Xóa reference trong config
                }
            }

            await config.save();
            return res.json({ success: true, data: config });
        }

        // --- B. THÊM CHANNEL MỚI VÀO CONFIG CÓ SẴN ---
        let embedId = null;
        if (isEmbed) {
            const embed = await EmbedTemplate.create(embedData);
            embedId = embed._id;
        }

        config.channels.push({
            channelId,
            channelType,
            message,        // Vẫn lưu message
            isEmbed,
            embed: embedId,
            imageUrl
        });

        await config.save();
        res.json({ success: true, data: config });

    } catch (error) {
        console.error('Error creating/updating notification:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Lỗi khi tạo hoặc cập nhật cấu hình server'
        });
    }
});



module.exports = router;
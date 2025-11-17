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
router.delete("/:guildId", async (req, res) => {

})
// Lấy cấu hình server theo guildId
router.post('/:guildId', async (req, res) => {
    try {
        const { guildId } = req.params;
        const { channelId, channelType, message, isEmbed, imageUrl, embedData } = req.body;

        if (!channelId || !channelType) {
            throw new Error("Missing required fields: channelId, channelType");
        }

        let config = await Notification.findOne({ guildId });

        // Nếu chưa có config → tạo luôn
        if (!config) {
            let embedId = null;

            if (isEmbed) {
                const embed = await EmbedTemplate.create(embedData);
                embedId = embed._id;
            }

            config = await Notification.create({
                guildId,
                channels: [{
                    channelId,
                    channelType,
                    message: message,
                    isEmbed,
                    embed: embedId,
                    imageUrl
                }]
            });

            return res.json({ success: true, data: config });
        }

        // Nếu đã có config → tìm channel
        const idx = config.channels.findIndex(ch => ch.channelType === channelType);


        if (idx !== -1) {
            const oldChannel = config.channels[idx];

            // Nếu REQUEST muốn dùng embed
            if (isEmbed) {
                // Nếu channel đã có embed → UPDATE template cũ
                if (oldChannel.embed) {
                    await EmbedTemplate.findByIdAndUpdate(
                        oldChannel.embed,
                        embedData,
                        { new: true }
                    );
                } else {
                    // Nếu chưa có embed → tạo embed mới
                    const newEmbed = await EmbedTemplate.create(embedData);
                    oldChannel.embed = newEmbed._id;
                }

                oldChannel.message = null;
                oldChannel.isEmbed = true;

            } else {
                // Nếu REQUEST KHÔNG muốn dùng embed
                if (oldChannel.embed) {
                    await EmbedTemplate.findByIdAndDelete(oldChannel.embed);
                }

                oldChannel.embed = null;
                oldChannel.isEmbed = false;
                oldChannel.message = message;
            }

            // Update các field chung
            oldChannel.channelId = channelId;
            oldChannel.channelType = channelType;
            oldChannel.imageUrl = imageUrl || null;

            await config.save();

            return res.json({ success: true, data: config });
        }


        let embedId = null;

        if (isEmbed) {
            const embed = await EmbedTemplate.create(embedData);
            embedId = embed._id;
        }

        config.channels.push({
            channelId,
            channelType,
            message: message,
            isEmbed,
            embed: embedId,
            imageUrl
        });

        await config.save();

        res.json({ success: true, data: config });

    } catch (error) {
        console.error('Error creating/updating notification:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi tạo hoặc cập nhật cấu hình server'
        });
    }
});



module.exports = router;
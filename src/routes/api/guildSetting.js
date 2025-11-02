// routes/notification.js
const express = require('express');
const router = express.Router();
const Notification = require("../../models/Notification");
const { authenticateAndCheckPermission, authenticateToken, checkGuildPermission } = require('../../utils/checkPermission');

// Áp dụng middleware xác thực cho tất cả routes
router.use("/:guildId", authenticateAndCheckPermission);

// Lấy cấu hình server theo guildId
router.get('/:guildId', async (req, res) => {
    try {
        const { guildId } = req.params;
        console.log(guildId)
        let config = await Notification.findOne({ guildId });

        if (!config) {
            config = await Notification.create({ guildId });
        }

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Error fetching server config:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy cấu hình server'
        });
    }
});
router.get("/:guildId/channels", async (req, res) => {
    try {
        const client = req.app.get("discordClient");
        const guildId = req.params.guildId;

        // Lấy guild từ cache hoặc fetch lại nếu chưa có
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId);

        if (!guild) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy server!"
            });
        }

        // Lấy danh sách kênh
        const channels = guild.channels.cache.map(channel => ({
            id: channel.id,
            name: channel.name,
            type: channel.type, // 0 = text, 2 = voice, 4 = category, ...
            parentId: channel.parentId,
        }));

        res.json({
            success: true,
            data: channels
        });
    } catch (error) {
        console.error("Error fetching channels:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách channel"
        });
    }
});
// GET /:guildId/users?search=kiên&page=1&limit=20
router.get("/:guildId/users", async (req, res) => {
    try {
        const client = req.app.get("discordClient");
        const guildId = req.params.guildId;
        const search = (req.query.search || "").toLowerCase();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        // Lấy guild
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId);
        if (!guild) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy server!"
            });
        }

        // Fetch toàn bộ members nếu chưa có cache (vì mặc định chỉ cache 100)
        await guild.members.fetch();

        // Lấy danh sách member
        let members = guild.members.cache.map(member => ({
            id: member.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            nickname: member.nickname,
            avatar: member.user.displayAvatarURL({ dynamic: true, size: 128 }),
            joinedAt: member.joinedAt,
            roles: member.roles.cache.map(r => ({ id: r.id, name: r.name })),
            isBot: member.user.bot,
        }));

        // Filter theo username hoặc nickname
        if (search) {
            members = members.filter(m =>
                m.username.toLowerCase().includes(search) ||
                (m.nickname && m.nickname.toLowerCase().includes(search))
            );
        }

        // Sort theo thời gian tham gia (mới nhất trước)
        members.sort((a, b) => b.joinedAt - a.joinedAt);

        // Pagination
        const total = members.length;
        const start = (page - 1) * limit;
        const paginated = members.slice(start, start + limit);

        res.json({
            success: true,
            data: paginated,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách người dùng"
        });
    }
});

// GET /:guildId/roles?search=mod&page=1&limit=20
router.get("/:guildId/roles", async (req, res) => {
    try {
        const client = req.app.get("discordClient");
        const guildId = req.params.guildId;
        const search = (req.query.search || "").toLowerCase();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        // Lấy guild
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId);
        if (!guild) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy server!"
            });
        }

        // Lấy danh sách role
        let roles = guild.roles.cache.map(role => ({
            id: role.id,
            name: role.name,
            color: role.hexColor,
            position: role.position,
            hoist: role.hoist,
            mentionable: role.mentionable,
            memberCount: guild.members.cache.filter(m => m.roles.cache.has(role.id)).size,
        }));

        // Filter theo tên
        if (search) {
            roles = roles.filter(r => r.name.toLowerCase().includes(search));
        }

        // Sort theo position (cao -> thấp)
        roles.sort((a, b) => b.position - a.position);

        // Pagination
        const total = roles.length;
        const start = (page - 1) * limit;
        const paginated = roles.slice(start, start + limit);

        res.json({
            success: true,
            data: paginated,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách roles"
        });
    }
});

// Cập nhật toàn bộ cấu hình server
router.put('/:guildId', async (req, res) => {
    try {
        const { guildId } = req.params;
        const updateData = req.body;

        delete updateData._id;
        delete updateData.guildId;

        const config = await Notification.findOneAndUpdate(
            { guildId },
            { $set: updateData },
            {
                new: true,
                upsert: true,
                runValidators: true
            }
        );

        res.json({
            success: true,
            message: 'Cập nhật cấu hình thành công',
            data: config
        });
    } catch (error) {
        console.error('Error updating server config:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật cấu hình server'
        });
    }
});

// Reset về mặc định
router.post('/:guildId/reset', async (req, res) => {
    try {
        const { guildId } = req.params;

        const defaultConfig = {
            guildId,
            channels: [],
            gaChannelId: false,
            gaReqChannelId: false,
            gaResChannelId: false,
            isChannelEnabled: false,
            isEmbedEnabled: true,
            isStreakEnabled: true,
            isLinkDisable: false,
            isInviteDisable: false,
            isSpamMessageDisable: false
        };

        const config = await Notification.findOneAndUpdate(
            { guildId },
            { $set: defaultConfig },
            {
                new: true,
                upsert: true
            }
        );

        res.json({
            success: true,
            message: 'Đã reset về cấu hình mặc định',
            data: config
        });
    } catch (error) {
        console.error('Error resetting server config:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi reset cấu hình server'
        });
    }
});

// Quản lý channels
router.post('/:guildId/channels', async (req, res) => {
    try {
        const { guildId } = req.params;
        const { channel } = req.body;

        const config = await Notification.findOneAndUpdate(
            { guildId },
            {
                $push: {
                    channels: channel
                }
            },
            {
                new: true,
                upsert: true
            }
        );

        res.json({
            success: true,
            message: 'Đã thêm channel',
            data: config.channels
        });
    } catch (error) {
        console.error('Error adding channel:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi thêm channel'
        });
    }
});

// Xóa channel
router.delete('/:guildId/channels/:channelId', async (req, res) => {
    try {
        const { guildId, channelId } = req.params;

        const config = await Notification.findOneAndUpdate(
            { guildId },
            {
                $pull: {
                    channels: { channelId }
                }
            },
            { new: true }
        );

        res.json({
            success: true,
            message: 'Đã xóa channel',
            data: config.channels
        });
    } catch (error) {
        console.error('Error deleting channel:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa channel'
        });
    }
});

// Cập nhật channel
router.put('/:guildId/channels/:channelId', async (req, res) => {
    try {
        const { guildId, channelId } = req.params;
        const { channelData } = req.body;

        const config = await Notification.findOneAndUpdate(
            {
                guildId,
                'channels.channelId': channelId
            },
            {
                $set: {
                    'channels.$': { ...channelData, channelId }
                }
            },
            { new: true }
        );

        res.json({
            success: true,
            message: 'Đã cập nhật channel',
            data: config.channels
        });
    } catch (error) {
        console.error('Error updating channel:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật channel'
        });
    }
});

module.exports = router;
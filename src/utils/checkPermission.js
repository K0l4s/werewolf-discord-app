const Token = require("../models/Token");

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token không được cung cấp'
            });
        }

        const tokenDoc = await Token.findOne({ 
            token: token,
            isExpired: false,
            expiresAt: { $gt: new Date() }
        });

        if (!tokenDoc) {
            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ hoặc đã hết hạn'
            });
        }

        req.user = {
            userId: tokenDoc.userId,
            discordToken: tokenDoc.discordToken
        };

        next();
    } catch (error) {
        console.error('Error authenticating token:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi xác thực token'
        });
    }
};

// Middleware kiểm tra permission sử dụng Discord Client
const checkGuildPermission = async (req, res, next) => {
    try {
        // Lấy guildId từ cả params và query để đảm bảo không bị undefined
        const guildId = req.params.guildId || req.query.guildId;
        const { userId } = req.user;
        
        console.log('Checking permission for:', { guildId, userId, params: req.params, query: req.query });

        // Kiểm tra guildId có tồn tại không
        if (!guildId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu guildId trong request'
            });
        }

        // Lấy Discord client từ app
        const client = req.app.get('discordClient');
        
        if (!client) {
            console.error('Discord client not found in app');
            return res.status(500).json({
                success: false,
                message: 'Discord client không khả dụng'
            });
        }

        // Kiểm tra xem user có quyền quản lý server không
        const hasPermission = await verifyDiscordPermission(client, userId, guildId);
        
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền quản lý server này'
            });
        }

        // Lưu guildId vào request để sử dụng ở các middleware tiếp theo
        req.guildId = guildId;
        next();
    } catch (error) {
        console.error('Error checking guild permission:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi kiểm tra quyền'
        });
    }
};

// Hàm kiểm tra quyền sử dụng Discord Client
const verifyDiscordPermission = async (client, userId, guildId) => {
    try {
        console.log('Verifying permission for user:', userId, 'in guild:', guildId);

        // Validate guildId
        if (!guildId || guildId === 'undefined') {
            console.error('Invalid guildId:', guildId);
            return false;
        }

        // Lấy guild từ client - sử dụng fetch thay vì cache
        const guild = await client.guilds.fetch(guildId).catch(error => {
            console.error(`Error fetching guild ${guildId}:`, error.message);
            return null;
        });

        if (!guild) {
            console.log(`Bot không tham gia server ${guildId}`);
            return false;
        }

        console.log(`Found guild: ${guild.name} (${guild.id})`);

        // Lấy member từ guild
        const member = await guild.members.fetch(userId).catch(error => {
            console.error(`Error fetching member ${userId} in guild ${guildId}:`, error.message);
            return null;
        });
        
        if (!member) {
            console.log(`User ${userId} không có trong server ${guildId}`);
            return false;
        }

        console.log(`Found member: ${member.user.tag} (${member.user.id})`);

        // Kiểm tra permissions
        const hasAdmin = member.permissions.has('Administrator');
        const hasManageGuild = member.permissions.has('ManageGuild');
        const hasManageChannels = member.permissions.has('ManageChannels');

        console.log(`User ${userId} permissions in ${guildId}:`, {
            hasAdmin,
            hasManageGuild,
            hasManageChannels
        });

        return hasAdmin || hasManageGuild || hasManageChannels;

    } catch (error) {
        console.error('Error verifying Discord permission with client:', error);
        return false;
    }
};

// Middleware kết hợp (auth + permission)
const authenticateAndCheckPermission = [authenticateToken, checkGuildPermission];

module.exports = {
    authenticateToken,
    checkGuildPermission,
    authenticateAndCheckPermission,
    verifyDiscordPermission
};
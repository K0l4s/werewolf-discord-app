const { ChannelType, PermissionFlagsBits } = require("discord.js");
const Notification = require("../models/Notification");

class TicketService {
    static async findGuildAndNotification(client, guildId) {
    if (!guildId) {
        throw new Error('Thiếu tham số bắt buộc: guildId');
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        throw new Error('Không tìm thấy guild với ID provided');
    }

    let notification = await Notification.findOne({ guildId });

    // 👉 Nếu chưa có thì tạo mới
    if (!notification) {
        notification = await Notification.create({
            guildId
        });
    }

    return { guild, notification };
}


    static async findCategory(notification, cateType) {
        if (!cateType) {
            throw new Error('Thiếu tham số bắt buộc: cateType');
        }

        const categoryConfig = notification.ticketCate.find(
            cat => cat.cateType === cateType
        );
        if (!categoryConfig) {
            throw new Error(`Không tìm thấy category với type '${cateType}'`);
        }

        return categoryConfig;
    }

    static async findCategoryChannel(guild, categoryConfig) {
        const categoryChannel = guild.channels.cache.get(categoryConfig.cateId);
        if (!categoryChannel || categoryChannel.type !== ChannelType.GuildCategory) {
            throw new Error('Không tìm thấy category channel trong Discord');
        }
        return categoryChannel;
    }

    static async updateCategoryPermissions(categoryChannel, roles = [], users = []) {
        const permissionOverwrites = [
            {
                id: categoryChannel.guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
            }
        ];

        // Thêm permissions cho các roles
        if (roles.length > 0) {
            const validRoles = roles.filter(roleId => categoryChannel.guild.roles.cache.has(roleId));
            permissionOverwrites.push(
                ...validRoles.map(roleId => ({
                    id: roleId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                }))
            );
        }

        // Thêm permissions cho các users
        if (users.length > 0) {
            const validUsers = users.filter(userId => categoryChannel.guild.members.cache.has(userId));
            permissionOverwrites.push(
                ...validUsers.map(userId => ({
                    id: userId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                }))
            );
        }

        await categoryChannel.permissionOverwrites.set(permissionOverwrites);
        return permissionOverwrites;
    }

    static async updateChildrenChannelsPermissions(guild, categoryChannel, permissionOverwrites) {
        const childrenChannels = guild.channels.cache.filter(
            channel => channel.parentId === categoryChannel.id
        );

        for (const [channelId, channel] of childrenChannels) {
            await channel.permissionOverwrites.set(permissionOverwrites);
        }
    }

    static async createCategory(guild, cateName, cateType, description, roleIds = [], userIds = [], requiredRoleIds = []) {
        if (!cateName) {
            cateName = '🎟️' + cateType.toString().toUpperCase();
        }

        const category = await guild.channels.create({
            name: cateName,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                ...roleIds.map(roleId => ({
                    id: roleId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                })),
                ...userIds.map(userId => ({
                    id: userId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                }))
            ]
        });

        return category;
    }

    static async saveNotification(notification, newCategory = null) {
        if (newCategory) {
            const existingCategory = notification.ticketCate.find(
                cat => cat.cateType === newCategory.cateType
            );

            if (existingCategory) {
                throw new Error(`Category type '${newCategory.cateType}' đã tồn tại trong guild này`);
            }

            notification.ticketCate.push(newCategory);
        }

        await notification.save();
        return notification;
    }

    static async getTicketStatusData(client, guildId) {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            throw new Error('Không tìm thấy guild');
        }

        const notification = await Notification.findOne({ guildId });
        if (!notification || !notification.ticketCate || notification.ticketCate.length === 0) {
            throw new Error('Không tìm thấy cấu hình ticket categories cho server này');
        }

        return { guild, notification };
    }

    static validateParameters(guildId, cateType) {
        if (!guildId || !cateType) {
            throw new Error('Thiếu các tham số bắt buộc: guildId, cateType');
        }
    }
}

module.exports = TicketService;
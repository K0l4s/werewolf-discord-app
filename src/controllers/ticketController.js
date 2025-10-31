const { EmbedBuilder, ButtonStyle, ActionRowBuilder, ChannelType } = require("discord.js");
const Notification = require("../models/Notification");
const TicketService = require("../services/ticketService");
const { ButtonBuilder } = require("discord.js");
const Ticket = require("../models/Ticket");
const cron = require('node-cron');

class TicketController {
    static async ensureTicketSettings(guildId, client) {
        let settings = await Notification.findOne({ guildId });

        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) throw new Error(`❌ Không tìm thấy guild ${guildId}`);

        let categoryId = settings?.ticket?.categoryId;

        let categoryExists = false;

        if (categoryId) {
            const category = guild.channels.cache.get(categoryId) || await guild.channels.fetch(categoryId).catch(() => null);
            if (category && category.type === 4) { // GUILD_CATEGORY
                categoryExists = true;
            }
        }

        // Nếu không có category hoặc category cũ không tồn tại thì tạo mới
        if (!settings || !settings.ticket || !categoryExists) {
            const category = await guild.channels.create({
                name: '🎟️ Tickets',
                type: 4, // GUILD_CATEGORY
                reason: 'Tự động tạo category cho hệ thống ticket',
            });

            if (!settings) {
                // Nếu chưa có setting, tạo mới hoàn toàn
                settings = await Notification.create({
                    guildId,
                    ticket: {
                        message: 'Welcome to ticket system 👋',
                        categoryId: category.id,
                        roleIds: [],
                        userIds: [],
                    },
                });
            } else if (!settings.ticket) {
                // Nếu ticket object chưa tồn tại
                settings.ticket = {
                    message: 'Welcome to ticket system 👋',
                    categoryId: category.id,
                    roleIds: [],
                    userIds: [],
                };
                await settings.save();
            } else {
                // Nếu ticket object đã có, chỉ update categoryId thôi
                settings.ticket.categoryId = category.id;
                await settings.save();
            }

            console.log(`✅ Đã tạo mới ticket category (${category.name}) và cập nhật vào DB`);
        }

        await settings.save();
        return settings;
    }

    static async addRoles(roleIds = [], guildId, client) {
        const settings = await this.ensureTicketSettings(guildId, client);

        const currentRoles = settings.ticket.roleIds || [];
        const newRoles = roleIds.filter(id => !currentRoles.includes(id));

        if (newRoles.length > 0) {
            settings.ticket.roleIds = [...currentRoles, ...newRoles];
            await settings.save();
            console.log(`✅ Đã thêm ${newRoles.length} role(s) vào guild ${guildId}`);
        } else {
            console.log(`ℹ️ Không có role mới nào để thêm cho guild ${guildId}`);
        }

        return { success: true, added: newRoles, settings };
    }


    static async addUsers(userIds = [], guildId, client) {
        const settings = await this.ensureTicketSettings(guildId, client);

        const currentUsers = settings.ticket.userIds || [];
        const newUsers = userIds.filter(id => !currentUsers.includes(id));

        if (newUsers.length > 0) {
            settings.ticket.userIds = [...currentUsers, ...newUsers];
            await settings.save();
            console.log(`✅ Đã thêm ${newUsers.length} user(s) vào guild ${guildId}`);
        } else {
            console.log(`ℹ️ Không có user mới nào để thêm cho guild ${guildId}`);
        }

        return { success: true, added: newUsers, settings };
    }
    static async removeRoles(roleIds = [], guildId, client) {
        const settings = await this.ensureTicketSettings(guildId, client);
        const before = settings.ticket.roleIds || [];
        const after = before.filter(id => !roleIds.includes(id));
        const removed = before.filter(id => roleIds.includes(id));
        settings.ticket.roleIds = after;
        await settings.save();
        return { removed };
    }

    static async removeUsers(userIds = [], guildId, client) {
        const settings = await this.ensureTicketSettings(guildId, client);
        const before = settings.ticket.userIds || [];
        const after = before.filter(id => !userIds.includes(id));
        const removed = before.filter(id => userIds.includes(id));
        settings.ticket.userIds = after;
        await settings.save();
        return { removed };
    }
    static async storageTicket(channelId, guildId, userId, client, lang = "en") {
        try {
            const ticket = await Ticket.findOne({ channelId });
            if (!ticket) return "Not found!";

            const guild = await client.guilds.fetch(guildId);
            const member = await guild.members.fetch(userId);
            const channel = await guild.channels.fetch(ticket.channelId).catch(() => {
                console.log("⚠️ Channel không tìm thấy hoặc đã bị xóa!");
                return null;
            });

            const settings = await Notification.findOne({ guildId });

            const hasPermission =
                member.permissions.has('Administrator') ||
                member.permissions.has('ManageGuild') ||
                (settings?.ticket?.roleIds?.some(roleId => member.roles.cache.has(roleId))) ||
                (settings?.ticket?.userIds?.includes(userId));

            if (!hasPermission) return "You don't have permission";

            await channel.permissionOverwrites.delete(ticket.hostId).catch(console.error);

            return `Đã xóa quyền của Người Tạo cho Ticket này thành công! Vui lòng chọn nút xóa nếu muốn xóa ticket!`;
        } catch (err) {
            console.error("❌ Lỗi deleteTicket:", err);
            return "Internal error";
        }
    }

    static async deleteTicket(channelId, guildId, userId, client, lang = "en") {
        try {
            const ticket = await Ticket.findOne({ channelId });
            if (!ticket) return "Not found!";

            const guild = await client.guilds.fetch(guildId);
            const member = await guild.members.fetch(userId);
            const channel = await guild.channels.fetch(ticket.channelId).catch(() => {
                console.log("⚠️ Channel không tìm thấy hoặc đã bị xóa!");
                return null;
            });

            const settings = await Notification.findOne({ guildId });

            // ✅ Kiểm tra quyền
            const hasPermission =
                member.permissions.has('Administrator') ||
                member.permissions.has('ManageGuild') ||
                ticket.hostId === userId ||
                (settings?.ticket?.roleIds?.some(roleId => member.roles.cache.has(roleId))) ||
                (settings?.ticket?.userIds?.includes(userId));

            if (!hasPermission) return "You don't have permission";

            // ✅ Đánh dấu thời gian xóa
            ticket.deleteAt = new Date();
            await ticket.save();
            await channel.permissionOverwrites.delete(ticket.hostId).catch(console.error);

            console.log(`❌ Đã xóa quyền truy cập của ${member.user.tag} khỏi channel ${channel.name}`);
            console.log(`🕒 Đã lên lịch xóa ticket sau 1 phút (${ticket._id})`);

            const end = new Date(ticket.deleteAt.getTime() + 21600 * 1000);
            console.log("🕒 Thời gian end:", end.toLocaleString("vi-VN"));

            const minute = end.getMinutes();
            const hour = end.getHours();
            const day = end.getDate();
            const month = end.getMonth() + 1;
            const cronExpr = `${minute} ${hour} ${day} ${month} *`;

            console.log(`📅 [Ticket] Lên lịch xóa cho ID ${ticket._id} lúc ${end.toLocaleString('vi-VN')} (cron: ${cronExpr})`);
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Green')
                        .setTitle('Đã lên lịch xóa cho ticket')
                        .setDescription(`🎟️ Ticket đã được xóa, channel cũng sẽ được xóa lúc ${end.toLocaleString('vi-VN')}`)
                ],
            })
            cron.schedule(
                cronExpr,
                async () => {
                    console.log(`⏰ [Ticket] Đang tự xóa ticket ${ticket._id}`);

                    try {
                        const ch = await client.channels.fetch(channelId).catch(() => null);
                        if (ch && ch.type === ChannelType.GuildText) {
                            await ch.delete(`Ticket ${ticket.id} closed`);
                            console.log(`✅ Đã xóa kênh ${ch.name}`);
                        } else {
                            console.log("⚠️ Channel không tồn tại hoặc không hợp lệ");
                        }

                        await Ticket.deleteOne({ channelId });
                        console.log(`✅ Đã xóa ticket thành công`);
                    } catch (err) {
                        console.error("❌ Lỗi khi xóa ticket:", err);
                    }
                },
                {
                    scheduled: true,
                    timezone: "Asia/Ho_Chi_Minh",
                }
            );

            return `Ticket ${channel?.name || ''} scheduled for deletion.`;
        } catch (err) {
            console.error("❌ Lỗi deleteTicket:", err);
            return "Internal error";
        }
    }

    static async createNewTicket(guildId, userId, client, lang = "en") {
        // Fetch guild và user
        const guild = await client.guilds.fetch(guildId).catch(() => { throw new Error("Not found guild") });
        const user = await client.users.fetch(userId).catch(() => { throw new Error("Not found user") });

        // Lấy setting
        let settings = await Notification.findOne({ guildId });

        // Kiểm tra category
        let categoryId = settings?.ticket?.categoryId;
        let categoryExists = false;

        if (categoryId) {
            const category = guild.channels.cache.get(categoryId) || await guild.channels.fetch(categoryId).catch(() => null);
            if (category && category.type === 4) { // GUILD_CATEGORY
                categoryExists = true;
            }
        }

        // Nếu không có category hoặc category cũ không tồn tại thì tạo mới
        if (!settings || !settings.ticket || !categoryExists) {
            const category = await guild.channels.create({
                name: '🎟️ Tickets',
                type: 4, // GUILD_CATEGORY
                reason: 'Tự động tạo category cho hệ thống ticket',
            });

            if (!settings) {
                // Nếu chưa có setting, tạo mới hoàn toàn
                settings = await Notification.create({
                    guildId,
                    ticket: {
                        message: 'Welcome to ticket system 👋',
                        categoryId: category.id,
                        roleIds: [],
                        userIds: [],
                    },
                });
            } else if (!settings.ticket) {
                // Nếu ticket object chưa tồn tại
                settings.ticket = {
                    message: 'Welcome to ticket system 👋',
                    categoryId: category.id,
                    roleIds: [],
                    userIds: [],
                };
                await settings.save();
            } else {
                // Nếu ticket object đã có, chỉ update categoryId thôi
                settings.ticket.categoryId = category.id;
                await settings.save();
            }

            console.log(`✅ Đã tạo mới ticket category (${category.name}) và cập nhật vào DB`);
        }

        // Tạo tên kênh
        const title = `${user.globalName || user.username || 'unknown'}-ticket`;

        // Tạo kênh ticket
        const newChannel = await guild.channels.create({
            name: title,
            type: 0, // GUILD_TEXT
            parent: settings.ticket.categoryId,
            reason: `Ticket request by ${user.globalName || user.username || 'Unknown user'}`,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: ['ViewChannel'],
                },
                ...settings.ticket.roleIds.map(id => ({
                    id,
                    allow: ['ViewChannel', 'SendMessages', 'ManageMessages'],
                })),
                ...settings.ticket.userIds.map(id => ({
                    id,
                    allow: ['ViewChannel', 'SendMessages', 'ManageMessages'],
                })),
                {
                    id: user.id,
                    allow: ['ViewChannel', 'SendMessages', 'AttachFiles', 'ReadMessageHistory'],
                },
            ],
        });

        // Lưu DB
        await TicketService.createNewTicket(guildId, newChannel.id, userId);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticket|close|${newChannel.id}`)
                    .setLabel('Đóng Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('<a:trash:1433806006915432538>'))
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticket|storage|${newChannel.id}`)
                    .setLabel('Lưu trữ Ticket')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('<a:storage:1433807724365221898>')
            );;

        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('🎟️ Ticket đã được tạo!')
            .setDescription(`Vui lòng mô tả vấn đề của bạn tại đây 👇`)
            .setFooter({ text: `Yêu cầu bởi ${user.globalName || user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) });

        // Thêm mentions nếu có
        const allMentions = [
            ...settings.ticket.roleIds.map(id => `<@&${id}>`),
            ...settings.ticket.userIds.map(id => `<@${id}>`)
        ];

        if (allMentions.length > 0) {
            embed.addFields({
                name: '📢 Được thông báo',
                value: allMentions.join(' ')
            });
        }

        await newChannel.send({
            content: `<@${userId}>`,
            embeds: [embed],
            components: [row]
        });

        // Tin nhắn phản hồi
        const msg = `🎟️ Ticket đã được tạo, bạn vui lòng truy cập vào <#${newChannel.id}> để trao đổi với chúng tôi.`;
        return msg;
    }

}

module.exports = TicketController;
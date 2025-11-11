const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ChannelType, PermissionsBitField } = require("discord.js");
const TicketService = require("../services/ticketService");
const Notification = require("../models/Notification");
const cron = require('node-cron');

const Ticket = require("../models/Ticket");
const UserService = require("../services/userService");

class TicketController {
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
            ticket.status = 'storage'
            await ticket.save()
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Green')
                        .setTitle('Đã lên lưu trữ ticket')
                        .setDescription(`🎟️ Ticket đã lưu trữ, Bạn cũng có thể xóa ticket này!`)
                ],
            })
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
            ticket.status = 'closed'
            await ticket.save();
            await channel.permissionOverwrites.delete(ticket.hostId).catch(console.error);

            console.log(`❌ Đã xóa quyền truy cập của ${member.user.tag} khỏi channel ${channel.name}`);
            console.log(`🕒 Đã lên lịch xóa ticket sau 1 phút (${ticket._id})`);

            const end = new Date(ticket.deleteAt.getTime() + 21600 * 1000);
            // const end = new Date(ticket.deleteAt.getTime()+ 60* 1000);
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

    static async createTicket(client, cateType = 'general', hostId, guildId) {
        try {
            if (!cateType || !hostId || !guildId)
                throw new Error("Missing required field");
            const exitsTicket = await Ticket.findOne({
                guildId,
                hostId,
                status: 'open'
            })
            if (exitsTicket)
                throw new Error("Bạn có ticket chưa xử lý xong, vui lòng đóng ticket trước!")
            // 🔹 Lấy config notification trong DB
            const config = await Notification.findOne({ guildId });
            if (!config || !config.ticketCate || config.ticketCate.length === 0)
                throw new Error("❌ Server chưa có thiết lập ticket");

            // 🔹 Tìm category theo cateType
            const selectedCategory = config.ticketCate.find(
                c => c.cateType.toLowerCase() === cateType.toLowerCase()
            );
            const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId);

            // 🔹 Kiểm tra quyền của user
            const member = await guild.members.fetch(hostId).catch(() => null);
            if (!member) throw new Error("❌ Không tìm thấy thành viên trong server");

            // Nếu requiredRoleIds có dữ liệu thì kiểm tra
            if (selectedCategory.requiredRoleIds && selectedCategory.requiredRoleIds.length > 0) {
                const hasRequiredRole = member.roles.cache.some(role =>
                    selectedCategory.requiredRoleIds.includes(role.id)
                );

                if (!hasRequiredRole) {
                    throw new Error("❌ Bạn không thể tạo ticket vì thuộc role bị hạn chế.");
                }
            }

            if (!selectedCategory)
                throw new Error(`❌ Không tìm thấy category loại '${cateType}'`);

            if (!guild) throw new Error("❌ Không tìm thấy guild");

            let categoryChannel = guild.channels.cache.get(selectedCategory.cateId);

            // 🔹 Nếu category không tồn tại (bị xóa) thì tạo lại
            if (!categoryChannel) {
                categoryChannel = await guild.channels.create({
                    name: selectedCategory.cateName || "🎟️ Tickets",
                    type: 4, // Category
                    reason: "Category bị mất, tạo lại tự động"
                });

                // cập nhật DB cateId mới
                selectedCategory.cateId = categoryChannel.id;
                await Notification.updateOne(
                    { guildId, "ticketCate.cateType": cateType },
                    { $set: { "ticketCate.$.cateId": categoryChannel.id } }
                );
            }

            // 🔹 Tạo channel mới trong category
            const channelName = `ticket-${hostId.slice(0, 5)}`;
            const channel = await guild.channels.create({
                name: channelName,
                type: 0, // Text channel
                parent: categoryChannel.id,
                topic: `${selectedCategory.description}`,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: ["ViewChannel"]
                    },
                    {
                        id: hostId,
                        allow: ["ViewChannel", "SendMessages", "AttachFiles", "ReadMessageHistory"]
                    },
                    // Cho phép roleIds có quyền xem và phản hồi
                    ...selectedCategory.roleIds.map(rid => ({
                        id: rid,
                        allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"]
                    })),
                    // Cấm requiredRoleIds
                    // ...selectedCategory.requiredRoleIds.map(rid => ({
                    //     id: rid,
                    //     deny: ["ViewChannel"]
                    // }))
                ]
            });

            // 🔹 Lưu thông tin ticket vào DB
            const newTicket = new Ticket({
                guildId,
                hostId,
                channelId: channel.id,
                createdBy: hostId,
                status: "open",
                deleteAt: null
            });

            await newTicket.save();
            const mentionRoles = selectedCategory.roleIds || [];
            const mentionUsers = selectedCategory.userIds || [];
            const embed = new EmbedBuilder()
                .setColor(0x2f3136)
                .setTitle(selectedCategory.cateName || "🎟️ Ticket")
                .setDescription(selectedCategory.description || "Cảm ơn bạn đã tạo ticket!")
                .setFooter({ text: `Host: ${member.user.tag}`, iconURL: member.user.displayAvatarURL() })
                .setTimestamp();

            // Chuẩn bị mention cho message
            const mentions = [
                ...mentionRoles.map(r => `<@&${r}>`),
                ...mentionUsers.map(u => `<@${u}>`)
            ].join(' ');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticket|close`)
                    .setLabel('Đóng ticket')
                    .setEmoji('<a:trash:1433806006915432538>')
                    .setStyle(ButtonStyle.Danger)
                , new ButtonBuilder()
                    .setCustomId(`ticket|storage`)
                    .setLabel('Lưu trữ ticket')
                    .setEmoji('<a:storage:1433807724365221898>')
                    .setStyle(ButtonStyle.Success)
            )
            await channel.send({
                content: mentions.length > 0 ? `Host: <@${hostId}>\n Support: ${mentions}` : `Host: <@${hostId}>`,
                embeds: [embed],
                components: [row],
            })
            return {
                status: "Success",
                message: `✅ Ticket created successfully: <#${channel.id}>`,
                channelId: channel.id
            };

        } catch (e) {
            console.error(e);
            return {
                status: "Error",
                message: e.message || "Lỗi khi tạo ticket"
            };
        }
    }
    static sendTool(guildId) {
        const embed = new EmbedBuilder()
            .setTitle("Welcome to Keldo Ticket Tool")
            .setDescription("Select button below!")
            .setColor('Green');

        const generalButton = new ButtonBuilder()
            .setCustomId(`ticket_setup|general`)
            .setLabel("Create General Ticket Category")
            .setStyle(ButtonStyle.Success);

        const customButton = new ButtonBuilder()
            .setCustomId(`ticket_setup|custom`)
            .setLabel("Create Custom Ticket Category")
            .setStyle(ButtonStyle.Secondary);
        const deleteButton = new ButtonBuilder()
            .setCustomId(`ticket_setup|delete`)
            .setLabel("Delete Ticket Category")
            .setStyle(ButtonStyle.Danger);
        const linkButton = new ButtonBuilder()
            .setLabel("Advance Setup")
            .setStyle(ButtonStyle.Link)
            .setURL(`https://keldo.vercel.app/guild/setting/${guildId}`);

        const row = new ActionRowBuilder().addComponents(generalButton, customButton, deleteButton, linkButton);

        return { embeds: [embed], components: [row] };
    }
    static async getCategories(guildId) {
        try {
            const notification = await Notification.findOne({ guildId });
            if (!notification) {
                return {
                    success: false,
                    message: 'Không tìm thấy cấu hình ticket cho guild này'
                };
            }

            return {
                success: true,
                categories: notification.ticketCate,
                total: notification.ticketCate.length
            };
        } catch (error) {
            console.error('Lỗi khi lấy categories:', error);
            return {
                success: false,
                message: error.message || 'Có lỗi xảy ra khi lấy categories'
            };
        }
    }

    static async addRolesAndUsersToCategory(client, guildId, cateType, users = [], roles = []) {
        try {
            TicketService.validateParameters(guildId, cateType);

            const { guild, notification } = await TicketService.findGuildAndNotification(client, guildId);
            const categoryConfig = await TicketService.findCategory(notification, cateType);
            const categoryChannel = await TicketService.findCategoryChannel(guild, categoryConfig);

            // Thêm roles và users vào cấu hình
            if (roles.length > 0) {
                const validRoles = roles.filter(roleId => guild.roles.cache.has(roleId));
                categoryConfig.roleIds = [...new Set([...categoryConfig.roleIds, ...validRoles])];
            }

            if (users.length > 0) {
                const validUsers = users.filter(userId => guild.members.cache.has(userId));
                categoryConfig.userIds = [...new Set([...categoryConfig.userIds, ...validUsers])];
            }

            // Cập nhật permissions
            await TicketService.updateCategoryPermissions(categoryChannel, categoryConfig.roleIds, categoryConfig.userIds);
            await TicketService.updateChildrenChannelsPermissions(guild, categoryChannel, categoryChannel.permissionOverwrites.cache);

            // Lưu vào database
            await TicketService.saveNotification(notification);

            return {
                success: true,
                message: 'Đã thêm roles và users vào category thành công',
                updatedCategory: categoryConfig
            };

        } catch (error) {
            console.error('Lỗi khi thêm roles và users vào category:', error);
            return {
                success: false,
                message: error.message || 'Có lỗi xảy ra khi thêm roles và users vào category'
            };
        }
    }

    static async addRolesRequired(client, guildId, cateType, roles = []) {
        try {
            TicketService.validateParameters(guildId, cateType);

            const { notification } = await TicketService.findGuildAndNotification(client, guildId);
            const categoryConfig = await TicketService.findCategory(notification, cateType);

            // Thêm roles required mới
            if (roles.length > 0) {
                const validRoles = roles.filter(roleId => {
                    const guild = client.guilds.cache.get(guildId);
                    return guild.roles.cache.has(roleId);
                });
                categoryConfig.requiredRoleIds = [...new Set([...categoryConfig.requiredRoleIds, ...validRoles])];
            }

            await TicketService.saveNotification(notification);

            return {
                success: true,
                message: 'Đã thêm roles required thành công',
                updatedCategory: categoryConfig
            };

        } catch (error) {
            console.error('Lỗi khi thêm roles required:', error);
            return {
                success: false,
                message: error.message || 'Có lỗi xảy ra khi thêm roles required'
            };
        }
    }

    static async removeRolesAndUsersFromCategory(client, guildId, cateType, users = [], roles = []) {
        try {
            TicketService.validateParameters(guildId, cateType);

            const { guild, notification } = await TicketService.findGuildAndNotification(client, guildId);
            const categoryConfig = await TicketService.findCategory(notification, cateType);
            const categoryChannel = await TicketService.findCategoryChannel(guild, categoryConfig);

            // Xóa users khỏi danh sách
            if (users.length > 0) {
                categoryConfig.userIds = categoryConfig.userIds.filter(userId => !users.includes(userId));
                for (const userId of users) {
                    await categoryChannel.permissionOverwrites.delete(userId);
                }
            }

            // Xóa roles khỏi danh sách
            if (roles.length > 0) {
                categoryConfig.roleIds = categoryConfig.roleIds.filter(roleId => !roles.includes(roleId));
                for (const roleId of roles) {
                    if (roleId !== guild.id) {
                        await categoryChannel.permissionOverwrites.delete(roleId);
                    }
                }
            }

            // Cập nhật permissions cho các channel con
            await TicketService.updateChildrenChannelsPermissions(guild, categoryChannel, categoryChannel.permissionOverwrites.cache);

            await TicketService.saveNotification(notification);

            return {
                success: true,
                message: 'Đã xóa roles và users khỏi category thành công',
                updatedCategory: categoryConfig
            };

        } catch (error) {
            console.error('Lỗi khi xóa roles và users khỏi category:', error);
            return {
                success: false,
                message: error.message || 'Có lỗi xảy ra khi xóa roles và users khỏi category'
            };
        }
    }

    static async removeRolesRequired(client, guildId, cateType, roles = []) {
        try {
            TicketService.validateParameters(guildId, cateType);

            const { notification } = await TicketService.findGuildAndNotification(client, guildId);
            const categoryConfig = await TicketService.findCategory(notification, cateType);

            // Xóa roles required
            if (roles.length > 0) {
                categoryConfig.requiredRoleIds = categoryConfig.requiredRoleIds.filter(roleId => !roles.includes(roleId));
            }

            await TicketService.saveNotification(notification);

            return {
                success: true,
                message: 'Đã xóa roles required thành công',
                updatedCategory: categoryConfig
            };

        } catch (error) {
            console.error('Lỗi khi xóa roles required:', error);
            return {
                success: false,
                message: error.message || 'Có lỗi xảy ra khi xóa roles required'
            };
        }
    }

    static async getTicketStatus(client, guildId) {
        try {
            const { guild, notification } = await TicketService.getTicketStatusData(client, guildId);

            const embed = new EmbedBuilder()
                .setTitle(`📊 TRẠNG THÁI TICKET CATEGORIES - ${guild.name}`)
                .setColor(0x00AE86)
                .setTimestamp()
                .setFooter({ text: `Tổng số categories: ${notification.ticketCate.length}` });

            for (const category of notification.ticketCate) {
                let fieldValue = '';

                fieldValue += `**📝 Mô tả:** ${category.description || 'Không có mô tả'}\n`;
                fieldValue += `**🆔 Category ID:** ${category.cateId}\n`;

                const discordCategory = guild.channels.cache.get(category.cateId);
                fieldValue += `**🔗 Trạng thái:** ${discordCategory ? '✅ Đang hoạt động' : '❌ Không tồn tại'}\n`;

                // Required Roles
                if (category.requiredRoleIds && category.requiredRoleIds.length > 0) {
                    const requiredRoles = category.requiredRoleIds.map(roleId => {
                        const role = guild.roles.cache.get(roleId);
                        return role ? `<@&${roleId}>` : `❌ ${roleId}`;
                    }).join(', ');
                    fieldValue += `**🔐 Required Roles:** ${requiredRoles}\n`;
                } else {
                    fieldValue += `**🔐 Required Roles:** ❌ Không có\n`;
                }

                // Notify Roles
                if (category.roleIds && category.roleIds.length > 0) {
                    const notifyRoles = category.roleIds.map(roleId => {
                        const role = guild.roles.cache.get(roleId);
                        return role ? `<@&${roleId}>` : `❌ ${roleId}`;
                    }).join(', ');
                    fieldValue += `**🎭 Notify Roles:** ${notifyRoles}\n`;
                } else {
                    fieldValue += `**🎭 Notify Roles:** ❌ Không có\n`;
                }

                // Notify Users
                if (category.userIds && category.userIds.length > 0) {
                    const notifyUsers = category.userIds.map(userId => {
                        const user = guild.members.cache.get(userId);
                        return user ? `<@${userId}>` : `❌ ${userId}`;
                    }).join(', ');
                    fieldValue += `**👥 Notify Users:** ${notifyUsers}\n`;
                } else {
                    fieldValue += `**👥 Notify Users:** ❌ Không có\n`;
                }

                // Thống kê
                const totalRequired = category.requiredRoleIds?.length || 0;
                const totalNotifyRoles = category.roleIds?.length || 0;
                const totalNotifyUsers = category.userIds?.length || 0;

                fieldValue += `**📈 Thống kê:** ${totalRequired} required • ${totalNotifyRoles} role notify • ${totalNotifyUsers} user notify`;

                embed.addFields({
                    name: `📂 ${category.cateName || 'Unnamed'} (${category.cateType})`,
                    value: fieldValue,
                    inline: false
                });
            }

            // Thêm tổng quan
            const totalCategories = notification.ticketCate.length;
            const totalRequiredRoles = notification.ticketCate.reduce((sum, cat) => sum + (cat.requiredRoleIds?.length || 0), 0);
            const totalNotifyRoles = notification.ticketCate.reduce((sum, cat) => sum + (cat.roleIds?.length || 0), 0);
            const totalNotifyUsers = notification.ticketCate.reduce((sum, cat) => sum + (cat.userIds?.length || 0), 0);

            embed.addFields({
                name: '📊 TỔNG QUAN',
                value: `**Tổng Categories:** ${totalCategories}\n**Tổng Required Roles:** ${totalRequiredRoles}\n**Tổng Notify Roles:** ${totalNotifyRoles}\n**Tổng Notify Users:** ${totalNotifyUsers}`,
                inline: false
            });

            return {
                success: true,
                embed: embed
            };

        } catch (error) {
            console.error('Lỗi khi lấy ticket status:', error);

            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ LỖI KHI LẤY THÔNG TIN TICKET')
                .setColor(0xFF0000)
                .set
                .setDescription(error.message || 'Có lỗi xảy ra khi lấy thông tin ticket status')
                .setTimestamp();

            return {
                success: false,
                message: error.message || 'Có lỗi xảy ra khi lấy thông tin ticket status',
                embed: errorEmbed
            };
        }
    }
    static async closeAllTicket(client, hostId, guildId) {
        try {
            const tickets = await Ticket.find({ guildId, hostId, status: 'open' });
            for (const ticket of tickets) {
                await TicketController.deleteTicket(ticket.channelId, guildId, hostId, client);
            }
            const embed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('Đã đóng tất cả ticket mở')
                .setDescription(`🎟️ Đã đóng tất cả ticket mở của bạn!`)
            return { status: "Success", message: {embeds: [embed] }};
            // return { embeds: [embed] };
        }
        catch (e) {
            return { status: "Error", message: e.message || "Lỗi khi đóng tất cả ticket"  };
        }
    }
    static async sendCreateRoom(client, guildId, cateType = 'general') {
        if (!guildId || !cateType)
            throw new Error("Missing required field");
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId);
        if (!guild) throw new Error("❌ Không tìm thấy guild");
        // tạo room tạo ticket
        const config = await Notification.findOne({ guildId });
        if (!config || !config.ticketCate || config.ticketCate.length === 0)
            throw new Error("❌ Server chưa có thiết lập ticket");
        const selectedCategory = config.ticketCate.find(
            c => c.cateType.toLowerCase() === cateType.toLowerCase()
        );
        if (!selectedCategory)
            throw new Error(`❌ Không tìm thấy category loại '${cateType}'`);
        // tạo channel mới trong category
        const channelName = `🎟️・tạo-ticket-${cateType}`;
        let channel;
        if (selectedCategory.createRoomId) {
            channel = guild.channels.cache.get(selectedCategory.createRoomId);
        }

        // let channel = guild.channels.cache.find(c => c.name === channelName && c.parentId === selectedCategory.cateId);
        if (!channel) {
            channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: selectedCategory.cateId,
                // everyone có quyền xem, không có quyền gửi tin nhắn
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.SendMessages],
                    },
                ],
                reason: "Tạo kênh tạo ticket hỗ trợ"
            });
            // lưu lại createRoomId
            selectedCategory.createRoomId = channel.id;
            await Notification.updateOne(
                { guildId, "ticketCate.cateType": cateType },
                { $set: { "ticketCate.$.createRoomId": channel.id } }
            );
        }
        const embed = new EmbedBuilder()
            .setTitle(`🎟️ Tạo Ticket Hỗ Trợ cho kênh ${selectedCategory.cateName}`)
            .setDescription(`Nhấn nút bên dưới để tạo ticket hỗ trợ cho kênh ${selectedCategory.cateName}!`)
            .setColor('Blue');
        const createButton = new ButtonBuilder()
            .setCustomId(`ticket_create|${cateType}`)
            .setLabel(`Tạo Ticket Hỗ Trợ cho kênh ${selectedCategory.cateName}`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎟️');
        const row = new ActionRowBuilder().addComponents(createButton);
        // gửi embed vào ticket mới tạo
        await channel.send({ embeds: [embed], components: [row] });
        return channel.id;
        // return { embeds: [embed], components: [row] };
    }
    static async createCategory(client, guildId, cateName, cateType, userId, description, roleIds = [], userIds = [], requiredRoleIds = []) {
        try {
            if (!guildId || !cateType || !description) {
                throw new Error('Thiếu các tham số bắt buộc: guildId, cateType, description');
            }

            const { guild } = await TicketService.findGuildAndNotification(client, guildId);
            let notification = await Notification.findOne({ guildId });
            const ticketSize = notification.ticketCate.length || 0;
            let isBought = false;
            if (ticketSize > 3) {
                // logic
                const user = await UserService.findUserById(userId)
                if (user.token < 5)
                    throw new Error("Reached new category creation limit. To create a new category, please use 5 tokens/turn.")

                user.token -= 5;
                await user.save()
                isBought = true;
            }
            const category = await TicketService.createCategory(guild, cateName, cateType, description, roleIds, userIds, requiredRoleIds);

            const newCategory = {
                description,
                cateType,
                cateId: category.id,
                roleIds,
                userIds,
                requiredRoleIds
            };

            if (!notification) {
                notification = new Notification({
                    guildId,
                    ticketCate: [newCategory]
                });
            } else {
                await TicketService.saveNotification(notification, newCategory);
            }

            await TicketService.saveNotification(notification);
            await this.sendCreateRoom(client, guildId, cateType);
            return {
                success: true,
                message: `Đã tạo category thành công ${isBought ? 'Tốn 5 token cho lượt này' : ''}`,
                category: {
                    ...newCategory,
                    discordCategory: category
                }
            };

        } catch (error) {
            console.error('Lỗi khi tạo category:', error);
            return {
                success: false,
                message: error.message || 'Có lỗi xảy ra khi tạo category'
            };
        }
    }

    static async deleteCategory(client, guildId, cateType) {
        try {
            if (!guildId || !cateType) {
                throw new Error('Thiếu tham số bắt buộc: guildId hoặc cateType');
            }

            //  Lấy guild và notification
            const { guild } = await TicketService.findGuildAndNotification(client, guildId);
            let notification = await Notification.findOne({ guildId });

            if (!notification || !notification.ticketCate || notification.ticketCate.length === 0) {
                throw new Error('Không tìm thấy cấu hình ticket trong server này');
            }

            //  Tìm category cần xóa
            const targetCategory = notification.ticketCate.find(
                c => c.cateType.toLowerCase() === cateType.toLowerCase()
            );

            if (!targetCategory) {
                throw new Error(`Không tìm thấy category với loại "${cateType}"`);
            }

            //  Lấy category từ Discord
            const discordCategory = guild.channels.cache.get(targetCategory.cateId);
            // console.log(discordCategory)
            if (discordCategory) {
                //  Xóa toàn bộ kênh nằm trong category
                const channelsInCategory = guild.channels.cache.filter(
                    ch => ch.parentId === discordCategory.id
                );

                for (const [, channel] of channelsInCategory) {
                    await channel.delete(`Ticket system - Xóa channel trong category ${cateType}`);
                }

                //  Sau đó xóa luôn category
                await discordCategory.delete(`Ticket system - Xóa category ${cateType}`);
            }

            //  Xóa category trong DB
            notification.ticketCate = notification.ticketCate.filter(
                c => c.cateType.toLowerCase() !== cateType.toLowerCase()
            );

            await notification.save();

            return {
                success: true,
                message: `Đã xóa category "${cateType}" và các channel bên trong thành công`,
                deletedCategory: targetCategory
            };
        } catch (error) {
            console.error('Lỗi khi xóa category:', error);
            return {
                success: false,
                message: error.message || 'Có lỗi xảy ra khi xóa category'
            };
        }
    }

}

module.exports = TicketController;
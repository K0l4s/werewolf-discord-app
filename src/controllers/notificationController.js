const { EmbedBuilder } = require("discord.js");
const Notification = require("../models/Notification");

class NotificationController {
    static async changeRoomAnnouncement(client, oldState, newState) {
        if (oldState.channelId === newState.channelId) return;

        const member = newState.member;
        const user = member.user;

        // Helper to check notification settings
        const getNotificationSettings = async (guildId) => {
            const setting = await Notification.findOne({ guildId });
            return {
                isEnabled: setting && setting.isChannelEnabled,
                isEmbed: setting ? setting.isEmbedEnabled : true // Default to true if not set
            };
        };

        // Helper to check if channel is locked (có biểu tượng ổ khóa)
        const isChannelLocked = (channel) => {
            try {
                // Lấy permission overwrite cho @everyone
                const everyonePermissions = channel.permissionOverwrites.cache.get(channel.guild.roles.everyone.id);

                if (everyonePermissions) {
                    // Kiểm tra nếu @everyone bị deny quyền Connect
                    return everyonePermissions.deny.has('Connect');
                }

                return false;
            } catch (error) {
                return false;
            }
        };

        // Get channel display name (hidden if locked)
        const getChannelDisplayName = (channel) => {
            return isChannelLocked(channel) ? "🔒 Phòng riêng tư" : channel.name;
        };

        // Message arrays for variety
        const joinMessages = [
            "đã xuất hiện với phong thái lịch lãm! 👋",
            "vừa gia nhập - chuẩn bị cho những cuộc thảo luận thú vị! 💬",
            "đã online, mọi người chào đón nào! 🎊",
            "vừa tham gia, không khí sôi động hơn rồi đây! 🎉",
            "đã có mặt, bắt đầu phiên trò chuyện thôi! 🚀"
        ];

        const leaveMessages = [
            "đã rời đi để nghỉ ngơi! 🌙",
            "vừa offline, hẹn gặp lại! 👋",
            "đã rời khỏi cuộc trò chuyện! 🚶",
            "đã out game, catch you later! 😴",
            "vừa rời đi, phòng vắng hẳn! 🏃"
        ];

        const moveMessages = [
            "đang di chuyển đến vùng đất mới! 🗺️",
            "chuyển phòng để tìm không gian phù hợp! 🔍",
            "đang khám phá các phòng voice! 🎧",
            "đã chuyển sang phòng khác! 🔄",
            "đang thay đổi không gian trò chuyện! 🌈"
        ];

        // Status emojis
        const statusEmoji = {
            'online': '🟢',
            'idle': '🟡',
            'dnd': '🔴',
            'offline': '⚫'
        };

        // Create beautiful embed message
        const createEmbed = (title, description, color, emoji, channel = null) => {
            const userStatus = user.presence ? (user.presence.status || 'offline') : 'offline';
            const status = statusEmoji[userStatus] || '⚫';
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`${emoji} ${title}`)
                .setDescription(`${status} ${description}`)
                .setAuthor({
                    name: user.username,
                    iconURL: user.displayAvatarURL({ dynamic: true }),
                    url: `https://discord.com/users/${user.id}`
                })
                .setTimestamp()
                .setFooter({
                    text: `Voice Notifications • ${client.user.username}`,
                    iconURL: client.user.displayAvatarURL()
                });

            // Add member count if channel is provided and not locked
            if (channel && channel.members && !isChannelLocked(channel)) {
                const memberCount = channel.members.size;
                const botCount = channel.members.filter(m => m.user.bot).size;
                const humanCount = memberCount - botCount;

                embed.addFields(
                    {
                        name: '👥 Thành viên trong phòng',
                        value: `**${memberCount}** người (${humanCount} người và ${botCount} bot)`,
                        inline: false
                    }
                );
            }

            return embed;
        };

        // Create simple text message
        const createTextMessage = (action, channel, isMove = false, oldChannel = null) => {
            const userStatus = user.presence ? (user.presence.status || 'offline') : 'offline';
            const status = statusEmoji[userStatus] || '⚫';

            let message = '';
            let randomMessage = '';

            if (action === 'join') {
                randomMessage = joinMessages[Math.floor(Math.random() * joinMessages.length)];
                const channelName = getChannelDisplayName(channel);
                message = `${status} **${user.tag}** ${randomMessage}\n📍 **Phòng:** ${channelName}`;
            } else if (action === 'leave') {
                randomMessage = leaveMessages[Math.floor(Math.random() * leaveMessages.length)];
                const channelName = getChannelDisplayName(channel);
                message = `${status} **${user.tag}** ${randomMessage}\n📍 **Phòng:** ${channelName}`;
            } else if (action === 'move') {
                randomMessage = moveMessages[Math.floor(Math.random() * moveMessages.length)];
                const oldChannelName = getChannelDisplayName(oldChannel);
                const newChannelName = getChannelDisplayName(channel);
                message = `${status} **${user.tag}** ${randomMessage}\n📤 **Từ:** ${oldChannelName}\n📥 **Đến:** ${newChannelName}`;
            }

            return message;
        };

        // Get random message
        const getRandomMessage = (messages) => {
            return messages[Math.floor(Math.random() * messages.length)];
        };

        // Send notification based on settings
        const sendNotification = async (channel, settings, content, isEmbed = true) => {
            if (!settings.isEnabled) return;

            try {
                if (isEmbed && settings.isEmbed) {
                    await channel.send({ embeds: [content] });
                } else {
                    await channel.send({ content: content });
                }
            } catch (error) {
                console.error('Không thể gửi tin nhắn vào voice channel:', error);
            }
        };

        // Left voice channel
        if (oldState.channel && !newState.channel) {
            const settings = await getNotificationSettings(oldState.guild.id);

            if (settings.isEnabled) {
                if (settings.isEmbed) {
                    const randomMessage = getRandomMessage(leaveMessages);
                    const channelName = getChannelDisplayName(oldState.channel);
                    const embed = createEmbed(
                        'Đã rời phòng voice',
                        `**${user.tag}** ${randomMessage}\n\n📍 **Phòng:** ${channelName}`,
                        0xFF6B6B, // Red color
                        '🚪',
                        oldState.channel
                    );

                    // Add activity info if available
                    const activities = user.presence?.activities.filter(a => a.type !== 'CUSTOM');
                    if (activities && activities.length > 0) {
                        const activity = activities[0];
                        embed.addFields({
                            name: '🎮 Đang chơi',
                            value: `**${activity.name}**${activity.details ? `\n${activity.details}` : ''}`,
                            inline: false
                        });
                    }

                    await sendNotification(oldState.channel, settings, embed, true);
                } else {
                    const textMessage = createTextMessage('leave', oldState.channel);
                    await sendNotification(oldState.channel, settings, textMessage, false);
                }
            }
        }
        // Joined voice channel
        else if (!oldState.channel && newState.channel) {
            const settings = await getNotificationSettings(newState.guild.id);

            if (settings.isEnabled) {
                if (settings.isEmbed) {
                    const randomMessage = getRandomMessage(joinMessages);
                    const channelName = getChannelDisplayName(newState.channel);
                    const embed = createEmbed(
                        'Đã tham gia phòng voice',
                        `**${user.tag}** ${randomMessage}\n\n📍 **Phòng:** ${channelName}`,
                        0x4CAF50, // Green color
                        '🎯',
                        newState.channel
                    );

                    await sendNotification(newState.channel, settings, embed, true);
                } else {
                    const textMessage = createTextMessage('join', newState.channel);
                    await sendNotification(newState.channel, settings, textMessage, false);
                }
            }
        }
        // Moved between channels
        else if (oldState.channel && newState.channel) {
            const oldSettings = await getNotificationSettings(oldState.guild.id);
            const newSettings = await getNotificationSettings(newState.guild.id);

            // Send leave notification to old channel
            if (oldSettings.isEnabled) {
                if (oldSettings.isEmbed) {
                    const randomMessage = getRandomMessage(moveMessages);
                    const oldChannelName = getChannelDisplayName(oldState.channel);
                    const newChannelName = getChannelDisplayName(newState.channel);
                    const leaveEmbed = createEmbed(
                        'Đã chuyển phòng',
                        `**${user.tag}** ${randomMessage}\n\n📤 **Từ:** ${oldChannelName}\n📥 **Đến:** ${newChannelName}`,
                        0xFFA500, // Orange color
                        '✈️',
                        oldState.channel
                    );
                    await sendNotification(oldState.channel, oldSettings, leaveEmbed, true);
                } else {
                    const textMessage = createTextMessage('move', newState.channel, true, oldState.channel);
                    await sendNotification(oldState.channel, oldSettings, textMessage, false);
                }
            }

            // Send join notification to new channel
            if (newSettings.isEnabled) {
                if (newSettings.isEmbed) {
                    const oldChannelName = getChannelDisplayName(oldState.channel);
                    const newChannelName = getChannelDisplayName(newState.channel);
                    const embed = createEmbed(
                        'Đã tham gia phòng',
                        `**${user.tag}** vừa chuyển từ **${oldChannelName}** sang **${newChannelName}**!\n\n🔀 **Di chuyển từ:** ${oldChannelName}`,
                        0x2196F3, // Blue color
                        '🔄',
                        newState.channel
                    );
                    await sendNotification(newState.channel, newSettings, embed, true);
                } else {
                    const oldChannelName = getChannelDisplayName(oldState.channel);
                    const newChannelName = getChannelDisplayName(newState.channel);
                    const textMessage = `${statusEmoji[user.presence?.status || 'offline'] || '⚫'} **${user.tag}** vừa chuyển từ **${oldChannelName}** sang **${newChannelName}**! 🔄`;
                    await sendNotification(newState.channel, newSettings, textMessage, false);
                }
            }
        }
    }
}

module.exports = NotificationController;
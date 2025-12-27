const { EmbedBuilder } = require("discord.js");
const Notification = require("../models/Notification");
const LanguageController = require("./languageController");

// ==========================================
// KHO NGÔN NGỮ (LANGUAGE RESOURCES)
// ==========================================
const RESOURCES = {
    vi: {
        privateRoom: "🔒 Phòng riêng tư",
        activity: {
            none: "Không có hoạt động",
            playing: "Đang chơi",
            prefix: "🎮"
        },
        members: {
            title: "👥 Thành viên trong phòng",
            count: "**{total}** người ({human} người và {bot} bot)"
        },
        embedTitles: {
            join: "Đã tham gia phòng voice",
            leave: "Đã rời phòng voice",
            move: "Đã chuyển phòng",
            moveJoin: "Đã tham gia phòng"
        },
        labels: {
            room: "Phòng",
            from: "Từ",
            to: "Đến",
            moveDesc: "**{user}** vừa chuyển từ **{old}** sang **{new}**!"
        },
        footer: "Thông báo Voice",
        // Các câu ngẫu nhiên
        messages: {
            join: [
                "đã xuất hiện với phong thái lịch lãm! 👋",
                "vừa gia nhập - chuẩn bị cho những cuộc thảo luận thú vị! 💬",
                "đã online, mọi người chào đón nào! 🎊",
                "vừa tham gia, không khí sôi động hơn rồi đây! 🎉",
                "đã có mặt, bắt đầu phiên trò chuyện thôi! 🚀"
            ],
            leave: [
                "đã rời đi để nghỉ ngơi! 🌙",
                "vừa offline, hẹn gặp lại! 👋",
                "đã rời khỏi cuộc trò chuyện! 🚶",
                "đã out game, catch you later! 😴",
                "vừa rời đi, phòng vắng hẳn! 🏃"
            ],
            move: [
                "đang di chuyển đến vùng đất mới! 🗺️",
                "chuyển phòng để tìm không gian phù hợp! 🔍",
                "đang khám phá các phòng voice! 🎧",
                "đã chuyển sang phòng khác! 🔄",
                "đang thay đổi không gian trò chuyện! 🌈"
            ]
        }
    },
    en: {
        privateRoom: "🔒 Private Room",
        activity: {
            none: "No activity",
            playing: "Playing",
            prefix: "🎮"
        },
        members: {
            title: "👥 Room Members",
            count: "**{total}** members ({human} humans and {bot} bots)"
        },
        embedTitles: {
            join: "Joined Voice Channel",
            leave: "Left Voice Channel",
            move: "Moved Channel",
            moveJoin: "Joined Channel"
        },
        labels: {
            room: "Room",
            from: "From",
            to: "To",
            moveDesc: "**{user}** just moved from **{old}** to **{new}**!"
        },
        footer: "Voice Notifications",
        // Random messages
        messages: {
            join: [
                "appeared with style! 👋",
                "just joined - ready for interesting discussions! 💬",
                "is online, welcome! 🎊",
                "just joined, the vibe is getting better! 🎉",
                "is here, let's start chatting! 🚀"
            ],
            leave: [
                "left to take a rest! 🌙",
                "went offline, see you later! 👋",
                "left the conversation! 🚶",
                "is out, catch you later! 😴",
                "just left, the room feels empty! 🏃"
            ],
            move: [
                "is moving to new lands! 🗺️",
                "switched rooms to find a better vibe! 🔍",
                "is exploring voice channels! 🎧",
                "moved to another room! 🔄",
                "is changing the chat atmosphere! 🌈"
            ]
        }
    }
};

class NotificationController {
    static async changeRoomAnnouncement(client, oldState, newState) {
        // Fix: Sử dụng oldState hoặc newState để lấy guild ID vì biến 'msg' không tồn tại
        const guildId = newState.guild.id || oldState.guild.id;
        
        // 1. Lấy ngôn ngữ (Mặc định là 'en' nếu không tìm thấy)
        let langCode = 'en';
        try {
            const savedLang = await LanguageController.getLang(guildId);
            if (savedLang && RESOURCES[savedLang]) {
                langCode = savedLang;
            }
                    console.log(langCode,savedLang)

        } catch (e) {
            console.error("Error fetching lang:", e);
        }
        const TEXT = RESOURCES[langCode]; // Biến chứa toàn bộ text theo ngôn ngữ đã chọn

        if (oldState.channelId === newState.channelId) return;

        const member = newState.member || oldState.member; // Fallback member
        if (!member) return; 

        const user = member.user;

        const getNotificationSettings = async (gId) => {
            let setting = await Notification.findOne({ guildId: gId });
            if (!setting) {
                setting = await Notification.create({
                    guildId: gId,
                    isChannelEnabled: true,
                    isEmbedEnabled: true
                });
            }
            return {
                isEnabled: setting.isChannelEnabled,
                isEmbed: setting.isEmbedEnabled
            };
        };

        // Helper to check if channel is locked
        const isChannelLocked = (channel) => {
            try {
                const everyonePermissions = channel.permissionOverwrites.cache.get(channel.guild.roles.everyone.id);
                if (everyonePermissions) {
                    return everyonePermissions.deny.has('Connect');
                }
                return false;
            } catch (error) {
                return false;
            }
        };

        // Get channel display name (Translate Private Room)
        const getChannelDisplayName = (channel) => {
            return isChannelLocked(channel) ? TEXT.privateRoom : channel.name;
        };

        // Status emojis
        const statusEmoji = {
            'online': '🟢',
            'idle': '🟡',
            'dnd': '🔴',
            'offline': '⚫'
        };

        // Create beautiful embed message
        const createEmbed = (title, description, color, emoji, channel = null) => {
            const userStatus = member.presence?.status || 'offline';
            const status = statusEmoji[userStatus] || '⚫';
            
            // Lọc activity
            const activities = member.presence?.activities.filter(a => a.type !== 'CUSTOM') || [];

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
                    text: `${TEXT.footer} • ${client.user.username}`,
                    iconURL: client.user.displayAvatarURL()
                });

            // Translate Activity Section
            const activityText = activities.length
                ? activities.map(a => `${TEXT.activity.prefix} ${a.name}${a.details ? ` - ${a.details}` : ''}`).join('\n')
                : TEXT.activity.none;

            embed.addFields(
                { name: 'Activity', value: activityText, inline: true }
            );

            // Add member count if channel is provided and not locked
            if (channel && channel.members && !isChannelLocked(channel)) {
                const memberCount = channel.members.size;
                const botCount = channel.members.filter(m => m.user.bot).size;
                const humanCount = memberCount - botCount;

                // Translate Member Count
                const countString = TEXT.members.count
                    .replace('{total}', memberCount)
                    .replace('{human}', humanCount)
                    .replace('{bot}', botCount);

                embed.addFields({
                    name: TEXT.members.title,
                    value: countString,
                    inline: false
                });
            }

            return embed;
        };

        // Create simple text message
        const createTextMessage = (action, channel, isMove = false, oldChannel = null) => {
            const userStatus = member.presence?.status || 'offline';
            const status = statusEmoji[userStatus] || '⚫';
            
            let message = '';
            let randomMessage = '';

            // Lấy random message từ kho ngôn ngữ (TEXT)
            if (action === 'join') {
                randomMessage = getRandomMessage(TEXT.messages.join);
                const channelName = getChannelDisplayName(channel);
                message = `${status} **${user.tag}** ${randomMessage}\n📍 **${TEXT.labels.room}:** ${channelName}`;
            } else if (action === 'leave') {
                randomMessage = getRandomMessage(TEXT.messages.leave);
                const channelName = getChannelDisplayName(channel);
                message = `${status} **${user.tag}** ${randomMessage}\n📍 **${TEXT.labels.room}:** ${channelName}`;
            } else if (action === 'move') {
                randomMessage = getRandomMessage(TEXT.messages.move);
                const oldChannelName = getChannelDisplayName(oldChannel);
                const newChannelName = getChannelDisplayName(channel);
                message = `${status} **${user.tag}** ${randomMessage}\n📤 **${TEXT.labels.from}:** ${oldChannelName}\n📥 **${TEXT.labels.to}:** ${newChannelName}`;
            }

            return message;
        };

        const getRandomMessage = (messagesArray) => {
            return messagesArray[Math.floor(Math.random() * messagesArray.length)];
        };

        const sendNotification = async (channel, settings, content, isEmbed = true) => {
            if (!settings.isEnabled) return;
            try {
                if (isEmbed && settings.isEmbed) {
                    await channel.send({ embeds: [content] });
                } else {
                    await channel.send({ content: content });
                }
            } catch (error) {
                console.error('Cannot send voice notification:', error);
            }
        };

        // ==========================================
        // LOGIC XỬ LÝ (JOIN/LEAVE/MOVE)
        // ==========================================

        // Left voice channel
        if (oldState.channel && !newState.channel) {
            const settings = await getNotificationSettings(oldState.guild.id);

            if (settings.isEnabled) {
                if (settings.isEmbed) {
                    const randomMessage = getRandomMessage(TEXT.messages.leave);
                    const channelName = getChannelDisplayName(oldState.channel);
                    const embed = createEmbed(
                        TEXT.embedTitles.leave,
                        `**${user.tag}** ${randomMessage}\n\n📍 **${TEXT.labels.room}:** ${channelName}`,
                        0xFF6B6B, // Red
                        '🚪',
                        oldState.channel
                    );

                    // Add activity info specific translation
                    const activities = user.presence?.activities.filter(a => a.type !== 'CUSTOM');
                    if (activities && activities.length > 0) {
                        const activity = activities[0];
                        embed.addFields({
                            name: `${TEXT.activity.prefix} ${TEXT.activity.playing}`,
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
                    const randomMessage = getRandomMessage(TEXT.messages.join);
                    const channelName = getChannelDisplayName(newState.channel);
                    const embed = createEmbed(
                        TEXT.embedTitles.join,
                        `**${user.tag}** ${randomMessage}\n\n📍 **${TEXT.labels.room}:** ${channelName}`,
                        0x4CAF50, // Green
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

            const oldChannelName = getChannelDisplayName(oldState.channel);
            const newChannelName = getChannelDisplayName(newState.channel);

            // Send leave notification to old channel
            if (oldSettings.isEnabled) {
                if (oldSettings.isEmbed) {
                    const randomMessage = getRandomMessage(TEXT.messages.move);
                    const leaveEmbed = createEmbed(
                        TEXT.embedTitles.move,
                        `**${user.tag}** ${randomMessage}\n\n📤 **${TEXT.labels.from}:** ${oldChannelName}\n📥 **${TEXT.labels.to}:** ${newChannelName}`,
                        0xFFA500, // Orange
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
                    // Tạo nội dung mô tả move từ template
                    const moveDesc = TEXT.labels.moveDesc
                        .replace('{user}', user.tag)
                        .replace('{old}', oldChannelName)
                        .replace('{new}', newChannelName);

                    const embed = createEmbed(
                        TEXT.embedTitles.moveJoin,
                        `${moveDesc}\n\n🔀 **${TEXT.labels.from}:** ${oldChannelName}`,
                        0x2196F3, // Blue
                        '🔄',
                        newState.channel
                    );
                    await sendNotification(newState.channel, newSettings, embed, true);
                } else {
                    const moveDesc = TEXT.labels.moveDesc
                        .replace('{user}', user.tag)
                        .replace('{old}', oldChannelName)
                        .replace('{new}', newChannelName);

                    const textMessage = `${statusEmoji[user.presence?.status || 'offline'] || '⚫'} ${moveDesc} 🔄`;
                    await sendNotification(newState.channel, newSettings, textMessage, false);
                }
            }
        }
    }
}

module.exports = NotificationController;
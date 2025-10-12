require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Partials, Events, EmbedBuilder, ActivityType, PermissionsBitField, ChannelType } = require('discord.js');
const connectDB = require('./config/database');
const { handleMessageCreate } = require('./events/messageCreate');
const SpiritRingController = require('./controllers/DauLaDaiLuc/spiritRingController');
const Notification = require('./models/Notification');
const SettingController = require('./controllers/settingController');
const { cleanupTempImages } = require('./utils/drawImage');
const ShopController = require('./controllers/shopController');
const routes = require('./routes');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
const cookieParser = require("cookie-parser");
const { setupDailyStreakCheck } = require('./jobs/dailyStreakCheck');
const StreakService = require('./services/StreakService');
const LanguageController = require('./controllers/languageController');
app.use(cookieParser());

// Discord client setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User]
});

// Middleware
app.use(express.json());
// Middleware
app.use(express.json());

// Cho phép tất cả origin
app.use(cors());

// Nếu muốn giới hạn origin (frontend chạy ở http://localhost:5173 chẳng hạn)
app.use(cors({
    origin: process.env.FE_URL || 'http://localhost:5173',
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
}));
// Make Discord client accessible in routes
app.set('discordClient', client);

// Import routes
app.use('/', routes);
app.use(cookieParser());
async function startServer() {
    try {
        // Connect DB and cleanup
        connectDB();
        cleanupTempImages();

        // Start Express server
        app.listen(port, "0.0.0.0", () => {
            console.log(`🚀 Express server chạy trên http://0.0.0.0:${port}`);
        });

        // Discord bot events
        client.once('ready', () => {
            console.log(`✅ Bot đã đăng nhập với tên: ${client.user.tag}`);
            console.log(`📊 Bot đang ở ${client.guilds.cache.size} server`);
            client.user.setPresence({
                status: "online",
                activities: [
                    {
                        name: "using w instead splash command if bug!!!",
                        type: ActivityType.Playing
                    }
                ]
            });
        });
        setupDailyStreakCheck();
        // ... (all your other Discord event handlers here, unchanged)
        // For brevity, copy all your event handlers from your original code:
        // guildMemberAdd, guildMemberRemove, guildMemberUpdate, voiceStateUpdate, messageCreate, messageReactionAdd, interactionCreate, Events.GuildCreate, Events.GuildDelete
        // Sự kiện thành viên tham gia
        client.on('guildMemberAdd', async (member) => {
            console.log("add");

            await SettingController.sendNotification(member.guild.id, 'welcome', member, client);
        });

        // Sự kiện thành viên rời đi
        client.on('guildMemberRemove', async (member) => {
            console.log("remove");
            await SettingController.sendNotification(member.guild.id, 'goodbye', member, client);
        });

        // Sự kiện boost server
        client.on('guildMemberUpdate', async (oldMember, newMember) => {
            if (!oldMember.premiumSince && newMember.premiumSince) {
                await SettingController.sendNotification(newMember.guild.id, 'booster', newMember, client, true);
            }
        });
        client.on('voiceStateUpdate', async (oldState, newState) => {
            // Chỉ xử lý khi user join voice channel
            const getNotificationSettings = async (guildId) => {
                const setting = await Notification.findOne({ guildId });
                return {
                    isStreak: setting ? setting.isStreakEnabled : true // Default to true if not set
                };
            };
            const settings = await getNotificationSettings(newState.guild.id);
            if (!settings.isStreak) return;
            let channel = newState.channel || oldState.channel;
            if (!channel || channel.type !== ChannelType.GuildVoice) return;
            // xử lý streak
            const userId = newState.member.id;
            const guildId = newState.guild.id;
            try {
                const result = await StreakService.handleUserJoin(userId, guildId);
                // Gửi thông báo tùy theo hành động
                let embed;
                let lang = await LanguageController.getLang(guildId) || 'en';
                console.log(lang)
                switch (result.action) {
                    case 'created':
                        embed = new EmbedBuilder()
                            .setColor(0x00FFFF)
                            .setTitle(lang === 'vi' ? '✨ Chuỗi mới!' : '✨ New Streak!')
                            .setDescription(`<@${userId}> ${lang === 'vi' ? 'vừa bắt đầu chuỗi!' : 'has started a new streak!'}`)
                            .addFields(
                                { name: lang === 'vi' ? '🔥 Chuỗi hiện tại' : '🔥 Current Streak', value: `**${result.streak.currentStreak}** ${lang === 'vi' ? 'ngày' : 'days'}`, inline: true },
                            )
                            .setTimestamp();
                        break;
                    case 'incremented':
                        embed = new EmbedBuilder()
                            .setColor(0x00FF00)
                            .setTitle(lang === 'vi' ? '🔥 Chuỗi tăng!' : '🔥 Streak Increased!')
                            .setDescription(`<@${userId}> ${lang === 'vi' ? 'vừa duy trì chuỗi!' : 'has maintained their streak!'}`)
                            .addFields(
                                // { name: '🔥 Chuỗi hiện tại', value: `**${result.streak.currentStreak}** ngày`, inline: true },
                                // { name: '🔥 Chuỗi dài nhất', value: `**${result.streak.longestStreak}** ngày`, inline: true }
                                { name: lang === 'vi' ? '🔥 Chuỗi hiện tại' : '🔥 Current Streak', value: `**${result.streak.currentStreak}** ${lang === 'vi' ? 'ngày' : 'days'}`, inline: true },
                                { name: lang === 'vi' ? '🔥 Chuỗi dài nhất' : '🔥 Longest Streak', value: `**${result.streak.longestStreak}** ${lang === 'vi' ? 'ngày' : 'days'}`, inline: true }
                            )
                            .setTimestamp();
                        break;

                    case 'recovered':
                        embed = new EmbedBuilder()
                            .setColor(0xFFA500)
                            .setTitle(lang === 'vi' ? '🔄 Chuỗi đã được hồi phục!' : '🔄 Streak Recovered!')
                            .setDescription(`<@${userId}> ${lang === 'vi' ? 'đã sử dụng 1 lần hồi phục' : 'has used 1 recovery'}`)
                            .addFields(
                                { name: lang === 'vi' ? '🔥 Chuỗi hiện tại' : '🔥 Current Streak', value: `**${result.streak.currentStreak}** ${lang === 'vi' ? 'ngày' : 'days'}`, inline: true },
                                { name: lang === 'vi' ? '🔥 Lần hồi phục còn lại' : '🔥 Remaining Recoveries', value: `**${result.streak.recoveryCount}**/3`, inline: true }
                            )
                            .setTimestamp();
                        break;

                    case 'reset':
                        embed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle(lang === 'vi' ? '💔 Chuỗi đã bị ngắt!' : '💔 Streak Reset!')
                            .setDescription(`<@${userId}> ${lang === 'vi' ? 'đã không duy trì được chuỗi' : 'has not maintained their streak'}`)
                            .addFields(
                                { name: lang === 'vi' ? '🔥 Chuỗi dài nhất' : '🔥 Longest Streak', value: `**${result.streak.longestStreak}** ${lang === 'vi' ? 'ngày' : 'days'}`, inline: true },
                                { name: lang === 'vi' ? '🔥 Chuỗi mới' : '🔥 New Streak', value: `**1** ${lang === 'vi' ? 'ngày' : 'days'}`, inline: true }
                            )
                            .setTimestamp();
                        break;
                }

                if (embed) {
                    embed.setFooter({
                        text: `${lang === 'vi' ? 'Bật/ tắt chuỗi bằng lệnh wset streak on/off •' : 'Toggle streak with wset streak on/off in your server •'} ${client.user.username}`,
                    });
                    await channel.send({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Error handling voice state update:', error);
            }

        });

        client.on('voiceStateUpdate', async (oldState, newState) => {
            // Only handle if channel changed
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
        });
        client.on('messageCreate', async (message) => {
            try {
                await handleMessageCreate(client, message);
            } catch (error) {
                console.error("⚠️ Lỗi interactionCreate:", error);

                // Gửi báo cáo bug tới dev
                const devUser = await client.users.fetch(process.env.DEVELOPER_ID);
                if (devUser) {
                    await devUser.send({ content: formatMessageError(message, error) });
                }
                try {
                    await message.author.send(
                        `Error message: \n\`\`\`${error.message}\`\`\`\n` +
                        `❌ Xin lỗi, đã xảy ra lỗi khi xử lý tin nhắn của bạn.\n` +
                        `Đội ngũ dev đã được báo cáo, vui lòng thử lại sau.\n` +
                        `➡️ Để đẩy nhanh tiến độ sửa lỗi, hãy tham gia server Discord của chúng tôi!\n\n` +
                        `**KIỂM TRA LẠI QUYỀN CỦA BOT TRONG SERVER/ CHANNEL!**` +
                        `❌ Sorry, it's some bug when you use our bot.\n` +
                        `The dev team were notified, please try again.\n` +
                        `➡️ Please join our Discord for more information!` +
                        `**CHECK THE BOT’S PERMISSIONS IN THE SERVER/CHANNEL!**`
                    );
                } catch (dmError) {
                    console.warn(`⚠️ Không thể gửi DM tới user ${message.author.tag}:`, dmError);
                }
            }
        });
        function formatMessageError(message, error) {
            const user = message.author;
            const guild = message.guild;
            const channel = message.channel;

            let details =
                `🐞 **Báo cáo lỗi Message**\n` +
                `**User:** ${user.tag} (${user.id})\n` +
                `**User Avatar:** ${user.displayAvatarURL({ dynamic: true })}\n` +
                `**Server:** ${guild?.name || "DM"}\n` +
                `**Server ID:** ${guild?.id || "N/A"}\n` +
                `**Channel:** ${channel?.name || "DM"}\n` +
                `**Channel ID:** ${channel?.id || "N/A"}\n` +
                `**Message Content:** ${message.content || "No content"}\n`;

            if (guild && channel) {
                details += `**Message Link:** https://discord.com/channels/${guild.id}/${channel.id}/${message.id}\n`;
            }

            details += `**Time:** ${new Date().toISOString()}\n`;
            details += `**Error:**\n\`\`\`${error.stack}\`\`\``;

            return details;
        }

        client.on('messageReactionAdd', async (reaction, user) => {
            if (user.bot) return;
            // Nếu message chưa cache thì fetch
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch (err) {
                    console.error("Can't fetch reaction:", err);
                    return;
                }
            }
        })
        client.on('interactionCreate', async (interaction) => {
            try {
                if (interaction.isCommand() || interaction.isChatInputCommand()) {
                    return await require('./events/handleInteractionCreate')(interaction, client);
                } else if (interaction.isStringSelectMenu() || interaction.isSelectMenu()) {
                    return await require('./events/handleInteractionSelectCreate')(interaction);
                } else if (interaction.isButton()) {
                    return await require('./events/handleButtonInteraction')(interaction);
                }
            } catch (error) {
                console.error("⚠️ Lỗi interactionCreate:", error);

                // Gửi báo cáo bug tới dev
                const devUser = await client.users.fetch(process.env.DEVELOPER_ID);
                if (devUser) {
                    await devUser.send({ content: formatInteractionError(interaction, error) });
                }
                try {
                    await interaction.user.send(
                        `Error message: \n\`\`\`${error.message}\`\`\`\n` +
                        `❌ Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu của bạn.\n` +
                        `Đội ngũ dev đã được báo cáo, vui lòng thử lại sau.\n` +
                        `➡️ Để đẩy nhanh tiến độ sửa lỗi, hãy tham gia server Discord của chúng tôi!\n\n` +
                        `**KIỂM TRA LẠI QUYỀN BOT TRONG SERVER/CHANNEL!**` +
                        `❌ Sorry, it's some bug when you use our bot.\n` +
                        `The dev team were notified, please try again.\n` +
                        `➡️ Please join our Discord for more information!` +
                        `**CHECK THE BOT’S PERMISSIONS IN THE SERVER/CHANNEL!**`
                    );

                    // Optional: thông báo nhẹ trong kênh rằng user đã được gửi DM
                    if (!interaction.replied) {
                        await interaction.reply({
                            content: "📩 Mình đã gửi chi tiết lỗi cho bạn qua DM.",
                            ephemeral: true
                        });
                    }
                } catch (dmError) {
                    console.warn(`⚠️ Không thể gửi DM tới user ${interaction.user.tag}:`, dmError);

                    // Nếu không gửi DM được (user tắt DM), báo trực tiếp
                    if (!interaction.replied) {
                        await interaction.reply({
                            content: "❌ Không thể gửi DM cho bạn. Vui lòng bật tin nhắn riêng hoặc thử lại sau.",
                            ephemeral: true
                        });
                    } else {
                        await interaction.followUp({
                            content: "❌ Không thể gửi DM cho bạn. Vui lòng bật tin nhắn riêng hoặc thử lại sau.",
                            ephemeral: true
                        });
                    }
                }

            }
        });
        function formatInteractionError(interaction, error) {
            const user = interaction.user;
            const guild = interaction.guild;
            const channel = interaction.channel;

            let details =
                `🐞 **Báo cáo lỗi Interaction**\n` +
                `**User:** ${user.tag} (${user.id})\n` +
                `**User Avatar:** ${user.displayAvatarURL({ dynamic: true })}\n` +
                `**Server:** ${guild?.name || "DM"}\n` +
                `**Server ID:** ${guild?.id || "N/A"}\n` +
                `**Channel:** ${channel?.name || "DM"}\n` +
                `**Channel ID:** ${channel?.id || "N/A"}\n`;

            if (interaction.isChatInputCommand()) {
                details += `**Command:** /${interaction.commandName}\n`;
                const options = interaction.options.data.map(o => `${o.name}: ${o.value}`).join(", ");
                details += `**Options:** ${options || "None"}\n`;
            } else if (interaction.isButton()) {
                details += `**Button ID:** ${interaction.customId}\n`;
                if (interaction.message) {
                    details += `**Message Link:** https://discord.com/channels/${guild?.id}/${channel?.id}/${interaction.message.id}\n`;
                    details += `**Message Content:** ${interaction.message.content || "No content"}\n`;
                }
            } else if (interaction.isStringSelectMenu()) {
                details += `**Select Menu ID:** ${interaction.customId}\n`;
                details += `**Values:** ${interaction.values.join(", ")}\n`;
            } else if (interaction.isUserContextMenuCommand()) {
                details += `**User Context Menu:** ${interaction.commandName}\n`;
            } else if (interaction.isMessageContextMenuCommand()) {
                details += `**Message Context Menu:** ${interaction.commandName}\n`;
            } else {
                details += `**Interaction Type:** ${interaction.type}\n`;
            }

            details += `**Time:** ${new Date().toISOString()}\n`;
            details += `**Error:**\n\`\`\`${error.stack}\`\`\``;

            return details;
        }
        // Xử lý interactions
        client.on('interactionCreate', async (interaction) => {
            if (interaction.isModalSubmit()) {
                const [cusId, selectedType, channelId] = interaction.customId.split('|')
                if (cusId === 'setupModal') {
                    await interaction.deferReply({ ephemeral: true });

                    // Lấy giá trị từ modal
                    const type = selectedType;
                    // const channelId = channelId;
                    const title = interaction.fields.getTextInputValue('titleInput') || '';
                    const description = interaction.fields.getTextInputValue('descriptionInput') || '';
                    const imageUrl = interaction.fields.getTextInputValue('imageInput') || '';

                    // Kiểm tra loại thông báo hợp lệ
                    if (!['welcome', 'goodbye', 'booster'].includes(type.toLowerCase())) {
                        return interaction.editReply({
                            content: 'Loại thông báo không hợp lệ. Vui lòng sử dụng welcome, goodbye hoặc booster.'
                        });
                    }

                    try {
                        let notificationConfig = await Notification.findOne({ guildId: interaction.guildId });

                        if (!notificationConfig) {
                            notificationConfig = new Notification({
                                guildId: interaction.guildId,
                                channels: []
                            });
                        }

                        // Xóa cấu hình cũ nếu có
                        notificationConfig.channels = notificationConfig.channels.filter(c => c.channelType !== type);

                        // Thiết lập giá trị mặc định nếu không có
                        const finalTitle = title || (type === 'welcome' ? 'Chào mừng {user} đến với {guild}!' :
                            type === 'goodbye' ? 'Tạm biệt {user}!' : 'Cảm ơn {user} đã boost server!');

                        const finalDescription = description || (type === 'welcome' ? 'Xin chào {user.mention}! Chào mừng bạn đến với {guild}. Hiện tại chúng tôi có {memberCount} thành viên.' :
                            type === 'goodbye' ? '{user} đã rời khỏi {guild}. Hiện tại chúng tôi còn {memberCount} thành viên.' :
                                'Cảm ơn {user.mention} đã boost server {guild}!');

                        // Thêm cấu hình mới
                        notificationConfig.channels.push({
                            channelId: channelId,
                            channelType: type,
                            title: finalTitle,
                            description: finalDescription,
                            imageUrl: imageUrl
                        });

                        await notificationConfig.save();

                        const embed = new EmbedBuilder()
                            .setTitle('Thiết lập thông báo thành công!')
                            .setDescription(`Đã thiết lập kênh thông báo ${type} cho kênh <#${channelId}>`)
                            .addFields(
                                { name: 'Tiêu đề', value: finalTitle },
                                { name: 'Mô tả', value: finalDescription }
                            )
                            .setColor(0x00FF00)
                            .setTimestamp();

                        if (imageUrl) {
                            embed.setImage(imageUrl);
                        }

                        await interaction.editReply({ embeds: [embed] });
                    } catch (error) {
                        console.error('Lỗi khi thiết lập thông báo:', error);
                        await interaction.editReply({
                            content: 'Đã xảy ra lỗi khi thiết lập thông báo. Vui lòng thử lại sau.'
                        });
                    }
                }
            }
            if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

            // Kiểm tra xem interaction đã được trả lời chưa
            if (interaction.replied || interaction.deferred) {
                return;
            }

            try {

                // Xử lý select menu sort
                if (interaction.customId.startsWith('spirit_rings_sort_')) {
                    const userId = interaction.customId.split('_')[3];
                    const sortBy = interaction.values[0];

                    // Defer update để tránh lỗi timeout
                    await interaction.deferUpdate();

                    const { embeds, components } = await SpiritRingController.getSpiritRingsEmbed(userId, 1, sortBy);
                    await interaction.editReply({ embeds, components });
                }

                // Xử lý select menu range filter
                else if (interaction.customId.startsWith('spirit_rings_range_')) {
                    const userId = interaction.customId.split('_')[3];
                    const rangeFilter = interaction.values[0];

                    await interaction.deferUpdate();

                    const { embeds, components } = await SpiritRingController.getSpiritRingsEmbed(userId, 1, 'years', rangeFilter);
                    await interaction.editReply({ embeds, components });
                }

                // Xử lý nút phân trang
                else if (interaction.customId.startsWith('spirit_rings_')) {
                    const parts = interaction.customId.split('_');
                    const action = parts[2];
                    const userId = parts[parts.length - 1];

                    let page = 1;

                    if (action === 'next' || action === 'prev' || action === 'last') {
                        page = parseInt(parts[3]);
                    }

                    await interaction.deferUpdate();

                    const { embeds, components } = await SpiritRingController.getSpiritRingsEmbed(userId, page);
                    await interaction.editReply({ embeds, components });
                }
                else if (interaction.customId.startsWith('shop_prev_') || interaction.customId.startsWith('shop_next_')) {
                    const parts = interaction.customId.split('_');
                    const action = parts[1];
                    const page = parseInt(parts[2]);
                    const sortBy = parts[3];
                    const sortOrder = parts[4];
                    const rarityFilter = parts[5];
                    const typeFilter = parts[6];

                    const newPage = action === 'prev' ? page - 1 : page + 1;

                    const embedData = await ShopController.getShopEmbed(
                        newPage,
                        5,
                        sortBy,
                        sortOrder,
                        rarityFilter,
                        typeFilter
                    );

                    await interaction.update(embedData);
                }

                // else if (interaction.customId === 'shop_reset_filters') {
                //     const embedData = await ShopController.getShopEmbed(1, 5, 'name', 'asc', 'all', 'all');
                //     await interaction.update(embedData);
                // }
                if (interaction.isStringSelectMenu()) {
                    // Lấy các tham số hiện tại từ message components
                    const message = interaction.message;
                    // const currentEmbed = message.embeds[0];
                    // const footerText = currentEmbed.footer.text;

                    // Trích xuất trang hiện tại từ footer
                    // const pageMatch = footerText.match(/Trang (\d+)\/(\d+)/);
                    // const currentPage = pageMatch ? parseInt(pageMatch[1]) : 1;

                    // Lấy các tham số từ customId của các nút phân trang
                    let currentSortBy = 'name';
                    let currentSortOrder = 'asc';
                    let currentRarityFilter = 'all';
                    let currentTypeFilter = 'all';

                    // Tìm nút phân trang để lấy các tham số hiện tại
                    const actionRowWithButtons = message.components.find(row =>
                        row.components.some(comp => comp.type === 2 && comp.customId && comp.customId.includes('_prev_'))
                    );

                    if (actionRowWithButtons) {
                        const prevButton = actionRowWithButtons.components.find(comp =>
                            comp.customId && comp.customId.includes('_prev_')
                        );

                        if (prevButton) {
                            const parts = prevButton.customId.split('_');
                            currentSortBy = parts[3] || 'name';
                            currentSortOrder = parts[4] || 'asc';
                            currentRarityFilter = parts[5] || 'all';
                            currentTypeFilter = parts[6] || 'all';
                        }
                    }

                    if (interaction.customId === 'shop_rarity_filter') {
                        const rarityFilter = interaction.values[0];
                        const embedData = await ShopController.getShopEmbed(
                            1, // reset về trang đầu khi thay đổi bộ lọc
                            5,
                            currentSortBy,
                            currentSortOrder,
                            rarityFilter,
                            currentTypeFilter
                        );
                        await interaction.update(embedData);
                    }

                    if (interaction.customId === 'shop_type_filter') {
                        const typeFilter = interaction.values[0];
                        const embedData = await ShopController.getShopEmbed(
                            1, // reset về trang đầu khi thay đổi bộ lọc
                            5,
                            currentSortBy,
                            currentSortOrder,
                            currentRarityFilter,
                            typeFilter
                        );
                        await interaction.update(embedData);
                    }

                    if (interaction.customId === 'shop_sort') {
                        const [newSortBy, newSortOrder] = interaction.values[0].split('_');
                        const embedData = await ShopController.getShopEmbed(
                            1, // reset về trang đầu khi thay đổi sắp xếp
                            5,
                            newSortBy,
                            newSortOrder,
                            currentRarityFilter,
                            currentTypeFilter
                        );
                        await interaction.update(embedData);
                    }
                }
            } catch (error) {
                console.error('Lỗi khi xử lý interaction:', error);

                // Chỉ gửi thông báo lỗi nếu chưa trả lời
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'Đã xảy ra lỗi khi xử lý yêu cầu.',
                        ephemeral: true
                    });
                }
            }
        });
        client.on(Events.GuildCreate, async (guild) => {
            try {
                const developer = await client.users.fetch(process.env.DEVELOPER_ID);

                if (developer) {
                    await developer.send(
                        `✅ Bot vừa được add vào server mới!\n\n**Tên server:** ${guild.name}\n👥 **Thành viên:** ${guild.memberCount}\n🆔 **Server ID:** ${guild.id}`
                    );
                }

                // Kiểm tra quyền của bot trong server
                const botMember = guild.members.me;
                if (!botMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    // Tìm kênh mặc định (system channel) hoặc kênh đầu tiên có thể gửi tin nhắn
                    const defaultChannel = guild.systemChannel ||
                        guild.channels.cache.find(channel =>
                            channel.type === ChannelType.GuildText &&
                            channel.permissionsFor(botMember).has(PermissionsBitField.Flags.SendMessages)
                        );

                    if (defaultChannel) {
                        await defaultChannel.send(
                            `⚠️ **Cảnh báo quan trọng!**\n\n` +
                            `Tôi cần quyền **Quản trị viên (Administrator)** để hoạt động đầy đủ.\n` +
                            `Vui lòng cấp quyền Administrator cho tôi trong cài đặt vai trò (roles) của server.\n` +
                            `Nếu không, một số tính năng có thể không hoạt động chính xác.` +
                            `========English========` +
                            `⚠️ **Important Warning!**\n\n` +
                            `I need Administrator permission to function properly.\n` +
                            `Please grant me the Administrator role in your server settings. \n` +
                            `Without it, some features may not work correctly. \n`
                        );
                    }

                    // Gửi thông báo cho developer
                    if (developer) {
                        await developer.send(
                            `⚠️ Bot được thêm vào server **${guild.name}** nhưng **KHÔNG CÓ** quyền Administrator!\n` +
                            `Server ID: ${guild.id}`
                        );
                    }
                } else {
                    // Nếu bot có quyền admin, thông báo thành công
                    const defaultChannel = guild.systemChannel ||
                        guild.channels.cache.find(channel =>
                            channel.type === ChannelType.GuildText &&
                            channel.permissionsFor(botMember).has(PermissionsBitField.Flags.SendMessages)
                        );

                    if (defaultChannel) {
                        await defaultChannel.send(
                            `👋 Xin chào! Cảm ơn bạn đã mời tôi vào server!\n` +
                            `✅ Tôi đã có đủ quyền để hoạt động. Sử dụng \`whelp\` để xem các lệnh có sẵn.` +
                            `👋 Hello! Thanks for add me!\n` +
                            `✅ Allready done. Use \`whelp\` to view our command.`
                        );
                    }
                }

            } catch (error) {
                console.error("Lỗi khi xử lý sự kiện GuildCreate:", error);
            }
        });
        client.on(Events.GuildDelete, async (guild) => {
            try {
                const developer = await client.users.fetch(process.env.DEVELOPER_ID);

                if (developer) {
                    await developer.send(
                        `❌ Bot vừa bị xoá khỏi server!\n\n**Tên server:** ${guild.name}\n🆔 **Server ID:** ${guild.id}`
                    );
                }
            } catch (error) {
                console.error("Không thể gửi DM cho developer:", error);
            }
        });

        // Error handling
        process.on('unhandledRejection', (reason) => {
            console.error('⚠️ Unhandled Rejection:', reason);
        });
        process.on('uncaughtException', (err) => {
            console.error('💥 Uncaught Exception:', err);
        });

        // Login Discord bot
        await client.login(process.env.DISCORD_TOKEN);

    } catch (error) {
        console.error('Lỗi khởi chạy:', error);
        process.exit(1);
    }
}

startServer();
module.exports = { app, client };

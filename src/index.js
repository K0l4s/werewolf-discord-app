require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Partials, Events, ActivityType, PermissionsBitField, ChannelType } = require('discord.js');
const connectDB = require('./config/database');
const { handleMessageCreate } = require('./events/messageCreate');
const SettingController = require('./controllers/settingController');
const { cleanupTempImages } = require('./utils/drawImage');
const routes = require('./routes');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
const cookieParser = require("cookie-parser");
const { setupDailyStreakCheck, cleanDailyGiveaway, cleanGA } = require('./jobs/dailyStreakCheck');
const StreakController = require('./controllers/streakController');
const NotificationController = require('./controllers/notificationController');
const handleMenu = require('./events/handleMenu');
// const GiveawayHandlers = require('./events/giveAwayHandlers');
const { handleActionMessage } = require('./events/handleActionMessage');
app.use(cookieParser());
const path = require('path');
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
        cleanDailyGiveaway();
        cleanGA()
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
                        name: "using k instead splash command if bug!!!",
                        type: ActivityType.Playing
                    }
                ]
            });
        });
        setupDailyStreakCheck();

        // client.on('messageCreate', (msg) => GiveawayHandlers.handleMessageCreate(client, msg));
        // client.on('interactionCreate', (interaction) => GiveawayHandlers.handleButtonInteraction(interaction));
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
            await StreakController.streakAnoucement(client, oldState, newState);
        });

        client.on('voiceStateUpdate', async (oldState, newState) => {
            // Only handle if channel changed
            await NotificationController.changeRoomAnnouncement(client, oldState, newState);
        });
        client.on('messageCreate', async (message) => {
            try {
                await handleActionMessage(client, message)
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
                    return await require('./events/handleButtonInteraction')(interaction,client);
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
            await handleMenu.handleMenuInteraction(interaction);
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

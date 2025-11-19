// handleInteractionCreate.js
const { DEFAULT_EXP_LVL1, STEP_EXP } = require('../config/constants');
const BattleController = require('../controllers/DauLaDaiLuc/battleController');
const SpiritController = require('../controllers/DauLaDaiLuc/spiritController');
const SpiritRingController = require('../controllers/DauLaDaiLuc/spiritRingController');
const GameController = require('../controllers/gameController');
const LanguageController = require('../controllers/languageController');
const MiniGameController = require('../controllers/miniGameController');
const SettingController = require('../controllers/settingController');
const TopController = require('../controllers/topController');
const UserController = require('../controllers/userController');
const SpiritMaster = require('../models/DauLaDaiLuc/SpiritMaster');
const Prefix = require('../models/Prefix');
const UserService = require('../services/userService');
const { interactionToMessage } = require('../utils/fakeMessage');
const { EmbedBuilder } = require('discord.js');
const GiveawayHandlers = require('./giveAwayHandlers');
const actionService = require('../services/actionService');
const CommonController = require('../controllers/commonController');
const TicketController = require('../controllers/ticketController');
const StreakController = require('../controllers/streakController');

module.exports = async (interaction, client) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    console.log(commandName)
    let lang = await LanguageController.getLang(interaction.guild.id);

    switch (commandName) {
        case 'streak': {
            const data = await StreakController.getUserStreakInfo(client, interaction.user.id, interaction.guild.id, 1);
            return interaction.reply(data);
        }

        case 'ticket': {
            await interaction.deferReply({ ephemeral: true });
            const cateType = interaction.options.getString('type') || 'general';
            const result = await TicketController.createTicket(client, cateType, interaction.user.id, interaction.guild.id)
            return interaction.editReply(result.message)
        }
        case 'ticket_tool': {
            const result = TicketController.sendTool(interaction.guild.id)
            return interaction.reply(result)
        }
        case 'ticket_status': {
            try {
                await interaction.deferReply({ ephemeral: true });
                const result = await TicketController.getTicketStatus(client, interaction.guild.id);

                if (result.success) {
                    return interaction.editReply({ embeds: [result.embed] });
                } else {
                    return interaction.editReply(`❌ Lỗi: ${result.message}`);
                }
            } catch (error) {
                console.error('Lỗi khi lấy ticket status:', error);
                return interaction.editReply('❌ Có lỗi xảy ra khi lấy thông tin ticket status');
            }
        }
        case 'action': {
            await interaction.deferReply({ ephemeral: true });

            try {
                // const user = await User.findOne({ userId: interaction.user.id });
                const stats = await actionService.getServerActions(
                    // interaction.user.id,
                    interaction.guild.id
                );

                const embed = {
                    color: 0x0099ff,
                    title: 'Action Usage Statistics',
                    fields: [
                        {
                            name: 'Uploaded Action',
                            value: `**${stats.length}/10**`,
                            inline: true
                        },
                        ...stats.map(e => ({
                            name: e.action,
                            value: e.imgUrl || 'No image',
                            inline: false
                        }))
                    ],
                    timestamp: new Date()
                };


                return await interaction.editReply({ embeds: [embed] });

            } catch (error) {
                console.error('Error getting stats:', error);
                return await interaction.editReply('An error occurred while fetching your statistics.');
            }
        }
        case 'delete-action': {
            await interaction.deferReply({ ephemeral: true });

            const actionName = interaction.options.getString('action');

            try {
                await actionService.deleteAction(
                    interaction.guild.id,
                    actionName,
                    interaction.user.id
                );

                return await interaction.editReply(`Action "${actionName}" has been deleted successfully!`);

            } catch (error) {
                return await interaction.editReply(`Error: ${error.message}`);
            }
        }
        case 'add-action': {
            await interaction.deferReply({ ephemeral: true });

            const actionName = interaction.options.getString('action');
            const message = interaction.options.getString('message');
            const imageAttachment = interaction.options.getAttachment('image');
            const imageUrl = interaction.options.getString('image-url');
            const requiresTarget = interaction.options.getBoolean('requires-target') ?? true;

            // Validate that at least one image source is provided
            if (!imageAttachment && !imageUrl) {
                return await interaction.editReply('Please provide either an image upload or an image URL.');
            }

            // Validate that only one image source is provided
            if (imageAttachment && imageUrl) {
                return await interaction.editReply('Please provide only one image source (upload or URL), not both.');
            }

            try {
                let actionData;

                if (imageAttachment) {
                    // Handle file upload from Discord
                    if (!imageAttachment.contentType?.startsWith('image/')) {
                        return await interaction.editReply('Please upload a valid image file (jpg, png, gif, webp).');
                    }

                    // Download the image from Discord CDN
                    const response = await fetch(imageAttachment.url);
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    actionData = {
                        action: actionName,
                        message: message,
                        imageType: 'upload',
                        imageData: {
                            originalname: imageAttachment.name || 'discord_image.png',
                            mimetype: imageAttachment.contentType,
                            buffer: buffer,
                            size: imageAttachment.size
                        },
                        requiresTarget: requiresTarget
                    };
                } else {
                    // Handle URL
                    actionData = {
                        action: actionName,
                        message: message,
                        imageType: 'url',
                        imageData: imageUrl,
                        requiresTarget: requiresTarget
                    };
                }

                const newAction = await actionService.addAction(
                    interaction.guild.id,
                    actionData,
                    interaction.user.id
                );

                await interaction.editReply(`Action "${actionName}" has been added successfully!`);

            } catch (error) {
                console.error('Error adding action:', error);
                await interaction.editReply(`Error: ${error.message}`);
            } finally {
                return
            }
        }
        case 'giveaway': {

            return await GiveawayHandlers.showGiveawayModal(interaction)
        }
        // case 'spirit': {
        //     await interaction.deferReply();
        //     if (interaction.options.getSubcommand() === "list") {
        //         try {
        //             const page = interaction.options.getString("pagenumber");
        //             const embed = await SpiritController.showAllSpirits(page);
        //             return await interaction.editReply({ embeds: [embed] });
        //         } catch (error) {
        //             console.error('Lỗi khi hiển thị Vũ Hồn:', error);
        //             const errorEmbed = new EmbedBuilder()
        //                 .setTitle('❌ Lỗi')
        //                 .setDescription('Đã xảy ra lỗi khi tải danh sách Vũ Hồn!')
        //                 .setColor(0xFF0000);
        //             return await interaction.editReply({ embeds: [errorEmbed] });
        //         }
        //     } else if (interaction.options.getSubcommand() === "information") {
        //         try {
        //             const result = await SpiritController.getSpiritInfo(interaction.user.id);
        //             return await interaction.editReply(result);
        //         } catch (error) {
        //             const result = "Lỗi lấy dữ liệu";
        //             return await interaction.editReply({ content: result });
        //         }
        //     } else if (interaction.options.getSubcommand() === "ring") {
        //         const userId = interaction.user.id;
        //         const { embeds, components } = await SpiritRingController.getSpiritRingsEmbed(userId);
        //         return await interaction.editReply({ embeds, components });
        //     }
        //     break;
        // }

        case 'top': {
            await interaction.deferReply({ ephemeral: false });
            return await TopController.handleTopCommand(interaction, [], true, client);
        }

        case 'set': {

            await interaction.deferReply();
            if (interaction.options.getSubcommand() === "prefix") {
                const embed = await CommonController.setPrefix(
                    interaction.guild.id,
                    interaction.options.getString("value"),
                    lang
                );
                await interaction.editReply(embed);
                return;
            } else if (interaction.options.getSubcommand() === "language") {
                const newLang = interaction.options.getString("value");
                console.log(lang);
                const embed = await CommonController.setLanguage(
                    interaction.guild.id,
                    newLang,
                );
                await interaction.editReply(embed);
                return;
            }
            else if (interaction.options.getSubcommand() === "streak") {
                const newS = interaction.options.getString("value");
                const embed = await CommonController.setStreak(
                    interaction.guild.id,
                    newS,
                    lang
                );
                await interaction.editReply(embed);
                return;
            }
            else if (interaction.options.getSubcommand() === "voice") {
                const newVC = interaction.options.getString("value");
                const embed = await CommonController.setVoiceAnnouce(
                    interaction.guild.id,
                    newVC,
                    lang
                );
                await interaction.editReply(embed);
                return;
            }
            else if (interaction.options.getSubcommand() === "embed") {
                const newE = interaction.options.getString("value");
                const embed = await CommonController.setEmbedAnounce(
                    interaction.guild.id,
                    newE,
                    lang
                );
                await interaction.editReply(embed);
                return;
            }

            // else if (interaction.options.getSubcommand() === "notification") {
            //     const channel = interaction.options.getChannel("channel");
            //     const channelId = channel.id;
            //     await SettingController.setNoti(interaction, channelId);
            //     return;
            // }

            break;
        }

        // case 'awake': {
        //     await interaction.deferReply();
        //     const userId = interaction.user.id;
        //     console.log("Đang tiến hành thức tỉnh võ hồn cho user:", userId);

        //     try {
        //         const currentCount = await SpiritMaster.countDocuments({ userId });
        //         console.log("Số spirit hiện tại:", currentCount);

        //         const embed = await SpiritController.awakenRandomSpirit(userId);

        //         if (typeof embed === 'string') {
        //             return await interaction.editReply(embed);
        //         } else if (embed && embed.data) {
        //             return await interaction.editReply({ embeds: [embed] });
        //         } else {
        //             console.error("Embed không hợp lệ:", embed);
        //             return await interaction.editReply("❌ Đã xảy ra lỗi khi tạo embed!");
        //         }
        //     } catch (error) {
        //         console.error("Lỗi khi thức tỉnh:", error);
        //         return await interaction.editReply("❌ Đã xảy ra lỗi khi thức tỉnh vũ hồn!");
        //     }
        // }

        // case 'battle': {
        //     await interaction.deferReply();
        //     await BattleController.handleBattleCommand(interaction);
        //     return;
        // }

        case 'join': {
            await interaction.deferReply();
            const result = await GameController.handleJoinCommand(interaction.channel.id, interaction.user.id, lang);
            await interaction.editReply(result);
            // await GameController.handleJoinCommand(interactionToMessage(interaction), lang);
            return;
        }

        case 'new': {
            await interaction.deferReply();

            const embed = await GameController.handleCreateNewRoom(interaction.channel.id, lang);
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        case 'give': {
            await interaction.deferReply();
            const mentionUser = interaction.options.getUser('user');
            const balance = interaction.options.getNumber('amount');
            const embed = new EmbedBuilder();

            if (!mentionUser) {
                embed.setTitle("<a:deny:1433805273595904070> Transfer Error!")
                    .setDescription(`You must mention receiver first!`)
                    .setColor('Red');
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            if (mentionUser.id === interaction.user.id) {
                embed.setTitle("<a:deny:1433805273595904070> Transfer Error!")
                    .setDescription(`You can't send money to yourself!`)
                    .setColor('Red');
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            // await UserController.giveMoneyTo(
            //     interactionToMessage(interaction),
            //     mentionUser,
            //     balance
            // );
            // return;
            const result = await UserController.giveMoneyTo(
                interaction.user.id,
                mentionUser,
                balance
            );
            await interaction.editReply(result)
            setTimeout(async () => {
                await interaction.editReply({ components: [] });
            }, 60000);
            return;
        }

        case 'baucua': {
            await interaction.deferReply();
            const balance = interaction.options.getNumber('amount');
            const result = await MiniGameController.bauCua(interaction.user.id, balance);
            await interaction.editReply(result);
            return;
        }
        case 'onetwothree': {
            await interaction.deferReply();
            const balance = interaction.options.getNumber('amount');
            const result = await MiniGameController.oneTwoThree(interaction.user.id, balance, lang);
            await interaction.editReply(result);
            return;
        }
        case 'help': {
            await interaction.deferReply();
            const commandGroups = {
                werewolf: {
                    name: "Werewolf",
                    description: "Các lệnh chơi Ma Sói",
                    emoji: "🐺",
                    color: "#8B4513",
                    commands: [
                        { name: "wnew / wn", desc: "Tạo phòng mới" },
                        { name: "wjoin / wj", desc: "Tham gia phòng" },
                        { name: "wstart / ws", desc: "Bắt đầu game" },
                    ]
                },
                // soulland: {
                //     name: "Soul Land",
                //     description: "Các lệnh Đấu La Đại Lục",
                //     emoji: "🌌",
                //     color: "#9370DB",
                //     commands: [
                //         { name: "/awake", desc: "Thức tỉnh Vũ Hồn" },
                //         { name: "/spirit list <page>", desc: "Xem danh sách Vũ Hồn" },
                //         { name: "/spirit information", desc: "Xem chi tiết Vũ Hồn" },
                //         { name: "wspirit attach <spiritRef> <ringId>", desc: "Khảm Hồn Hoàn" },
                //         { name: "whunt", desc: "Săn Hồn Thú (có thể nhận Hồn Hoàn)" },
                //         { name: "wbattle <@user> hoặc /battle <@user>", desc: "Khiêu chiến người khác" },
                //     ]
                // },
                economy: {
                    name: "Kinh tế",
                    description: "Các lệnh liên quan đến tiền tệ",
                    emoji: "💰",
                    color: "#FFD700",
                    commands: [
                        { name: "/wallet", desc: "Xem ví tiền" },
                        { name: "/give <@user> <amount>", desc: "Chuyển coin cho người khác" },
                        { name: "/donate", desc: "Ủng hộ tác giả ☕" },
                        { name: "wdaily", desc: "Nhận thưởng hằng ngày" },
                    ]
                },
                shop: {
                    name: "Shop",
                    description: "Mua bán vật phẩm",
                    emoji: "🛒",
                    color: "#00CED1",
                    commands: [
                        { name: "wshop", desc: "Xem cửa hàng" },
                        { name: "wbuy <itemId> <số lượng>", desc: "Mua vật phẩm" },
                    ]
                },
                minigame: {
                    name: "Minigames",
                    description: "Các trò chơi nhỏ",
                    emoji: "🎮",
                    color: "#FF69B4",
                    commands: [
                        { name: "wbaucua <bet>", desc: "Chơi Bầu Cua" },
                        { name: "wkeoco <bet>", desc: "Chơi Kéo Cưa" },
                        { name: "wjackpot <bet>", desc: "Jackpot (xèng máy)" },
                        { name: "wkeobuabao <bet>", desc: "Kéo Búa Bao" },
                        { name: "wbaicao <bet>", desc: "Bài Cào" },
                    ]
                },
                system: {
                    name: "Cấu hình & Hệ thống",
                    description: "Các lệnh quản lý bot",
                    emoji: "⚙️",
                    color: "#808080",
                    commands: [
                        { name: "/set prefix <value>", desc: "Đặt prefix mới (Admin)" },
                        { name: "/about", desc: "Giới thiệu bot" },
                        { name: "/help", desc: "Xem hướng dẫn" },
                    ]
                }
            };

            const groupArg = interaction.options.getString("group");

            if (!groupArg) {
                const embed = new EmbedBuilder()
                    .setTitle("📖 Hướng Dẫn Sử Dụng Bot")
                    .setDescription("Dưới đây là danh sách các nhóm lệnh có sẵn. Sử dụng `/help [tên nhóm]` để xem chi tiết từng nhóm.")
                    .setColor("#0099FF")
                    .setThumbnail(client.user.displayAvatarURL())
                    .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                    .setTimestamp();

                for (const key in commandGroups) {
                    const group = commandGroups[key];
                    embed.addFields({
                        name: `${group.emoji} ${group.name}`,
                        value: `${group.description}\n\`/help ${key}\``,
                        inline: true
                    });
                }
                embed.addFields({
                    name: `Join Our Support Server`,
                    value: `👉 [Click here](https://discord.gg/kDkydXrtua) to join!`,
                    inline: false
                });

                return await interaction.editReply({ embeds: [embed] });
            }

            const groupKey = {
                ww: "werewolf",
                sl: "soulland",
                eco: "economy",
                shop: "shop",
                mini: "minigame",
                sys: "system"
            }[groupArg.toLowerCase()] || groupArg.toLowerCase();

            const group = commandGroups[groupKey];
            if (!group) {
                return await interaction.editReply({
                    content: "❌ Nhóm lệnh không tồn tại! Sử dụng `/help` để xem danh sách nhóm lệnh."
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`${group.emoji} Nhóm lệnh: ${group.name}`)
                .setDescription(group.description)
                .setColor(group.color)
                .setFooter({ text: `<> = bắt buộc, [] = tuỳ chọn • Yêu cầu bởi ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            group.commands.forEach(cmd => {
                embed.addFields({
                    name: `\`${cmd.name}\``,
                    value: cmd.desc,
                    inline: false
                });
            });
            embed.addFields({
                name: `Join Our Support Server`,
                value: `👉 [Click here](https://discord.gg/kDkydXrtua) to join!`,
                inline: false
            });

            return await interaction.editReply({ embeds: [embed] });
        }

        case 'daily': {
            await interaction.deferReply();
            const result = await CommonController.dailyReward(interaction.user.id);
            return await interaction.editReply(result);

        }
        case 'profile': {
            await interaction.deferReply();
            const userId = interaction.user.id;
            const avatarUrl = interaction.user.displayAvatarURL()
            const username = interaction.user.globalName || interaction.user.username
            const embed = await UserController.createProfileEmbed(userId, avatarUrl, username)
            // Gửi embed
            return await interaction.editReply({ embeds: [embed] });
        }
        case 'about': {
            await interaction.deferReply();
            const embed = new EmbedBuilder()
                .setTitle("🤖 About This Bot")
                .setDescription("This bot is a Discord game and utility bot created by **Huỳnh Trung Kiên**.")
                .setColor("Green")
                .addFields(
                    { name: "Version", value: "Beta_1.0.0", inline: true },
                    { name: "Developer", value: "Huỳnh Trung Kiên", inline: true },
                    { name: "Features", value: "• Game rooms\n• Voting system\n• Wallet & money transfer\n• Fun commands" },
                    { name: "Support", value: "Contact the developer if you encounter any bugs." }
                )
                .setFooter({ text: "Enjoy the bot and have fun! 🎉" });

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        case 'start': {
            await interaction.deferReply();
            if (!interaction.guild) {
                console.log("Interaction không ở trong server (guild) → guild = null");
                interaction.reply("You must authorization for bot to access this guild!")
                return;
            }

            if (!interaction.channel) {
                console.log("Bot không truy cập được channel này → channel = null");
                interaction.reply("You must authorization for bot to access this channel!")
                return;
            }
            await GameController.handleStartGame(interactionToMessage(interaction), lang);
            return;
        }

        case 'wallet': {
            await interaction.deferReply();
            await UserController.handleBalance(interactionToMessage(interaction));
            return;
        }

        case 'donate': {
            await interaction.deferReply();
            const donateMessage = await CommonController.donate();
            await interaction.editReply(donateMessage);
            return;
        }

        default: {
            await interaction.deferReply();
            await interaction.editReply({ content: "⚠️ Lệnh không hợp lệ." });
            return;
        }
    }
};

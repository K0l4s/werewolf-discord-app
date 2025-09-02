// handleInteractionCreate.js
const { DEFAULT_EXP_LVL1, STEP_EXP } = require('../config/constants');
const BattleController = require('../controllers/DauLaDaiLuc/battleController');
const SpiritController = require('../controllers/DauLaDaiLuc/spiritController');
const SpiritRingController = require('../controllers/DauLaDaiLuc/spiritRingController');
const GameController = require('../controllers/gameController');
const MiniGameController = require('../controllers/miniGameController');
const SettingController = require('../controllers/settingController');
const UserController = require('../controllers/userController');
const SpiritMaster = require('../models/DauLaDaiLuc/SpiritMaster');
const Prefix = require('../models/Prefix');
const GameService = require('../services/gameService');
const { interactionToMessage } = require('../utils/fakeMessage');
const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction, client) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
        switch (commandName) {
            // case ''
            case 'spirit': {
                if (interaction.options.getSubcommand() === "list") {
                    try {
                        // Lấy số trang từ message (ví dụ: "spirit 2")
                        const page = interaction.options.getString("pagenumber");;

                        const embed = await SpiritController.showAllSpirits(page);
                        return interaction.reply({ embeds: [embed] });
                    } catch (error) {
                        console.error('Lỗi khi hiển thị Vũ Hồn:', error);

                        const errorEmbed = new EmbedBuilder()
                            .setTitle('❌ Lỗi')
                            .setDescription('Đã xảy ra lỗi khi tải danh sách Vũ Hồn!')
                            .setColor(0xFF0000);

                        return interaction.reply({ embeds: [errorEmbed] });
                    }
                } else if (interaction.options.getSubcommand() === "information") {
                    try {
                        const result = await SpiritController.getSpiritInfo(interaction.user.id);
                        interaction.reply(result);
                    } catch (error) {
                        // Fallback về simple info nếu bị lỗi
                        const result = "Lỗi lấy dữ liệu"
                        interaction.reply({ content: result });
                    }
                } else if (interaction.options.getSubcommand() === "ring") {
                    const userId = interaction.user.id;
                    const { embeds, components } = await SpiritRingController.getSpiritRingsEmbed(userId);

                    await interaction.reply({ embeds, components });
                }
            }
            case 'set': {
                if (interaction.options.getSubcommand() === "prefix") {
                    const newPrefix = interaction.options.getString("value");

                    await Prefix.findOneAndUpdate(
                        { guildId: interaction.guild.id },
                        { prefix: newPrefix },
                        { upsert: true }
                    );

                    await interaction.reply(`✅ Prefix server đã đổi thành: \`${newPrefix}\``);
                    return;
                }
                else if (interaction.options.getSubcommand() === "notification") {
                    const channel = interaction.options.getChannel("channel");

                    // Lấy ID kênh
                    const channelId = channel.id;
                    await SettingController.setNoti(interaction, channelId)
                    return
                }
                break;
            }

            case 'awake': {
                const userId = interaction.user.id;
                console.log("Đang tiến hành thức tỉnh võ hồn cho user:", userId);

                try {
                    const currentCount = await SpiritMaster.countDocuments({ userId });
                    console.log("Số spirit hiện tại:", currentCount);

                    const embed = await SpiritController.awakenRandomSpirit(userId);

                    if (typeof embed === 'string') {
                        await interaction.reply(embed);
                    } else if (embed && embed.data) {
                        await interaction.reply({ embeds: [embed] });
                    } else {
                        console.error("Embed không hợp lệ:", embed);
                        await interaction.reply("❌ Đã xảy ra lỗi khi tạo embed!");
                    }
                } catch (error) {
                    console.error("Lỗi khi thức tỉnh:", error);
                    await interaction.reply("❌ Đã xảy ra lỗi khi thức tỉnh vũ hồn!");
                }
                return;
            }

            case 'spirit': {
                try {
                    const result = await SpiritController.getSpiritInfo(interaction.user.id);
                    await interaction.reply(result);
                } catch (error) {
                    await interaction.reply("❌ Lỗi lấy dữ liệu!");
                }
                return;
            }

            case 'battle': {
                await BattleController.handleBattleCommand(interaction);
                return;
            }

            // case 'create': {
            //     await GameController.handleCreateRoom(interactionToMessage(interaction));
            //     return;
            // }

            case 'join': {
                await GameController.handleJoinCommand(interactionToMessage(interaction));
                return;
            }

            case 'new': {
                const embed = await GameController.handleCreateNewRoom(interaction.channel.id);
                await interaction.reply({ embeds: [embed] });
                return;
            }

            case 'give': {
                const mentionUser = interaction.options.getUser('user');
                const balance = interaction.options.getNumber('amount');
                const embed = new EmbedBuilder();

                if (!mentionUser) {
                    embed.setTitle("❌ Transfer Error!")
                        .setDescription(`You must mention receiver first!`)
                        .setColor('Red');
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }

                if (mentionUser.id === interaction.user.id) {
                    embed.setTitle("❌ Transfer Error!")
                        .setDescription(`You can't send money to yourself!`)
                        .setColor('Red');
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }

                await UserController.giveMoneyTo(
                    interactionToMessage(interaction),
                    mentionUser,
                    balance
                );
                return;
            }
            case 'baucua': {
                const balance = interaction.options.getNumber('amount');
                return await MiniGameController.bauCua(interaction.user.id, interactionToMessage(interaction), balance)
            }
            case 'help': {
                // const embed = new EmbedBuilder()
                //     .setTitle("📜 List of Commands")
                //     .setDescription("Here are the available commands you can use:")
                //     .setColor("Blue")
                //     .addFields(
                //         { name: "🧟‍♂️ Werewolf Commands", value: "`/create`, `/join`, `/new`, `/start`" },
                //         { name: "👤 User Commands", value: "`/give <user> <amount>`, `/wallet`" },
                //         { name: "🎮 Minigames", value: "`/baucua`, `/jackpot`, `/keoco`, `/keobuabao`, `/baicao`" },
                //         { name: "ℹ️ Information", value: "`/help`, `/donate`, `/about`" }
                //     )
                //     .setFooter({ text: "Use commands wisely! 😎" });
                const { EmbedBuilder } = require('discord.js');

                const commandGroups = {
                    werewolf: {
                        name: "Werewolf",
                        description: "Các lệnh chơi Ma Sói",
                        emoji: "🐺",
                        color: "#8B4513", // Màu nâu
                        commands: [
                            { name: "wnew / wn", desc: "Tạo phòng mới" },
                            { name: "wjoin / wj", desc: "Tham gia phòng" },
                            { name: "wstart / ws", desc: "Bắt đầu game" },
                        ]
                    },
                    soulland: {
                        name: "Soul Land",
                        description: "Các lệnh Đấu La Đại Lục",
                        emoji: "🌌",
                        color: "#9370DB", // Màu tím nhạt
                        commands: [
                            { name: "/awake", desc: "Thức tỉnh Vũ Hồn" },
                            { name: "/spirit list <page>", desc: "Xem danh sách Vũ Hồn" },
                            { name: "/spirit information", desc: "Xem chi tiết Vũ Hồn" },
                            { name: "wspirit attach <spiritRef> <ringId>", desc: "Khảm Hồn Hoàn" },
                            { name: "whunt", desc: "Săn Hồn Thú (có thể nhận Hồn Hoàn)" },
                            { name: "wbattle <@user> hoặc /battle <@user>", desc: "Khiêu chiến người khác" },
                        ]
                    },
                    economy: {
                        name: "Kinh tế",
                        description: "Các lệnh liên quan đến tiền tệ",
                        emoji: "💰",
                        color: "#FFD700", // Màu vàng
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
                        color: "#00CED1", // Màu xanh ngọc
                        commands: [
                            { name: "wshop", desc: "Xem cửa hàng" },
                            { name: "wbuy <itemId> <số lượng>", desc: "Mua vật phẩm" },
                        ]
                    },
                    minigame: {
                        name: "Minigames",
                        description: "Các trò chơi nhỏ",
                        emoji: "🎮",
                        color: "#FF69B4", // Màu hồng
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
                        color: "#808080", // Màu xám
                        commands: [
                            { name: "/set prefix <value>", desc: "Đặt prefix mới (Admin)" },
                            { name: "/about", desc: "Giới thiệu bot" },
                            { name: "/help", desc: "Xem hướng dẫn" },
                        ]
                    }
                };

                const groupArg = interaction.options.getString("group");

                if (!groupArg) {
                    // Show all groups
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
                    })

                    return interaction.reply({ embeds: [embed] });
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
                    return interaction.reply({
                        content: "❌ Nhóm lệnh không tồn tại! Sử dụng `/help` để xem danh sách nhóm lệnh.",
                        ephemeral: true
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
                    })
                await interaction.reply({ embeds: [embed] });
                return;
            }
            case 'daily': {

                const cooldown = 1000 * 60 * 60 * 24;
                const reward = {
                    coin: 100 + Math.floor(Math.random() * 50),
                    exp: 50 + Math.floor(Math.random() * 30),
                    bonus: Math.random() < 0.2
                };

                let userData = user;

                // Check cooldown
                if (userData.lastDaily && Date.now() - userData.lastDaily.getTime() < cooldown) {
                    const timeLeft = cooldown - (Date.now() - userData.lastDaily.getTime());
                    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

                    const cooldownEmbed = new EmbedBuilder()
                        .setColor('#FF5555')
                        .setTitle('⏰ Đã nhận Daily rồi!')
                        .setDescription(`Bạn cần chờ thêm **${hours}h ${minutes}m** nữa để nhận daily tiếp theo.`)
                        .addFields(
                            { name: '⏰ Lần cuối nhận', value: `<t:${Math.floor(userData.lastDaily.getTime() / 1000)}:R>`, inline: true },
                            { name: '🕒 Còn lại', value: `${hours}h ${minutes}m`, inline: true }
                        )
                        .setFooter({ text: 'Daily reset mỗi 24 giờ' });

                    return interaction.reply({ embeds: [cooldownEmbed] });
                }

                // Tính toán reward
                let totalCoin = reward.coin;
                let totalExp = reward.exp;
                let bonusText = '';

                if (reward.bonus) {
                    const bonusCoin = Math.floor(totalCoin * 0.5);
                    const bonusExp = Math.floor(totalExp * 0.5);
                    totalCoin += bonusCoin;
                    totalExp += bonusExp;
                    bonusText = `🎁 **Bonus:** +${bonusCoin} coin +${bonusExp} exp`;
                }

                // Cập nhật dữ liệu
                userData.coin += totalCoin;
                userData.exp += totalExp;

                // Check level up
                let levelUpText = '';
                let levelsGained = 0;
                const originalLevel = userData.lvl;

                while (userData.exp >= userData.lvl * 100) {
                    const expNeeded = userData.lvl * 100;
                    userData.exp -= expNeeded;
                    userData.lvl += 1;
                    levelsGained++;
                }

                if (levelsGained > 0) {
                    if (levelsGained === 1) {
                        levelUpText = `🚀 **Level Up!** Level ${originalLevel} → **${userData.lvl}**`;
                    } else {
                        levelUpText = `🚀 **Level Up!** +${levelsGained} levels (${originalLevel} → **${userData.lvl}**)`;
                    }
                }
                const expToLevel = Number(user.lvl) * Number(DEFAULT_EXP_LVL1) * Number(STEP_EXP);

                userData.lastDaily = new Date();
                await userData.save();

                // Tạo embed thành công
                const successEmbed = new EmbedBuilder()
                    .setColor('#55FF55')
                    .setTitle('🎉 Daily Reward')
                    .setDescription('Bạn đã nhận daily thành công!')
                    .addFields(
                        { name: '💰 Coin nhận được', value: `**${totalCoin}** coin`, inline: true },
                        { name: '⭐ EXP nhận được', value: `**${totalExp}** exp`, inline: true },
                        { name: '📊 Level hiện tại', value: `**${userData.lvl}**`, inline: true },
                        { name: '🎯 EXP hiện tại', value: `**${userData.exp}/${expToLevel}**`, inline: true },
                        { name: '🏦 Tổng coin', value: `**${userData.coin.toLocaleString()}** coin`, inline: true }
                    )
                    .setFooter({ text: `Daily tiếp theo: ${new Date(Date.now() + cooldown).toLocaleTimeString()}` });

                // Thêm bonus field nếu có
                if (bonusText) {
                    successEmbed.addFields({ name: '🎁 May mắn', value: bonusText, inline: false });
                }

                // Thêm level up field nếu có
                if (levelUpText) {
                    successEmbed.addFields({ name: '✨ Thành tựu', value: levelUpText, inline: false });
                }

                return interaction.reply({ embeds: [successEmbed] });

            }
            case 'about': {
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

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            case 'start': {
                await GameController.handleStartGame(interactionToMessage(interaction));
                return;
            }

            case 'wallet': {
                await UserController.handleBalance(interactionToMessage(interaction));
                return;
            }

            case 'donate': {
                await interaction.reply({ content: "🔗 Momo: 0827626203 \n Name: Huỳnh Trung Kiên", ephemeral: true });
                return;
            }

            default: {
                await interaction.reply({ content: "⚠️ Lệnh không hợp lệ.", ephemeral: true });
                return;
            }
        }
    } catch (error) {
        console.error("⚠️ Lỗi interactionCreate:", error);

        // fallback: check nếu chưa reply
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "❌ Có lỗi xảy ra khi xử lý lệnh!", ephemeral: true });
        } else {
            await interaction.followUp({ content: "❌ Có lỗi xảy ra khi xử lý lệnh!", ephemeral: true });
        }
    }
};

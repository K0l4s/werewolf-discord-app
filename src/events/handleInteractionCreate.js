// handleInteractionCreate.js
const BattleController = require('../controllers/DauLaDaiLuc/battleController');
const SpiritController = require('../controllers/DauLaDaiLuc/spiritController');
const GameController = require('../controllers/gameController');
const UserController = require('../controllers/userController');
const SpiritMaster = require('../models/DauLaDaiLuc/SpiritMaster');
const Prefix = require('../models/Prefix');
const GameService = require('../services/gameService');
const { interactionToMessage } = require('../utils/fakeMessage');
const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    switch (commandName) {
        case 'set':
            {
                if (interaction.options.getSubcommand() === "prefix") {
                    const newPrefix = interaction.options.getString("value");

                    await Prefix.findOneAndUpdate(
                        { guildId: interaction.guild.id },
                        { prefix: newPrefix },
                        { upsert: true }
                    );

                    await interaction.reply(`✅ Prefix server đã đổi thành: \`${newPrefix}\``);
                }
            }
        case 'awake':
            {
                const userId = interaction.user.id;
                console.log("Đang tiến hành thức tỉnh võ hồn cho user:", userId);

                try {
                    // Debug: kiểm tra số spirit hiện có
                    const currentCount = await SpiritMaster.countDocuments({ userId });
                    console.log("Số spirit hiện tại:", currentCount);

                    const embed = await SpiritController.awakenRandomSpirit(userId);
                    console.log("Kết quả trả về:", typeof embed, embed);

                    if (typeof embed === 'string') {
                        interaction.reply(embed);
                    } else if (embed && embed.data) {
                        interaction.reply({ embeds: [embed] });
                    } else {
                        console.error("Embed không hợp lệ:", embed);
                        interaction.reply("❌ Đã xảy ra lỗi khi tạo embed!");
                    }
                } catch (error) {
                    console.error("Lỗi khi thức tỉnh:", error);
                    interaction.reply("❌ Đã xảy ra lỗi khi thức tỉnh vũ hồn!");
                }
            }
        case 'spirit':
            {
                try {
                    const result = await SpiritController.getSpiritInfo(interaction.user.id);
                    interaction.reply(result);
                } catch (error) {
                    // Fallback về simple info nếu bị lỗi
                    const result = "Lỗi lấy dữ liệu"
                    interaction.reply(result);
                }
            }
        case 'battle':
            {
                await BattleController.handleBattleCommand(interaction);
            }
        case 'create':
            return GameController.handleCreateRoom(interactionToMessage(interaction));
        case 'join':
            return GameController.handleJoinCommand(interactionToMessage(interaction));
        case 'new':
            return GameController.handleCreateNewRoom(interactionToMessage(interaction));
        case 'give': {
            const mentionUser = interaction.options.getUser('user');
            const balance = interaction.options.getNumber('amount');
            console.log(balance)
            const embed = new EmbedBuilder();

            if (!mentionUser) {
                embed.setTitle("❌ Transfer Error!")
                    .setDescription(`You must mention receiver first!`)
                    .setColor('Red');
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (mentionUser.id === interaction.user.id) {
                embed.setTitle("❌ Transfer Error!")
                    .setDescription(`You can't send money to yourself!`)
                    .setColor('Red');
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Gọi hàm xử lý logic
            return UserController.giveMoneyTo(
                interactionToMessage(interaction),
                mentionUser,
                balance
            );
        }
        case 'help': {
            const embed = new EmbedBuilder()
                .setTitle("📜 List of Commands")
                .setDescription("Here are the available commands you can use:")
                .setColor("Blue")
                .addFields(
                    // Werewolf group
                    {
                        name: "🧟‍♂️ Werewolf Commands",
                        value:
                            "`/create` – Create a new game room.\n" +
                            "`/join` – Join an existing game room.\n" +
                            "`/new` – Start a completely new game room.\n" +
                            "`/start` – Start the current game room."
                    },

                    // User group
                    {
                        name: "👤 User Commands",
                        value:
                            "`/give <user> <amount>` – Send coins to another user.\n" +
                            "`/wallet` – Check your current coin balance."
                    },

                    // Minigames group
                    {
                        name: "🎮 Minigames",
                        value:
                            "🎲 `/baucua [amount]` – Play Bau Cua, bet freely or use default amount.\n" +
                            "🎰 `/jackpot [amount]` – Play Jackpot, draw 3 times to determine win/loss.\n" +
                            "💪 `/keoco [amount]` – Play Tug of War, win or lose based on pulling power.\n" +
                            "✊✋✌️ `/keobuabao [amount]` – Play Rock-Paper-Scissors against the bot.\n" +
                            "🃏 `/baicao [amount]` – Play 3-card game, draw 3 cards each to calculate points."
                    },

                    // Information group
                    {
                        name: "ℹ️ Information",
                        value:
                            "`/help` – Display this help message.\n" +
                            "`/donate` – Support the developer via Momo.\n" +
                            "`/about` – Information about the bot."
                    }
                )
                .setFooter({ text: "Use commands wisely! 😎" });

            return interaction.reply({ embeds: [embed], ephemeral: true });
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

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        case 'start': {
            // const currentGame = await GameService.getGameByChannel(interaction.channel.id)
            return GameController.handleStartGame(interactionToMessage(interaction))
        }
        case 'wallet':
            return UserController.handleBalance(interactionToMessage(interaction))
        case 'donate':
            {
                return interaction.reply({ content: "🔗 Momo: 0827626203 \n Name: Huỳnh Trung Kiên", ephemeral: true });
            }
        default:
            await interaction.reply({ content: "⚠️ Lệnh không hợp lệ.", ephemeral: true });
    }

};

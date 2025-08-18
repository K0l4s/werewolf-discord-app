// handleInteractionCreate.js
const GameController = require('../controllers/gameController');
const UserController = require('../controllers/userController');
const GameService = require('../services/gameService');
const { interactionToMessage } = require('../utils/fakeMessage');
const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
        const { commandName } = interaction;

        switch (commandName) {
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
                        { name: "/create", value: "Create a new game room." },
                        { name: "/join", value: "Join an existing game room." },
                        { name: "/start", value: "Start existing game room." },
                        { name: "/new", value: "Start a completely new game room." },
                        { name: "/give <user> <amount>", value: "Send money to another user." },
                        { name: "/wallet", value: "Check your current balance." },
                        { name: "/donate", value: "Support the developer via Momo." },
                        { name: "/help", value: "Show this help message." }
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
    }
    catch (e) {
        return interaction.reply("Bug detected on developer’s PC. Try again or contact them.")
    }
};

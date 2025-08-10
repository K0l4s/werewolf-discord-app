// handleInteractionCreate.js
const GameController = require('../controllers/gameController');
const UserController = require('../controllers/userController');
const { interactionToMessage } = require('../utils/fakeMessage');
const { EmbedBuilder } = require('discord.js');

module.exports = async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

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
        case 'donate':
            {
                return interaction.reply({ content: "🔗 Link donate: [PlayDuo](https://playerduo.net/29406275)", ephemeral: true });
            }
        default:
            await interaction.reply({ content: "⚠️ Lệnh không hợp lệ.", ephemeral: true });
    }
};

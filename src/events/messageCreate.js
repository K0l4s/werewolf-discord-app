// handleMessageCreate.js
const GameController = require('../controllers/gameController');
const GameService = require('../services/gameService');
const { TEAMS, PHASES } = require('../config/constants');
const { EmbedBuilder } = require('discord.js');
const UserService = require('../services/userService');
const UserController = require('../controllers/userController');
const handleMessageCreate = async (client, message) => {
    if (message.author.bot || !message.guild) return;
    if(!message.content.startsWith("/")) {
        return;
    }

    // Handle commands
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    console.log(`Received command: ${command} in channel: ${message.channel.id}`);
    // const game = GameService.getGameByChannel(message.channel.id);
    const user = await UserService.findUserById(message.author.id);
    if (!user)
        await UserService.createNewUser(message.author.id);
    switch (command) {
        case 'create':
            return GameController.handleCreateRoom(message);
        case 'join':
        case 'cj':
            return GameController.handleJoinCommand(message);
        case 'new':
            return GameController.handleCreateNewRoom(message);
        case 'wallet':
            return UserController.handleBalance(message);
        case 'wgive':
            // {
            //     const targetUser = message.mentions.users.first();
            // }
            {
                const args = message.content.trim().split(/\s+/);
                const balance = args[2];
                const mentionUser = message.mentions.users.first();
                 if (!mentionUser) {
                            embed.setTitle("❌Transfer Error!")
                                .setDescription(`You must mention receiver first!`)
                                .setColor('Red');
                            return message.reply({ embeds: [embed] });
                        }
                
                        if (mentionUser.id == message.author.id) {
                            embed.setTitle("❌Transfer Error!")
                                .setDescription(`You can't send money to yourself!`)
                                .setColor('Red');
                            return message.reply({ embeds: [embed] });
                        }
                return UserController.giveMoneyTo(message,mentionUser, balance);
            }
        case 'start':
            return GameController.handleStartGame(message);
        case 'increse-exp':
            {
                if (message.author.id != "387162192346218496")
                    return message.reply("You don't have permission to do this action!")
                return UserController.addExperience("387162192346218496", 500, message)
            }
        case 'donate':
            {
                return message.reply({ content: "🔗 Link donate: [PlayDuo](https://playerduo.net/29406275)", ephemeral: true });
            }
        default:
            return message.reply("⚠️ Lệnh không hợp lệ.");
    }
}
module.exports = { handleMessageCreate };
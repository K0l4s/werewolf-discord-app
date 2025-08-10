const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const GameService = require("../services/gameService");
const RoleService = require("../services/roleService");
const { shufflePlayer, shuffleRole } = require("../utils/shuffle");
const PhaseService = require("../services/phaseService");
const { ACTION_TYPE, PHASES } = require("../config/constants");
const Roles = require("../models/Roles");
const MessageService = require("../services/messageService");
const UserService = require("../services/userService");
const Game = require("../models/Game");

class GameController {
    static async handleCreateRoom(message) {
        let game = await GameService.getGameByChannel(message.channel.id);
        if (!game) {
            game = await GameService.initNewGame(message.channel.id);
        }
        console.log(game.isStart)
        return game;
    }
    static async handleJoinCommand(message) {
        const embed = new EmbedBuilder();
        const game = await this.handleCreateRoom(message);
        if (game.isStart) {
            embed.setTitle("The game is started!")
                .setDescription("Please wait or use **/new** to create new game!")
            return message.reply({ embeds: [embed] })
            // return message.reply("The game is started! Please wait or use **/new** to create new game!")
        }
        const player = game.player.find(p => p.userId === message.author.id);
        if (player) {
            let playerList = game.player
                .map((p, index) => `${index + 1}. <@${p.userId}> ${p.isAlive ? "🟢" : "🔴"}`)
                .join("\n");

            embed
                .setTitle("You can't join this game twice times!")
                .setDescription(
                    `**Total players**: ${game.player.length}\n\n` +
                    `${playerList}`
                );
            return message.reply({ embeds: [embed] })
            // return message.reply("Bạn đã tham gia game rồi!")
        }
        const newPlayer = {
            userId: message.author.id,
            isAlive: true,
            roleId: null,
        }
        game.player.push(newPlayer);
        // game.add
        game.save();
        // console.log(game);
        // return message.reply(`You're joined this game! Total player: ${game.player.length}`)
        let playerList = game.player
            .map((p, index) => `${index + 1}. <@${p.userId}> ${p.isAlive ? "🟢" : "🔴"}`)
            .join("\n");

        embed
            .setTitle("You're joined to this game! Please enjoy!")
            .setDescription(
                `**Total players**: ${game.player.length}\n\n` +
                `${playerList}`
            );
        return message.reply({ embeds: [embed] })
    }
    static async handleCreateNewRoom(message) {
        let game = await GameService.getGameByChannel(message.channel.id);

        if (game) {
            game.isEnd = true;
            game.isStart = true;
            game.save()
        }
        const newGame = await GameService.initNewGame(message.channel.id);
        // return newGame;
        const embed = new EmbedBuilder();
        embed.setTitle("Refresh new game successfuly!")
            .setDescription("We're stopped the last game and create new game. Please enjoy it!")
        // message.reply(embed)s
        await message.reply({ embeds: [embed] })
        return newGame;
    }
    static async handleStartGame(message) {
        const game = await GameService.getGameByChannel(message.channel.id);

        const roleList = await RoleService.getRoleListByPlayerCount(game.player.length);
        console.log(roleList)
        const players = shufflePlayer(game.player);
        // const roleList = shuffleRole(roles);
        // console.log(players)
        const updatedPlayers = [];

        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const role = roleList[i];

            updatedPlayers.push({
                userId: player.userId,
                isAlive: true,
                roleId: role._id.toString(),
            });
            // Gửi tin nhắn riêng
            const member = await message.guild.members.fetch(player.userId).catch(() => null);
            if (member) {
                const dm = await member.createDM().catch(() => null);
                if (dm) {
                    const embed = {
                        title: `🎭 Vai trò của bạn: ${role.name}`,
                        description: role.description,
                        color: parseInt(role.color?.replace('#', '') || 'ffffff', 16),
                        thumbnail: role.image ? { url: role.image } : undefined,
                    };
                    await dm.send({ embeds: [embed] }).catch(console.error);
                }
            }
        }
        console.log(updatedPlayers);
        game.player = updatedPlayers;
        await game.save();
        this.handleStartNightPhase(message);
    }
    static async handleStartNightPhase(message) {
        // send reaction to all role
        const currentGame = await GameService.getGameByChannel(message.channel.id);
        if (!currentGame) {
            throw new Error("No game found for this channel.");
        }

        const embed = new EmbedBuilder()
        embed.setTitle("🌙 Night Phase")
            .setDescription("The night has fallen. Please wait for the actions of the roles.")
        // .setColor('green');
        await message.channel.send({ embeds: [embed] });
        // Tạo phase mới
        const phaseType = PHASES.NIGHT;
        const newPhase = await PhaseService.createPhase(currentGame._id, phaseType);
        if (!newPhase) {
            throw new Error("Failed to create new phase.");
        }
        // Gửi dm message để người dùng reaction cho từng player
        for (const player of currentGame.player) {
            const member = await message.guild.members.fetch(player.userId).catch(() => null);
            if (member) {
                const dm = await member.createDM().catch(() => null);
                if (dm) {
                    // Gửi các reaction tương ứng với vai trò
                    const role = await RoleService.getRoleById(player.roleId);
                    if (role.isFunc) {

                        const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

                        // Alive players list (không bao gồm bản thân)
                        // const aliveList = currentGame.player
                        //     .filter(p => p.isAlive && p.userId !== player.userId)
                        //     .map((p, index) => (
                        //         {
                        //         label: `Option ${index + 1} - ${p.userId}`, // hoặc tên
                        //         description: `Chọn người chơi này`,
                        //         value: p.userId, // value trả về khi chọn
                        //         emoji: emojis[index] || undefined
                        //     }));
                        let aliveList = []
                        for (let i = 0; i < currentGame.player.length; i++) {
                            const p = currentGame.player[i];
                            if (p.isAlive && p.userId !== player.userId) {
                                const player = await message.guild.members.fetch(p.userId).catch(() => null);
                                const playerName = player.displayName;
                                const playerUsername = player.user.username;
                                aliveList.push({
                                    label: `Option ${i + 1} - ${playerName} (@${playerUsername})`, // hoặc tên
                                    description: `Thực hiện hành động lên người chơi này`,
                                    value: p.userId, // value trả về khi chọn
                                    emoji: emojis[i] || undefined
                                });
                            }
                        }
                        // Tạo embed
                        const embed = new EmbedBuilder()
                            .setTitle(`Your role: ${role.name}`)
                            .setDescription(`Chọn mục tiêu để thực hiện hành động:`);
                        if (role.enName !== "Cupid") {
                            // Select menu chọn 1 người
                            const customId = `night_action_${role.enName.toLowerCase().replace(/\s+/g, '_')}|${message.channel.id}`;
                            console.log(`Custom ID for select menu: ${customId}`);
                            const selectMenu = new StringSelectMenuBuilder()
                                .setCustomId(customId)
                                .setPlaceholder('Chọn người chơi...')
                                .setMinValues(1)
                                .setMaxValues(1) // chỉ chọn 1 người
                                .addOptions(aliveList);
                            const skipButton = new ButtonBuilder()
                                .setCustomId('skip_action')
                                .setLabel('❌ Bỏ qua')
                                .setStyle(ButtonStyle.Danger);
                            const row = new ActionRowBuilder()
                                .addComponents(selectMenu);
                            const rowSkipButton = new ActionRowBuilder().addComponents(skipButton);

                            await dm.send({ embeds: [embed], components: [row, rowSkipButton] }).catch(console.error);
                        } else {
                            // Cupid: chọn 2 người yêu
                            const selectMenuCupid = new StringSelectMenuBuilder()
                                .setCustomId('cupid_lovers')
                                .setPlaceholder('Chọn 2 người chơi làm người yêu')
                                .setMinValues(2)
                                .setMaxValues(2)
                                .addOptions(aliveList);

                            const skipButton = new ButtonBuilder()
                                .setCustomId('skip_cupid_action')
                                .setLabel('❌ Bỏ qua')
                                .setStyle(ButtonStyle.Danger);

                            const rowCupidSelect = new ActionRowBuilder().addComponents(selectMenuCupid);
                            const rowCupidButton = new ActionRowBuilder().addComponents(skipButton);

                            await dm.send({
                                embeds: [
                                    embed.setDescription("❤️ Bạn là Cupid! Hãy chọn 2 người chơi để trở thành người yêu, hoặc bỏ qua hành động.")
                                ],
                                components: [rowCupidSelect, rowCupidButton]
                            }).catch(console.error);

                        }


                    }
                }
            }
        }
    }

    static async sendActionMessageToUser(message) {
        const currentGame = await GameService.getGameByChannel(message.channel.id)
    }
    static async handleStartDayPhase(guidId) {
        // Gửi thông báo voting vào gui

    }
    static async handleVoting() {

    }
    static async checkToAction(currentGame, roleName, userId) {
        if (!currentGame)
            throw new Error("Don't find any game. Please restart the game or contact the developer")
        const player = currentGame.player.find(temp => temp.userId == userId);
        const wolfRole = await Roles.findOne({ name: roleName.toString() })
        if (!wolfRole)
            throw new Error("The gave give role error. Please restart the game or contact the developer!")
        // console.log(player.roleId, wolfRole)
        if (player.roleId != wolfRole._id)
            throw new Error("You don't have permission to do this action! Please try again!")
    }
    static async wolfVote(gameId, userId, targetId,interaction) {
        const currentGame = await GameService.getGameById(gameId);
        this.checkToAction(currentGame, "Sói", userId);

        // if(player.role)
        const currentPhase = await PhaseService.getCurrentPhase(gameId);
        if (!currentPhase)
            throw new Error("Don't find any phase. Please restart the game or contact the developer!")
        if (currentPhase === PHASES.DAY)
            throw new Error("You can't do this action at day time!")
        if (currentPhase.action.find(e => e.userId == userId && (e.action == ACTION_TYPE.KILL || e.action == ACTION_TYPE.SKIP)))
            throw new Error("You already did this action! Please wait your team to finish their action!")
        currentPhase.action.push(
            {
                userId: userId,
                action: ACTION_TYPE.KILL,
                targetId: targetId
            }
        );
        currentPhase.save();
        const channel = interaction.client.channels.cache.get(currentGame.channelId);
        const guild = channel?.guild;
        const targetUser = await guild.members.fetch(targetId).catch(() => null);
        const targetName = targetUser.displayName || targetUser.user.username;

        const member = await guild.members.fetch(userId).catch(() => null);
                if (member) {
                    const dm = await member.createDM().catch(() => null);
                    if (dm) {
                        // const embed = {
                        //     title: title,
                        //     description: description,
                        //     color: color ? color : 'gray',
                        //     thumbnail: thumbnail ? thumbnail : null
                        // }
                        const embed = new EmbedBuilder();
                        embed.setTitle("Wolf action")
                        .setDescription(`You decided to kill ${targetName}, please wait your team!`)
                        // .setThumbnail(thumbnail)
                        // .setColor(color)
        
                        await dm.send({ embeds: [embed] }).catch(console.error);
                    }
                }
        // MessageService.sendMessageToUser(message, userId, "Wolf action", description, null, 'red', `You decided to kill ${targetName}, please wait your team!`)
    }
    static async dayVote(gameId, userId, actionType) {

    }
    static async coverUser(gameId, userId, targetId,interaction) {
        const currentGame = await GameService.getGameById(gameId);
        this.checkToAction(currentGame, "Bảo vệ", userId);

        // if(player.role)
        const currentPhase = await PhaseService.getCurrentPhase(gameId);
        if (!currentPhase)
            return interaction.reply({ content: "Don't find any phase. Please restart the game or contact the developer!", ephemeral: true });
            // throw new Error("Don't find any phase. Please restart the game or contact the developer!")
        if (currentPhase === PHASES.DAY)
            return interaction.reply({ content: "You can't do this action at day time!", ephemeral: true });
            // throw new Error("You can't do this action at day time!")
        if (currentPhase.action.find(e => e.userId == userId && (e.action == ACTION_TYPE.COVER || e.action == ACTION_TYPE.SKIP)))
            return interaction.reply({ content: "You already did this action! Please wait your team to finish their action!", ephemeral: true });
            // throw new Error("You already did this action! Please wait your team to finish their action!")
        currentPhase.action.push(
            {
                userId: userId,
                action: ACTION_TYPE.COVER,
                targetId: targetId
            }
        );
        currentPhase.save()
        // const targetUser = await UserService.findUserById(targetId)
        // const targetName = targetUser.name ?
         const channel = interaction.client.channels.cache.get(currentGame.channelId);
        const guild = channel?.guild;
        const targetUser = await guild.members.fetch(targetId).catch(() => null);

        // if (!targetUser) 
        //      // hoặc xử lý khi không tìm thấy user

        // Lấy tên hiển thị: nếu có nickname (displayName), dùng nó; nếu không thì dùng username
        const targetName = targetUser.displayName || targetUser.user.username;
        const member = await guild.members.fetch(userId).catch(() => null);
                if (member) {
                    const dm = await member.createDM().catch(() => null);
                    if (dm) {
                        // const embed = {
                        //     title: title,
                        //     description: description,
                        //     color: color ? color : 'gray',
                        //     thumbnail: thumbnail ? thumbnail : null
                        // }
                        const embed = new EmbedBuilder();
                        embed.setTitle("Cover action")
                        .setDescription(`You covered ${targetName}! Please wait your team!`)
                        // .setThumbnail(thumbnail)
                        // .setColor(color)
        
                        await dm.send({ embeds: [embed] }).catch(console.error);
                    }
                }
        // MessageService.sendMessageToUser(message, userId, "Cover action", description, null, 'orange', `You covered ${targetName}!`)
    }
    static async cupidAction(gameId, userId, loverIds,interaction) {
        const currentGame = await GameService.getGameById(gameId);
        this.checkToAction(currentGame, "Cupid", userId);

        const currentPhase = await PhaseService.getCurrentPhase(gameId);
        if (!currentPhase)
            throw new Error("Don't find any phase. Please restart the game or contact the developer!")
        if (currentPhase === PHASES.DAY)
            throw new Error("You can't do this action at day time!")

        if (!currentPhase.day == 1)
            throw new Error("You just do this action in night 1!")

        currentPhase.push()

        const [lover1Id, lover2Id] = loverIds;

        // Update loverId cho 2 player trong DB
        await Game.updateOne(
            { _id: gameId, "player.userId": lover1Id },
            { $set: { "player.$.loverId": lover2Id } }
        );

        await Game.updateOne(
            { _id: gameId, "player.userId": lover2Id },
            { $set: { "player.$.loverId": lover1Id } }
        );
         const channel = interaction.client.channels.cache.get(currentGame.channelId);
        const guild = channel?.guild;
        const lover1User = await guild.members.fetch(lover1Id).catch(() => null);
        const lover1Name = lover1User.displayName || lover1User.user.username;

        const lover2User = await guild.members.fetch(lover2Id).catch(() => null);
        const lover2Name = lover2User.displayName || lover2User.user.username;
        currentGame.action.push({
            userId: userId,
            action: ACTION_TYPE.MATCH
        })
        // return { message: "Cupid has successfully linked the lovers!" };
        // currentPhase.save();
        const embed = new EmbedBuilder();
        embed.setTitle("Cupid action")
        .setDescription(`You set love ${lover1Name} and ${lover2Name}!`)
        // .setThumbnail(thumbnail)
        // .setColor(color)
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
            const dm = await member.createDM().catch(() => null);
            if (dm) {
                await dm.send({ embeds: [embed] }).catch(console.error);
            }
        }

        // MessageService.sendMessageToUser(message, userId, "Cupid action", description, null, 'pink', `You set love ${lover1Name} and  ${lover2Name}!`)
    }
    static async seerAction(gameId, userId, targetId, interaction) {
        const currentGame = await GameService.getGameById(gameId, "Tiên tri");
        try {
        this.checkToAction(currentGame, "Tiên tri", userId);
        } catch (err) {
            console.error("Error in seer action:", err);
            return interaction.reply({ content: err.message, ephemeral: true });
        }

        const currentPhase = await PhaseService.getCurrentPhase(gameId);
        if (!currentPhase)
            return interaction.reply({ content: "Don't find any phase. Please restart the game or contact the developer!", ephemeral: true });
        if (currentPhase === PHASES.DAY)
            return interaction.reply({ content: "You can't do this action at day time!", ephemeral: true });
        if (currentPhase.action.find(e => e.userId == userId && (e.action == ACTION_TYPE.SEER || e.action == ACTION_TYPE.SKIP)))
           return interaction.reply({ content: "You already did this action! Please wait your team to finish their action!", ephemeral: true });
        currentPhase.action.push(
            {
                userId: userId,
                action: ACTION_TYPE.SEER,
                targetId: targetId
            }
        )
        currentPhase.save();
        const channel = interaction.client.channels.cache.get(currentGame.channelId);
        const guild = channel?.guild;
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
            const dm = await member.createDM().catch(() => null);
            if (dm) {
                const targetRoleId = currentGame.player.find(e => e.userId == targetId).roleId
                console.log(targetRoleId)
                const roleObject = await RoleService.getRoleById(targetRoleId)
                const roleName = roleObject.name;
                console.log(roleName)
                const embed = {
                    title: `Seer Action`,
                    description: `Your target is ${roleName}`,
                }
                await dm.send({ embeds: [embed] }).catch(console.error);
            }
        }
    }
    static async witchAction(gameId, userId, targetId, witchAction) {
        const currentGame = await GameService.getGameById(gameId, "Phù thủy");
        this.checkToAction(currentGame, "Phù thủy", userId);

        const allNightPhase = PhaseService.getLastNightPhaseByGameId(gameId);
    }
    static async hunterAction(gameId, userIds) {

    }
}


module.exports = GameController;
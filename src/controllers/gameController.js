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
const { listeners } = require("../models/Phase");

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
    static async handleGetRole(interaction) {
        const currentGame = await GameService.getGameByChannel(interaction.channel.id)
        const player = currentGame.player.find(p => p.userId === interaction.user.id);
        if (!player) {
            return interaction.reply("You're not in the game!");
        }

        const role = await RoleService.getRoleById(player.roleId);
        if (!role) {
            return interaction.reply("Role not found!");
        }
        const embed = new EmbedBuilder()
            .setTitle(`Your role is: ${role.name}`)
            .setDescription(role.description)
            .setColor('Blue');
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    static async handleStartGame(message) {
        const game = await GameService.getGameByChannel(message.channel.id);

        const roleList = await RoleService.getRoleListByPlayerCount(game.player.length);
        console.log(roleList)
        const players = shufflePlayer(game.player);
        // const roleList = shuffleRole(roles);
        // console.log(players)
        const updatedPlayers = [];

        // Assign roles to players as fast as possible
        for (let i = 0, len = players.length; i < len; ++i) {
            updatedPlayers.push({
                userId: players[i].userId,
                isAlive: true,
                roleId: roleList[i]._id.toString(),
            });
        }
        // Gửi tin nhắn riêng
        // const member = await message.guild.members.fetch(player.userId).catch(() => null);
        // if (member) {
        //     const dm = await member.createDM().catch(() => null);
        //     if (dm) {
        //         const embed = {
        //             title: `🎭 Vai trò của bạn: ${role.name}`,
        //             description: role.description,
        //             color: parseInt(role.color?.replace('#', '') || 'ffffff', 16),
        //             thumbnail: role.image ? { url: role.image } : undefined,
        //         };
        //         await dm.send({ embeds: [embed] }).catch(console.error);
        //     }
        // }
        //  Send message and button to show role
        const embed = new EmbedBuilder();
        embed.setTitle("Your role is available")
            .setDescription("Please click **<button>** to view your role.")
        // .setFooter("This message will expire in 30 seconds.");
        const button = new ButtonBuilder()
            .setCustomId(`view_role|${message.channel.id}`)
            .setLabel("View Role")
            .setStyle("Primary");
        // embed.setComponents([button]);
        game.player = updatedPlayers;
        await game.save();
        await message.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)], ephemeral: true });
        // }
        console.log(updatedPlayers);


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
        const players = currentGame.player.filter(player => player.isAlive);
        let roleIds = players.map(player => player.roleId);
        // remove duplicate roleIds
        roleIds = [...new Set(roleIds)];
        const roles = await RoleService.getRolesByIdsAndIsFuncTrue(roleIds);
        // send interaction message to channel to action role
        const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
        let aliveList = [];
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const playerInfo = await message.guild.members.fetch(player.userId).catch(() => null);
            const playerName = playerInfo.displayName;
            const playerUsername = playerInfo.user.username;
            aliveList.push({
                label: `Option ${i + 1} - ${playerName} (@${playerUsername})`, // hoặc tên
                description: `Thực hiện hành động lên người chơi này`,
                value: player.userId, // value trả về khi chọn
                emoji: emojis[i] || undefined
            });
        }
        console.log(aliveList)
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`night_action|${message.channel.id}`)
            .setPlaceholder('Chọn người chơi...')
            .addOptions(aliveList);
        const skipButton = new ButtonBuilder()
            .setCustomId(`night_action_skip|${message.channel.id}`)
            .setLabel('Bỏ qua')
            .setStyle(4); // Danger
        const embedAction = new EmbedBuilder()
        embedAction
            .setTitle(`Night Action`)
            .setDescription("Please select a player to perform your night action.")
            .setFooter({ text: 'You have 30 seconds to make your choice.' });
        const rowSelect = new ActionRowBuilder().addComponents(selectMenu);
        const rowButton = new ActionRowBuilder().addComponents(skipButton);
        const msg = await message.channel.send({ embeds: [embedAction], components: [rowSelect, rowButton] });
        // sau 30s xóa
        // Countdown timer in footer, no delay, instant update for performance
        let timeLeft = 30;
        const interval = setInterval(() => {
            if (timeLeft <= 0) {
                embedAction.setFooter({ text: '⏳ Time is up!' });
                msg.edit({ embeds: [embedAction], components: [] }).catch(() => { });
                clearInterval(interval);
            } else {
                embedAction.setFooter({ text: `⏳ Time left: ${timeLeft}s` });
                msg.edit({ embeds: [embedAction] }).catch(() => { });
                timeLeft--;
            }
        }, 1000);
        // for (const role of roles) {
        //     selectMenu.setCustomId(`night_action_${role.enName.toLowerCase().replace(/\s+/g, '_')}|${message.channel.id}`);
        //     if (role.enName === "Cupid") {
        //         selectMenu.setMinValues(2).setMaxValues(2);
        //     } else {
        //         selectMenu.setMinValues(1).setMaxValues(1);
        //     }
        //     embedAction
        //         .setTitle(`${role.name} Action`)
        //         .setDescription("Please select a player to perform your night action.")
        //         .setFooter({ text: 'You have 30 seconds to make your choice.' });

        //     // Bọc vào ActionRow
        //     const rowSelect = new ActionRowBuilder().addComponents(selectMenu);
        //     const rowButton = new ActionRowBuilder().addComponents(skipButton);

        //     await message.channel.send({ embeds: [embedAction], components: [rowSelect, rowButton] });
        // }

        // Gửi dm message để người dùng reaction cho từng player
        // for (const player of currentGame.player) {
        //     const member = await message.guild.members.fetch(player.userId).catch(() => null);
        //     if (member) {
        //         const dm = await member.createDM().catch(() => null);
        //         if (dm) {
        //             // Gửi các r eaction tương ứng với vai trò
        //             const role = await RoleService.getRoleById(player.roleId);
        //             if (role.isFunc) {

        //                 const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
        //                 let aliveList = []
        //                 for (let i = 0; i < currentGame.player.length; i++) {
        //                     const p = currentGame.player[i];
        //                     if (p.isAlive && p.userId !== player.userId) {
        //                         const player = await message.guild.members.fetch(p.userId).catch(() => null);
        //                         const playerName = player.displayName;
        //                         const playerUsername = player.user.username;
        //                         aliveList.push({
        //                             label: `Option ${i + 1} - ${playerName} (@${playerUsername})`, // hoặc tên
        //                             description: `Thực hiện hành động lên người chơi này`,
        //                             value: p.userId, // value trả về khi chọn
        //                             emoji: emojis[i] || undefined
        //                         });
        //                     }
        //                 }
        //                 // Tạo embed
        //                 const embed = new EmbedBuilder()
        //                     .setTitle(`Your role: ${role.name}`)
        //                     .setDescription(`Chọn mục tiêu để thực hiện hành động:`);
        //                 if (role.enName !== "Cupid") {
        //                     // Select menu chọn 1 người
        //                     const customId = `night_action_${role.enName.toLowerCase().replace(/\s+/g, '_')}|${message.channel.id}`;
        //                     console.log(`Custom ID for select menu: ${customId}`);
        //                     const selectMenu = new StringSelectMenuBuilder()
        //                         .setCustomId(customId)
        //                         .setPlaceholder('Chọn người chơi...')
        //                         .setMinValues(1)
        //                         .setMaxValues(1) // chỉ chọn 1 người
        //                         .addOptions(aliveList);
        //                     const skipButton = new ButtonBuilder()
        //                         .setCustomId('night_action_skip|' + message.channel.id)
        //                         .setLabel('❌ Bỏ qua')
        //                         .setStyle(ButtonStyle.Danger);
        //                     const row = new ActionRowBuilder()
        //                         .addComponents(selectMenu);
        //                     const rowSkipButton = new ActionRowBuilder().addComponents(skipButton);

        //                     await dm.send({ embeds: [embed], components: [row, rowSkipButton] }).catch(console.error);
        //                 } else {
        //                     // Cupid: chọn 2 người yêu
        //                     const selectMenuCupid = new StringSelectMenuBuilder()
        //                         .setCustomId('cupid_lovers')
        //                         .setPlaceholder('Chọn 2 người chơi làm người yêu')
        //                         .setMinValues(2)
        //                         .setMaxValues(2)
        //                         .addOptions(aliveList);

        //                     const skipButton = new ButtonBuilder()
        //                         .setCustomId('skip_cupid_action')
        //                         .setLabel('❌ Bỏ qua')
        //                         .setStyle(ButtonStyle.Danger);

        //                     const rowCupidSelect = new ActionRowBuilder().addComponents(selectMenuCupid);
        //                     const rowCupidButton = new ActionRowBuilder().addComponents(skipButton);

        //                     await dm.send({
        //                         embeds: [
        //                             embed.setDescription("❤️ Bạn là Cupid! Hãy chọn 2 người chơi để trở thành người yêu, hoặc bỏ qua hành động.")
        //                         ],
        //                         components: [rowCupidSelect, rowCupidButton]
        //                     }).catch(console.error);

        //                 }


        //             }
        //         }
        //     }
        // }
    }

    static async sendActionMessageToUser(message) {
        const currentGame = await GameService.getGameByChannel(message.channel.id)
    }
    static async checkWinCondition(channelId) {
        const currentGame = await GameService.getGameByChannel(channelId);

        const lastNightPhase = await PhaseService.getLastestNightPhaseByGameId(channelId);
        const wolfTeamAction = lastNightPhase.action.filter(action => action.action === ACTION_TYPE.KILL);
    }
    static async identifyTheDeath(currentGame, interaction) {
        const lastNightPhase = await PhaseService.getLastestNightPhaseByGameId(currentGame._id);
        if (!lastNightPhase) return;

        // 1) Lọc action giết
        const wolfTeamAction = (lastNightPhase.action || []).filter(
            (a) => a?.action === ACTION_TYPE.KILL && a?.targetId
        );
        console.log("wolfTeamAction:", wolfTeamAction);

        if (!wolfTeamAction.length) {
            const embed = new EmbedBuilder()
                .setTitle("It's safe night!")
                .setDescription("No one died last night, enjoy it :)))");
            const channel = interaction.client.channels.cache.get(currentGame.channelId);
            if (channel) channel.send({ embeds: [embed] }).catch(console.error);
            return;
        }

        // 2) Danh sách target được bảo vệ
        const coveredSet = new Set(
            (lastNightPhase.action || [])
                .filter((a) => a?.targetId && (a.action === ACTION_TYPE.COVER || a.action === ACTION_TYPE.HEAL))
                .map((a) => a.targetId)
        );

        // 3) Danh sách victim (bỏ qua người được bảo vệ)
        let victims = wolfTeamAction
            .map((a) => a.targetId)
            .filter((tid) => !coveredSet.has(tid));

        // 4) Thêm lover của mỗi victim vào danh sách
        for (const vid of [...victims]) {
            const player = currentGame.player.find((p) => p.userId === vid);
            if (player?.loverId) {
                victims.push(player.loverId);
            }
        }

        // 5) Loại trùng lặp + chỉ giết người còn sống
        const killSet = new Set(victims);
        const deadList = [];

        for (const uid of killSet) {
            const player = currentGame.player.find((p) => p.userId === uid);
            if (!player) continue;
            if (player.isAlive === false) continue; // đã chết trước đó

            player.isAlive = false;
            deadList.push(`<@${uid}>`);
        }

        // 6) Save + gửi embed
        const embed = new EmbedBuilder();
        if (deadList.length > 0) {
            await currentGame.save();
            embed
                .setTitle("It's danger night")
                .setDescription(`Player(s) died last night:\n${deadList.map((p) => `• ${p}`).join("\n")}`);
        } else {
            embed
                .setTitle("It's safe night!")
                .setDescription("No one died last night, enjoy it :)))");
        }

        const channel = interaction.client.channels.cache.get(currentGame.channelId);
        if (channel) {
            channel.send({ embeds: [embed] }).catch(console.error);
        }
    }


    static async checkNightPhaseEnd(currentGame) {
        const lastNightPhase = await PhaseService.getLastestNightPhaseByGameId(currentGame._id);
        // const currentGame = await GameService.getGameByChannel(channelId);
        console.log(currentGame);
        // const roleIds = currentGame.player.map(player => player.roleId);
        const players = currentGame.player.filter(p => p.isAlive);
        const roleIds = players.map(player => player.roleId);
        console.log("roleIds: ", roleIds)
        let specialRoles = await RoleService.getRolesByIdsAndIsFuncTrue(roleIds);
        console.log("Special roles:", specialRoles);
        // loại bỏ role Cupid nếu là đêm thứ 2 trở đi
        console.log("Last night phase:", lastNightPhase);
        if (lastNightPhase.day > 1) {
            specialRoles = specialRoles.filter(role => role.name !== "Cupid");
        }

        // const wolfRoles = roles.filter(role => role.team === TEAMS.WOLVES);
        // check all player has specialRoles votes
        // const players = currentGame.player.filter(player => player.isAlive);
        // Lọc những người chơi có role đặc biệt (so sánh bằng string để không bị lệch kiểu)
        const playersHasSpecialRoles = players.filter(player =>
            specialRoles.some(role => String(role._id) === String(player.roleId))
        );
        const playersDoneAction = lastNightPhase.action.filter(action =>
            playersHasSpecialRoles.some(player => player.userId === action.userId)
        );

        console.log("Players done action:", playersDoneAction);
        console.log("Players need action: ", playersHasSpecialRoles)
        return playersDoneAction.length === playersHasSpecialRoles.length;

    }
    static async daySkipAction(interaction){

    }
    static async handleStartDayPhase(currentGame, interaction) {
        // const currentGame = await GameService.getGameByChannel(channelId);
        // const lastNightPhases = await PhaseService.getLastNightPhaseByGameId(channelId);
        // // Set last phase to end
        // lastNightPhases.forEach(phase => {
        //     phase.isEnd = true;
        //     phase.save();
        // });

        const createdPhase = await PhaseService.createPhase(currentGame._id, PHASES.DAY);
        console.log("Created new day phase:", createdPhase);
        // send message to channelId
        const embed = new EmbedBuilder();
        embed.setTitle("New Day Phase")
            .setDescription(`Day ${createdPhase.day} has started! Please discuss and vote for the player to eliminate.`)
        // .setColor("YELLOW");
        const channel = interaction.client.channels.cache.get(currentGame.channelId);
        if (channel) {
            channel.send({ embeds: [embed] }).catch(console.error);
        }
        // Get all alive players
        const alivePlayers = currentGame.player.filter(player => player.isAlive);

        // Create select menu for voting
        // const selectMenu = new StringSelectMenuBuilder()
        //     .setCustomId('vote')
        //     .setPlaceholder('Select a player to vote')
        //     .addOptions(alivePlayers.map(player => ({
        //         label: player.username,
        //         value: player.userId
        //     })));
        let aliveList = []
        const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
        for (let i = 0; i < currentGame.player.length; i++) {
            const p = currentGame.player[i];
            // if (p.isAlive && p.userId !== interaction.user.id) {
            // const player = await message.guild.members.fetch(p.userId).catch(() => null);
            const player = await channel.guild.members.fetch(p.userId).catch(() => null);
            const playerName = player.displayName;
            const playerUsername = player.user.username;
            aliveList.push({
                label: `Option ${i + 1} - ${playerName} (@${playerUsername})`, // hoặc tên
                description: `Thực hiện hành động lên người chơi này`,
                value: p.userId, // value trả về khi chọn
                emoji: emojis[i] || undefined
            });
            // }
        }
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('day_vote')
            .setPlaceholder('Chọn người chơi...')
            .setMinValues(1)
            .setMaxValues(1) // chỉ chọn 1 người
            .addOptions(aliveList);
        const skipButton = new ButtonBuilder()
            .setCustomId('day_action_skip')
            .setLabel('❌ Bỏ qua')
            .setStyle(ButtonStyle.Danger);
        const rowSkipButton = new ActionRowBuilder().addComponents(skipButton);
        const row = new ActionRowBuilder().addComponents(selectMenu);
        await channel.send({ content: "Please select a player to vote:", components: [row, rowSkipButton] });
    }
    static async handleVoting(interaction) {
        const { customId, values } = interaction;
        const channelId = interaction.channel.id;
        const currentGame = await GameService.getGameByChannel(channelId);
        if (!currentGame) {
            return interaction.reply({ content: "Don't find any game. Please restart the game or contact the developer", ephemeral: true });
        }
        const currentPhase = await PhaseService.getCurrentPhase(currentGame._id);
        if (!currentPhase) {
            return interaction.reply({ content: "Don't find any phase. Please try again later.", ephemeral: true });
        }

        if (customId === 'day_vote') {
            const targetId = values[0];
            // if (targetId === 'skip') {
            //     // Handle skip action
            //     return interaction.reply({ content: "You have skipped the voting action.", ephemeral: true });
            // }

            const player = currentGame.player.find(p => p.userId === interaction.user.id);
            if (!player) {
                return interaction.reply({ content: "You are not a player in this game.", ephemeral: true });
            }
            if (!player.isAlive) {
                return interaction.reply({ content: "You are dead and cannot vote.", ephemeral: true });
            }
            // Check if player has already voted
            const alreadyVoted = currentPhase.action.some(a =>
                a.userId === player.userId && a.action === ACTION_TYPE.VOTE
            );
            if (alreadyVoted) {
                return interaction.reply({ content: "You have already voted.", ephemeral: true });
            }

            currentPhase.action.push({
                targetId: targetId,
                userId: interaction.user.id,
                action: ACTION_TYPE.VOTE
            })
            currentPhase.save();
            return interaction.reply({ content: `You have voted for <@${targetId}>.`, ephemeral: true });
        }
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

    static async wolfVote(gameId, userId, targetId, interaction) {
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
        const embed = new EmbedBuilder();
        embed.setTitle("Wolf action")
            .setDescription(`You decided to kill ${targetName}, please wait your team!`)
        return await interaction.reply({ embeds: [embed], ephemeral:true });
        // const member = await guild.members.fetch(userId).catch(() => null);
        // if (member) {
        //     const dm = await member.createDM().catch(() => null);
        //     if (dm) {
        //         // const embed = {
        //         //     title: title,
        //         //     description: description,
        //         //     color: color ? color : 'gray',
        //         //     thumbnail: thumbnail ? thumbnail : null
        //         // }
        //         const embed = new EmbedBuilder();
        //         embed.setTitle("Wolf action")
        //             .setDescription(`You decided to kill ${targetName}, please wait your team!`)
        //         // .setThumbnail(thumbnail)
        //         // .setColor(color)

        //         await dm.send({ embeds: [embed] }).catch(console.error);
        //     }
        // }
        // MessageService.sendMessageToUser(message, userId, "Wolf action", description, null, 'red', `You decided to kill ${targetName}, please wait your team!`)
    }

    static async coverUser(gameId, userId, targetId, interaction) {
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
        const embed = new EmbedBuilder();
        embed.setTitle("Cover action")
            .setDescription(`You covered ${targetName}! Please wait your team!`)
        // .setColor("ORANGE");
        await interaction.reply({ embeds: [embed], ephemeral: true });
        // const member = await guild.members.fetch(userId).catch(() => null);
        // if (member) {
        //     const dm = await member.createDM().catch(() => null);
        //     if (dm) {
        //         // const embed = {
        //         //     title: title,
        //         //     description: description,
        //         //     color: color ? color : 'gray',
        //         //     thumbnail: thumbnail ? thumbnail : null
        //         // }
        //         const embed = new EmbedBuilder();
        //         embed.setTitle("Cover action")
        //             .setDescription(`You covered ${targetName}! Please wait your team!`)
        //         // .setThumbnail(thumbnail)
        //         // .setColor(color)

        //         await dm.send({ embeds: [embed] }).catch(console.error);
        //     }
        // }
        // MessageService.sendMessageToUser(message, userId, "Cover action", description, null, 'orange', `You covered ${targetName}!`)
    }
    static async skip_Night_Action(gameId, userId, interaction) {
        // const currentGame = await GameService.getGameById(gameId);
        // this.checkToAction(currentGame, "Skip Night", userId);
        const currentPhase = await PhaseService.getCurrentPhase(gameId);
        if (!currentPhase)
            return await interaction.reply({ content: "Don't find any phase. Please restart the game or contact the developer!", ephemeral: true });
        if (currentPhase === PHASES.DAY)
            return await interaction.reply({ content: "You can't do this action at day time!", ephemeral: true });
        if (currentPhase === PHASES.NIGHT) {
            currentPhase.action.push({
                userId: userId,
                action: ACTION_TYPE.SKIP
            });
            currentPhase.save();
            // return interaction.reply({ content: "You have skipped the night action.", ephemeral: true });
            const embed = new EmbedBuilder();
            embed.setTitle("Skip Night Action")
                .setDescription(`You have skipped your night action.`)
            // .setColor("ORANGE");
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        return await interaction.reply({ content: "Quick action, please try again!", ephemeral: true });

    }
    static async cupidAction(gameId, userId, loverIds, interaction) {
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
        await interaction.reply({ embeds: [embed], ephemeral: true });
        // .setThumbnail(thumbnail)
        // .setColor(color)
        // const member = await guild.members.fetch(userId).catch(() => null);
        // if (member) {
        //     const dm = await member.createDM().catch(() => null);
        //     if (dm) {
        //         await dm.send({ embeds: [embed] }).catch(console.error);
        //     }
        // }

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
        const embed = new EmbedBuilder();
        const channel = interaction.client.channels.cache.get(currentGame.channelId);
        const guild = channel?.guild;
        // const member = await guild.members.fetch(userId).catch(() => null);
        const targetName = await guild.members.fetch(targetId).then(m => m.displayName).catch(() => targetId);
        embed.setTitle("Seer Action")
            .setDescription(`Your target is ${targetName}`);

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // const channel = interaction.client.channels.cache.get(currentGame.channelId);
        // const guild = channel?.guild;
        // const member = await guild.members.fetch(userId).catch(() => null);
        // if (member) {
        //     const dm = await member.createDM().catch(() => null);
        //     if (dm) {
        //         const targetRoleId = currentGame.player.find(e => e.userId == targetId).roleId
        //         console.log(targetRoleId)
        //         const roleObject = await RoleService.getRoleById(targetRoleId)
        //         const roleName = roleObject.name;
        //         console.log(roleName)
        //         const embed = {
        //             title: `Seer Action`,
        //             description: `Your target is ${roleName}`,
        //         }
        //         await interaction.reply({ embeds: [embed] }).catch(console.error);
        //     }
        // }
    }
    static async witchAction(gameId, userId, targetId, interaction) {
        const currentGame = await GameService.getGameById(gameId, "Phù thủy");
        this.checkToAction(currentGame, "Phù thủy", userId);

        const allNightPhase = PhaseService.getAllLastNightPhaseByGameId(gameId);

        // check userId & action know allNightPhase is array
        const isPoisoned = allNightPhase.some(phase => phase.action.find(e => e.userId == userId && e.action == ACTION_TYPE.POISON));
        const isHealed = allNightPhase.some(phase => phase.action.find(e => e.userId == userId && e.action == ACTION_TYPE.HEAL));

        // Send message ask user poison or heal user. User click to the button (disable button if user do action).
        const embed = {
            title: `Witch Action`,
            description: `Do you want to poison or heal ${targetId}?`,
        };
        // await interaction.reply({ embeds: [embed], ephemeral: true });
        // Handle button interactions for poison/heal
        // const filter = i => i.user.id === userId;
        const poisonButton = new ButtonBuilder()
            .setCustomId('poison')
            .setLabel('Poison')
            .setStyle('DANGER')
            .setDisabled(isPoisoned);
        const healButton = new ButtonBuilder()
            .setCustomId('heal')
            .setLabel('Heal')
            .setStyle('SUCCESS')
            .setDisabled(isHealed);

        const actionRow = new ActionRowBuilder()
            .addComponents(poisonButton, healButton);

        await interaction.reply({ embeds: [embed], ephemeral: true, components: [actionRow] });
        // await interaction.followUp({ content: 'You need to choose an action!', ephemeral: true });
        // Handle button interactions for poison/heal
        const filter = i => i.user.id === userId;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.customId === 'poison') {
                await this.handleWitchPoison(gameId, userId, targetId, ACTION_TYPE.POISON, interaction);
            } else if (i.customId === 'heal') {
                await this.handleWitchHeal(gameId, userId, targetId, ACTION_TYPE.HEAL, interaction);
            }
            collector.stop();
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.followUp({ content: 'You did not respond in time!', ephemeral: true });
            }
        });
    }
    static async handleWitchPoison(gameId, userId, targetId, interaction) {
        // Implement the logic for handling the witch's poison action
        const currentGame = await GameService.getGameById(gameId);
        const targetPlayer = currentGame.player.find(e => e.userId == targetId);
        if (!targetPlayer) return interaction.followUp({ content: "Target not found!", ephemeral: true });

        const currentPhase = await PhaseService.getCurrentPhaseByGameId(gameId);
        if (!currentPhase) return interaction.followUp({ content: "No active phase found!", ephemeral: true });
        if (currentPhase.type !== "night") return interaction.followUp({ content: "You can only poison at night!", ephemeral: true });

        currentPhase.actions.push({ userId, targetId, action: ACTION_TYPE.POISON });
        await currentPhase.save();

        interaction.followUp({ content: `You have poisoned ${targetPlayer.username}!`, ephemeral: true });
    }
    static async handleWitchHeal(gameId, userId, targetId, interaction) {
        // Implement the logic for handling the witch's heal action
        const currentGame = await GameService.getGameById(gameId);
        const targetPlayer = currentGame.player.find(e => e.userId == targetId);
        if (!targetPlayer) return interaction.followUp({ content: "Target not found!", ephemeral: true });
        const currentPhase = await PhaseService.getCurrentPhaseByGameId(gameId);
        if (!currentPhase) return interaction.followUp({ content: "No active phase found!", ephemeral: true });
        if (currentPhase.type !== "night") return interaction.followUp({ content: "You can only heal at night!", ephemeral: true });

        currentPhase.actions.push({ userId, targetId, action: ACTION_TYPE.HEAL });
        await currentPhase.save();

        interaction.followUp({ content: `You have healed ${targetPlayer.username}!`, ephemeral: true });
    }
    static async hunterAction(gameId, userId, targetId, interaction) {
        // Implement the logic for handling the hunter's action
        const currentGame = await GameService.getGameById(gameId);
        const targetPlayer = currentGame.player.find(e => e.userId == targetId);
        if (!targetPlayer) return interaction.followUp({ content: "Target not found!", ephemeral: true });

        const currentPhase = await PhaseService.getCurrentPhaseByGameId(gameId);
        if (!currentPhase) return interaction.followUp({ content: "No active phase found!", ephemeral: true });
        if (currentPhase.type !== "night") return interaction.followUp({ content: "You can only act at night!", ephemeral: true });

        currentPhase.actions.push({ userId, targetId, action: ACTION_TYPE.SHOOT });
        await currentPhase.save();
        const embed = new EmbedBuilder()
            .setTitle("Hunter Action")
            .setDescription(`You have targeted ${targetPlayer.username} for elimination!`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}


module.exports = GameController;
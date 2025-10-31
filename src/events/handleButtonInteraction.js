const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { client } = require("..");
const GameController = require("../controllers/gameController");
const LanguageController = require("../controllers/languageController");
const { handle123Result } = require("../controllers/miniGameController");
const TicketController = require("../controllers/ticketController");
const GameService = require("../services/gameService");
const toggleComponents = require("../utils/toggleComponents");

module.exports = async (interaction, client) => {
    const { customId, message } = interaction;
    const [actionType, refId] = customId.split('|');
    const args = customId.split('|')
    let lang = await LanguageController.getLang(message.guild.id)

    if (actionType === 'ticket') {

        await interaction.deferReply({ ephemeral: true });
        console.log('Xử lý ticket')
        const act = args[1]
        if (!act) {
            return interaction.editReply("Not found action");
        }
        // const channelId =
        let reply = "";
        if (act == "close") {
            reply = await TicketController.deleteTicket(interaction.channel.id, interaction.guild.id, interaction.user.id, client)
            if (interaction.isButton() && reply?.includes("Ticket")) {
                try {
                    await interaction.message.edit({ components: [] });
                } catch (err) {
                    console.error("Không thể xóa button:", err);
                }
            }
        }
        else if (act == "storage") {
            reply = await TicketController.storageTicket(interaction.channel.id, interaction.guild.id, interaction.user.id, client)

            if (interaction.isButton() && reply?.includes("Ticket")) {
                try {
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`ticket|close|${interaction.channel.id}`)
                                .setLabel('Đóng Ticket')
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji('<a:trash:1433806006915432538>'))
                    await interaction.message.edit({ components: [row] });
                } catch (err) {
                    console.error("Không thể xóa button:", err);
                }
            }
        }

        return interaction.editReply(reply || "Ticket processed.");
    }
    else if (actionType === 'view_role') {
        console.log("view role");
        const embed = await GameController.handleGetRole(interaction.channel.id, interaction.user.id, lang);
        await interaction.editReply(embed);
        return;
    }
    else if (actionType === 'day_action_skip') {
        let currentGame = await GameService.getGameByChannel(interaction.channel.id);
        const user = currentGame.player.find((p) => p.userId === interaction.user.id)
        if (!user.isAlive || !user)
            return await interaction.reply({ content: "You're death or not in game!" }, ephemeral = true)
        await GameController.daySkipAction(currentGame, interaction);
        currentGame = await GameService.getGameByChannel(interaction.channel.id);
        const isEndDay = await GameController.checkDayPhaseEnd(currentGame, interaction);
        if (isEndDay) {
            await interaction.message.edit({ components: [] });

            await GameController.endDayPhase(currentGame, interaction);
        }
        return;
    }
    else if (actionType === 'night_action_skip') {
        let currentGame = await GameService.getGameByChannel(refId);
        console.log(currentGame)
        const user = currentGame.player.find((p) => p.userId === interaction.user.id)
        console.log(user)
        if (!user.isAlive || !user)
            return await interaction.reply({ content: "You're death or not in game!" }, ephemeral = true)
        await GameController.skip_Night_Action(currentGame, interaction.user.id, interaction);
        const isEndNight = await GameController.checkNightPhaseEnd(currentGame);
        if (isEndNight) {
            await interaction.message.edit({ components: [] });

            currentGame = await GameService.getGameByChannel(refId);
            await GameController.identifyTheDeath(currentGame, interaction);
            currentGame = await GameService.getGameByChannel(refId);
            const team = await GameController.checkWinCondition(currentGame, interaction);
            if (!team) {
                currentGame = await GameService.getGameByChannel(refId);
                return GameController.handleStartDayPhase(currentGame, interaction);
            }
        }
        return;
    }
    else if (actionType === "onetwothree") {
        return await handle123Result(interaction)
    }
    // } catch (err) {
    //     console.error("❌ Lỗi handleButtonInteraction:", err);
    // } finally {
    //     // ✅ Enable lại (nếu game chưa end)
    //     try {
    //         await message.edit({
    //             components: toggleComponents(message.components, false)
    //         });
    //     } catch (e) {
    //         console.error("❌ Lỗi khi bật lại components:", e);
    //     }
    // }
};

const GameController = require("../controllers/gameController");
const LanguageController = require("../controllers/languageController");
const { handle123Result } = require("../controllers/miniGameController");
const GameService = require("../services/gameService");
const toggleComponents = require("../utils/toggleComponents");

module.exports = async (interaction) => {
    const { customId, message } = interaction;
    const [actionType, refId] = customId.split('|');
    let lang = await LanguageController.getLang(message.guild.id)

    // try {
    // 🚫 Disable toàn bộ
    // await message.edit({
    //     components: toggleComponents(message.components, true)
    // });

    if (actionType === 'view_role') {
        console.log("view role");
        const embed = await GameController.handleGetRole(interaction.channel.id, interaction.user.id, lang);
        await interaction.reply(embed);
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
    }
    else if (actionType === 'night_action_skip') {
        let currentGame = await GameService.getGameByChannel(refId);
        const user = currentGame.player.find((p) => p.userId === interaction.user.id)
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

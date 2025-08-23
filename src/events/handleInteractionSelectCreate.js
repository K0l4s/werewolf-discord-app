const GameController = require("../controllers/gameController");
const GameService = require("../services/gameService");
const RoleService = require("../services/roleService");

module.exports = async (interaction) => {
    if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

    const [actionType, refId] = interaction.customId.split('|');
    if (actionType === 'night_action_skip') {
        const currentGame = await GameService.getGameByChannel(refId);
        await GameController.skip_Night_Action(currentGame, interaction.user.id, interaction);
    }
    if (actionType === 'night_action') {
        let currentGame = await GameService.getGameByChannel(refId);
        const player = currentGame.player.find(p => p.userId === interaction.user.id);
        const role = await RoleService.getRoleById(player.roleId);
        const selectedValue = interaction.values[0];
        switch (role.enName) {
            case 'Wolf':
                await GameController.wolfVote(currentGame._id, interaction.user.id, selectedValue, interaction);
                break;
            case 'Seer':
                await GameController.seerAction(currentGame._id, interaction.user.id, selectedValue, interaction);
                break;
            // Thêm các trường hợp khác cho các vai trò khác
            case 'Cover':
                await GameController.coverUser(currentGame._id, interaction.user.id, selectedValue, interaction);
                break;
            default:
                await interaction.reply({ content: "Vai trò không hợp lệ.", ephemeral: true });
        }
        currentGame = await GameService.getGameByChannel(refId);
        const isEndNight = await GameController.checkNightPhaseEnd(currentGame);
        if (isEndNight) {
            currentGame = await GameService.getGameByChannel(refId);
            await GameController.identifyTheDeath(currentGame, interaction);
            currentGame = await GameService.getGameByChannel(refId);
            const team = await GameController.checkWinCondition(currentGame, interaction);
            if (!team) {
                currentGame = await GameService.getGameByChannel(refId);
                return GameController.handleStartDayPhase(currentGame, interaction);
            }
            return null
            // await interaction.reply({ content: "Đêm đã kết thúc.", ephemeral: true });
        }
    }



    if (actionType === 'day_vote') {
        // const currentGame = await GameService.getGameByChannel(refId);

        await GameController.handleVoting(interaction);
    }

    if (actionType === 'day_action_skip') {
        const currentGame = await GameService.getGameByChannel(interaction.channel.id);
        await GameController.daySkipAction(currentGame, interaction)
    }
    if (actionType.startsWith('day_')) {
        const currentGame = await GameService.getGameByChannel(interaction.channel.id);
        const isEndDay = await GameController.checkDayPhaseEnd(currentGame, interaction);
        if (isEndDay) {
            await GameController.endDayPhase(currentGame, interaction)
        }
    }
    if (actionType === 'view_role') {
        return await GameController.handleGetRole(interaction);
    }
    return null;

};

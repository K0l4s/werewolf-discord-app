const BattleController = require("../controllers/DauLaDaiLuc/battleController");
const GameController = require("../controllers/gameController");
const MiniGameController = require("../controllers/miniGameController");
const GameService = require("../services/gameService");
const RoleService = require("../services/roleService");

module.exports = async (interaction) => {
    if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;
    if (interaction.customId.startsWith('accept_battle_')) {
        const battleId = interaction.customId.replace('accept_battle_', '');
        return await BattleController.acceptBattle(battleId, interaction);
    } else if (interaction.customId.startsWith('reject_battle_')) {
        const battleId = interaction.customId.replace('reject_battle_', '');
        return await BattleController.rejectBattle(battleId, interaction);
    }
    console.log(interaction)
    //Xử lý cho ma sói
    const [actionType, refId] = interaction.customId.split('|');

    if (actionType === 'night_action') {
        console.log("night")
        let currentGame = await GameService.getGameByChannel(refId);
        const user = currentGame.player.find((p) => p.userId === interaction.user.id)
        if (!user.isAlive || !user)
            return await interaction.reply({ content: "You're death or not in game!" }, ephemeral = true)
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
            // await interaction.message.edit({
            //     components: toggleComponents(interaction.message.components, false)
            // });
            await interaction.message.edit({ components: [] });
            currentGame = await GameService.getGameByChannel(refId);
            await GameController.identifyTheDeath(currentGame, interaction);
            currentGame = await GameService.getGameByChannel(refId);
            const team = await GameController.checkWinCondition(currentGame, interaction);
            if (!team) {
                currentGame = await GameService.getGameByChannel(refId);
                return GameController.handleStartDayPhase(currentGame, interaction);
            }
            // await currentGame.endDayPhase
            // dọn dẹp game và phase
            // const reply = await interaction.reply({ content: "Đang dọn dẹp, đừng bắt đầu game mới để tránh lỗi bất đồng bộ..." });
            // await Phase.deleteMany({
            //     gameId: currentGame._id
            // })
            // await Game.deleteMany({
            //     channelId: currentGame.channelId
            // })
            // reply.edit({ content: "Đã dọn dẹp xong!" })
            // return;
            // await interaction.reply({ content: "Đêm đã kết thúc.", ephemeral: true });
        }
    }



    else if (actionType === 'day_vote') {
        // const currentGame = await GameService.getGameByChannel(refId);
        const currentGame = await GameService.getGameByChannel(interaction.channel.id);
        const user = currentGame.player.find((p) => p.userId === interaction.user.id)
        if (!user.isAlive || !user)
            return await interaction.reply({ content: "You're death or not in game!" }, ephemeral = true)
        await GameController.handleVoting(interaction);

        const isEndDay = await GameController.checkDayPhaseEnd(currentGame, interaction);
        if (isEndDay) {
            await interaction.message.edit({ components: [] });
            await GameController.endDayPhase(currentGame, interaction)
        }
    }
    else if (actionType === "mini_baucua") {
        const [actionType, bet, userId] = interaction.customId.split('|');
        // if(userId!=interaction.user.id){
        //     return await interaction.reply({content:"This game not yours!"},ephemeral=true)
        // }
        // await interaction.message.edit({components:[]})
        const choice = interaction.values[0]
        return await MiniGameController.bauCuaFinal(bet, userId, choice, interaction)
    }
    return null;

};

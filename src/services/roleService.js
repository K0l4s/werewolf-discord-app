const { TEAMS } = require("../config/constants");
const Roles = require("../models/Roles");
const { shuffleRole } = require("../utils/shuffle");

class RoleService {
    static async getRoleListByPlayer(len) {
        const size = Number(len);
        let roles = await Roles.find({ minPlayer: { $lte: size } });
        return roles;
    }

    static async getRoleListByPlayerCount(playerCount) {
        const allRoles = await Roles.find({ minPlayer: { $lte: playerCount } });

        // 1. Luôn giữ những role bắt buộc
        const alwaysShowRoles = allRoles.filter(r => r.isAlwaysShow);

        // 2. Tính số sói
        const numWerewolves = Math.max(1, Math.floor(playerCount * 0.25));
        const werewolfRoles = shuffleRole(allRoles.filter(r =>
            r.team === TEAMS.WOLVES && !r.isAlwaysShow
        )).slice(0, numWerewolves);

        // 3. Role đặc biệt của dân (Tiên tri, bảo vệ, thợ săn,...)
        const specialVillagerRoles = shuffleRole(allRoles.filter(r =>
            r.team === TEAMS.VILLAGERS && !r.isAlwaysShow && r.name !== "Dân làng"
        ));

        // Số còn lại là dân thường
        const usedCount = alwaysShowRoles.length + werewolfRoles.length;
        const numSpecial = Math.min(playerCount - usedCount - 1, specialVillagerRoles.length);
        const pickedSpecialVillagers = specialVillagerRoles.slice(0, numSpecial);

        const totalUsed = usedCount + pickedSpecialVillagers.length;
        const numVillagersLeft = playerCount - totalUsed;

        const villagerRoles = shuffleRole(allRoles.filter(r =>
            r.team === TEAMS.VILLAGERS && r.name === "Dân làng"
        )).slice(0, numVillagersLeft);

        // 4. Nếu đủ điều kiện thì thêm 1 vai thứ ba
        let thirdPartyRole = [];
        if (playerCount >= 9) {
            const thirdRoles = shuffleRole(allRoles.filter(r => r.team === TEAMS.THIRD_PARTY));
            if (thirdRoles.length > 0) thirdPartyRole = [thirdRoles[0]];
        }

        // 5. Gộp tất cả lại và trộn
        const finalRoles = shuffleRole([
            ...alwaysShowRoles,
            ...werewolfRoles,
            ...pickedSpecialVillagers,
            ...villagerRoles,
            ...thirdPartyRole
        ]);

        return finalRoles;
    }
    static async getRoleById(roleId){
        return Roles.findById(roleId);
    }
}

module.exports = RoleService;
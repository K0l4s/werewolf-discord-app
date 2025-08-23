module.exports = {
    PHASES: {
        // WAITING: 'waiting',
        NIGHT: 'night',
        DAY: 'day',
        // ENDED: 'ended'
    },
    ACTION_TYPE: {
        KILL: 'kill',
        VOTE: 'vote',
        HEAL: 'heal',
        POISON: 'poison',
        SHOOT: 'shoot',
        MATCH: 'match',
        COVER: 'cover',
        SEER: 'seer',
        SKIP: 'skip',
    },
    TEAMS: {
        WOLVES: 1,
        VILLAGERS: 2,
        THIRD_PARTY: 3
    },
    ITEM_TYPE:{
        PRESENT_BOX: 'present',
        NORMAL: 'normal'
    },
    ITEM_RARITY:{
        C:'Common',
        SM: 'Super Common',
        R: 'Rare',
        SR: 'Super Rare',
        E: 'Epic',
        SE: 'Super Epic',
        L: 'Legendary',
        SL: 'Super Legendary',
        MY: 'Mythic',
        SMY: 'Super Mythic'
    },
    DEFAULT_NIGHT_DURATION: 5 * 60 * 1000, // 5 phút
    DEFAULT_DAY_DURATION: 5 * 60 * 1000,    // 5 phút
    DEFAULT_EXP_LVL1: 500,
    STEP_EXP: 1, 
    // Example: lv1 500, lvl2 1000, lv3 
};
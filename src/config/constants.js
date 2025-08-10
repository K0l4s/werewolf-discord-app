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
    DEFAULT_NIGHT_DURATION: 5 * 60 * 1000, // 5 phút
    DEFAULT_DAY_DURATION: 5 * 60 * 1000,    // 5 phút
    DEFAULT_EXP_LVL1: 500,
    STEP_EXP: 1, 
    // Example: lv1 500, lvl2 1000, lv3 
};
const { PHASES, ACTION_TYPE } = require("../config/constants");
const Game = require("../models/Game");
const Phase = require("../models/Phase");
const GameService = require("./gameService");

class PhaseService {
    static async getOldPhaseByChannel(gameId) {
        const phase = await Phase.find({ gameId, isEnd: false });
        return phase;
    };
    static async getNextDay(gameId) {
        const lastPhase = await Phase.findOne({ gameId, phase: PHASES.NIGHT }).sort({ day: -1 }).exec();
        return lastPhase ? lastPhase.day + 1 : 1;
    }
    static async getLastNightPhaseByGameId(gameId){
        const allNightPhase = await Phase.find({gameId,phase:PHASES.NIGHT,isEnd:false}).exec();
        return allNightPhase;
    }
    static async getLastestNightPhaseByGameId(gameId){
        const phase = await Phase.findOne({gameId, phase: PHASES.NIGHT}).sort({day: -1}).exec();
        return phase;
    }
    static async getAllLastNightPhaseByGameId(gameId){
        const allNightPhase = await Phase.find({gameId,Phase:PHASES.NIGHT,isEnd:true}).exec();
        return allNightPhase;
    }
    static async getCurrentPhase(gameId) {
        const currentPhase = await Phase.findOne({ gameId, isEnd: false }).sort({ day: -1 }).exec();
        return currentPhase;
    }
    static async createPhase(gameId, phaseType) {
        // update all phases to end
        await Phase.updateMany(
            { gameId, isEnd: false },
            { $set: { isEnd: true } }
        );
        let day = await this.getNextDay(gameId);
        // if(phaseType == PHASES.DAY)
        //     day+=1;
        let newPhase = new Phase({
            gameId: gameId,
            phase: phaseType,
            day: day
        })
        const savedPhase = await newPhase.save();
        return savedPhase
    }
}

module.exports = PhaseService;
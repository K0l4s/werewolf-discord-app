
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const Game = require('../models/Game');

class GameService {
    static async getGameByChannel(channelId) {
        const game = await Game.findOne({ channelId,isEnd:false });
        return game;
    };
    static async getGameById(gameId){
        const game = await Game.findById(gameId)
        return game;
    }
    static async initNewGame(channelId){
        let newGame = Game({
            // id: { type: mongoose.Schema.Types.ObjectId, auto: true },
            //     channelId: {type:String, require:true},
            //     createdDate: {type:Date,require: true},
            //     isStart: {type:Boolean,require:true,default:false},
            //     isEnd: {type:Boolean,require:true,default:false}
            channelId:channelId
        })
        const savedGame = await newGame.save();
        return savedGame
    }
}
module.exports = GameService;
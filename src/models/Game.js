
const mongoose = require('mongoose');
const { PHASES } = require('../config/constants');

const gameSchema = new mongoose.Schema({
    // id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    channelId: { type: String, require: true },
    isStart: { type: Boolean, require: true, default: false },
    isEnd: { type: Boolean, require: true, default: false },
    // phase: {type:PHASES,require:true,default:PHASES.WAITING},
    player: {
        type: [{
            userId: String,
            isAlive: Boolean,
            roleId: String,
            loverId: String
        }]
    },

    // Timestamps
    // createdAt: { type: Date, default: Date.now },
    createdDate: { type: Date, require: true, default: Date.now() },
    updatedAt: { type: Date, default: Date.now }
});
gameSchema.index({ createdDate: 1 }, { expireAfterSeconds: 86400 });
module.exports = mongoose.model('Game', gameSchema);
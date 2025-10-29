
const mongoose = require('mongoose');
const { PHASES, ACTION_TYPE } = require('../config/constants');

const phaseSchema = new mongoose.Schema({
    gameId: { type: String, required: true },
    createdDate: { type: Date, required: true, default: Date.now },
    phase: {
        type: String,
        enum: Object.values(PHASES),
        required: true,
        default: PHASES.DAY
    },
    day: { type: Number, required: true, default: 1 },
    action: [{
        userId: String,
        action: {
            type: String,
            enum: Object.values(ACTION_TYPE)
        },
        targetId: String
    }],
    isEnd: { type: Boolean, required: true, default: false },
    isProcessing: { type: Boolean, require: false, default: false },
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
phaseSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
module.exports = mongoose.model('Phase', phaseSchema);
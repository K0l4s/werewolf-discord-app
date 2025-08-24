const mongoose = require('mongoose');

const battleSchema = new mongoose.Schema({
    battleId: { type: String, unique: true, required: true },
    initiatorId: { type: String, required: true },
    targetId: { type: String, required: true },
    messageId: { type: String, required: true },
    channelId: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'active', 'completed', 'timeout', 'rejected'],
        default: 'pending'
    },
    // Spirit data
    initiatorSpirit: { type: Object, required: true },
    initiatorSpirit2: { type: Object, default: null },
    targetSpirit: { type: Object, required: true },
    targetSpirit2: { type: Object, default: null },
    // Detailed spirit info
    initiatorSpiritDetail: { type: Object, default: null },
    targetSpiritDetail: { type: Object, default: null },
    initiatorSpiritDetail2: { type: Object, default: null },
    targetSpiritDetail2: { type: Object, default: null },
    // Battle state
    initiatorHP: { type: Number, default: 0 },
    targetHP: { type: Number, default: 0 },
    initiatorHP2: { type: Number, default: null },
    targetHP2: { type: Number, default: null },
    initiatorCurrentSpirit: { type: Number, default: 0 },
    targetCurrentSpirit: { type: Number, default: 0 },
    round: { type: Number, default: 0 },
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

battleSchema.index({ battleId: 1 });
battleSchema.index({ initiatorId: 1, status: 1 });
battleSchema.index({ targetId: 1, status: 1 });
battleSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // Tự động xóa sau 24h

module.exports = mongoose.model('Battle', battleSchema);
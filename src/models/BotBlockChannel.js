const { all } = require("axios");
const { default: mongoose } = require("mongoose");
// const { ITEM_RARITY, ITEM_TYPE } = require("../config/constants");

const botBlockChannelSchema = new mongoose.Schema(
    {
        guildId: { type: String, required: true, unique: true },
        channelId: { type: String, required: true },
        isBlockAll: { type: Boolean, required: true, default: false },
        isActive: { type: Boolean, required: true, default: false },
        allowUserIds: { type: [String], required: true, default: [] }, 
        blockedCommands: { type: [String], required: true, default: [] }, 
        blockedBotIds: { type: [String], required: true, default: [] }, 
        isBanUserMessages: { type: Boolean, required: true, default: false },
        banMinutes: { type: Number, required: false, default: 0 },
    });



module.exports = mongoose.model('BotBlockChannel', botBlockChannelSchema);
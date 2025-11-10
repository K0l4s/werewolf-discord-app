
const mongoose = require('mongoose');
const { PHASES, ACTION_TYPE } = require('../config/constants');

const notificationSchema = new mongoose.Schema({
    guildId: { type: String, require: true, unique: true },
    channels: [
        {
            channelId: { type: String, required: true },
            channelType: {
                type: String,
                enum: ["welcome", "goodbye", "booster"]
            },
            // title: String,
            // description: String,
            message: { type: String, required: false },
            isEmbed: { type: Boolean, default: false },
            embed: { type: mongoose.Schema.Types.ObjectId, ref: "EmbedTemplate", required: false },
            imageUrl: { type: String, required: false },
        }
    ],
    gaChannelId: { type: String },
    gaReqChannelId: { type: String },
    gaResChannelId: { type: String },
    gaCreateChannelId: { type: String },
    isChannelEnabled: { type: Boolean, default: false },
    isEmbedEnabled: { type: Boolean, default: true },
    isStreakEnabled: { type: Boolean, default: true },
    isLinkDisable: { type: Boolean, default: false },
    isInviteDisable: { type: Boolean, default: false },
    isSpamMessageDisable: { type: Boolean, default: false },

    ticketCate: {
        type: [{
            cateName: { type: String, required: true, default: "🎟️ General" },
            description: { type: String, required: true, default: "Welcome to ticket" },
            cateType: { type: String, default: "general" },
            cateId: { type: String, required: true },
            roleIds: { type: [String], required: false, default: [] },
            userIds: { type: [String], required: false, default: [] },
            requiredRoleIds: { type: [{ type: String }], required: false, default: [] }
        }]
        , required: false,
    },
})
module.exports = mongoose.model('Notification', notificationSchema);  
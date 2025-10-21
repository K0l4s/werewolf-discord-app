
const mongoose = require('mongoose');
const { PHASES, ACTION_TYPE } = require('../config/constants');

const notificationSchema = new mongoose.Schema({
    guildId: { type: String, require: true, unique: true },
    channels: [
        {
            channelId: String,
            channelType: {
                type: String,
                enum: ["welcome", "goodbye", "booster"]
            },
            title: String,
            description: String,
            imageUrl: String,
        }
    ],
    gaChannelId: { type: String, default: false },
    gaReqChannelId: { type: String, default: false },
    gaResChannelId: {type:String, default:false},
    isChannelEnabled: { type: Boolean, default: false },
    isEmbedEnabled: { type: Boolean, default: true },
    isStreakEnabled: { type: Boolean, default: true },
    isLinkDisable: { type: Boolean, default: false },
    isInviteDisable: { type: Boolean, default: false },
    isSpamMessageDisable: { type: Boolean, default: false }
})
module.exports = mongoose.model('Notification', notificationSchema);

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
            description:String,
            imageUrl:String,
        }
    ]
})
module.exports = mongoose.model('Notification', notificationSchema);
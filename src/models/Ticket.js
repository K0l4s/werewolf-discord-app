// role model
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    hostId: { type: String, required: true },
    acceptId: {type:String,required:false},
    createdBy: { type: Date, required: true, default: Date.now },
    deleteAt: { type: Date, required: false },
    channelId: { type: String, required: true },
    status: { type: String, required: true, default: 'open' } //open & received & closed
});
ticketSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('Ticket', ticketSchema); 
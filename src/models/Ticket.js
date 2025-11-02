// role model
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    hostId: { type: String, required: true },
    createdBy: { type: String, required: true, default: Date.now() },
    deleteAt: { type: Date, required: false },
    channelId: { type: String, required: true },
    status: { type: String, required: true, default: 'open' } //open & closed
});
ticketSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('Ticket', ticketSchema); 
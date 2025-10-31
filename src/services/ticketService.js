const Ticket = require("../models/Ticket");
const User = require("../models/User");

class TicketService {
    static async createNewTicket(guildId, channelId, hostId) {
        const newTicket = await Ticket.create({
            guildId,
            channelId,
            hostId
        })
        return newTicket
    }
}

module.exports = TicketService;


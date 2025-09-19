// role model
const mongoose = require('mongoose');

const serverPetchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    lvl: { type: Number, required: true, default: 0 },
    exp: { type: Number, required: true, default: 0 },
    name: { type: String, required: true, default: "Fluffy" },
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true },
    hunger: { type: Number, required: true, default: 100 },
    happiness: { type: Number, required: true, default: 100 },
    lastFed: { type: Date, required: true, default: Date.now },
    lastPlayed: { type: Date, required: true, default: Date.now },
});

module.exports = mongoose.model('ServerPet', serverPetchema);
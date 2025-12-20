const { default: mongoose } = require("mongoose");
export const GHOST_QUALITIES = { C:"C", B:"B", A:"A", S:"S", SS:"SS", SSS:"SSS"};
const ghostSchema = new mongoose.Schema({
    name: { type: String, require: true },
    quality: { type: String, enum: Object.values(GHOST_QUALITIES), require: true },
    health: { type: Number, require: true },
    attack: { type: Number, require: true },
    defense: { type: Number, require: true },
    speed: { type: Number, require: true },
    types: { type: [String], require: true },
    // skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GhostSkill' }]
});

module.exports = mongoose.model('Ghost', ghostSchema);
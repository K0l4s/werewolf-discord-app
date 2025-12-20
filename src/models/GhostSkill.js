import { GHOST_QUALITIES } from "./Ghost";

const { default: mongoose } = require("mongoose");
export const GHOST_EFFECTS = { BURN: "burn", FREEZE: "freeze", POISON: "poison", STUN: "stun", HEAL: "heal", SHIELD: "shield" };
const GhostSkillSchema = new mongoose.Schema({
    skillName: { type: String, require: true },
    power: { type: Number, require: true },
    effect: {
        type: [{
            effectType: String, enum: Object.values(GHOST_EFFECTS),
            effectValue: Number,
            effectDuration: Number //Lượt dính hiệu ứng
        }]
    },
    quality: { type: String, enum: Object.values(GHOST_QUALITIES), require: true },
    cooldown: { type: Number, require: true },
    skillRequireLevel: { type: Number, require: true },
    description: { type: String, require: false },
    ref: { type: String, require: true, unique: true }
});
module.exports = mongoose.model('GhostSkill', GhostSkillSchema);
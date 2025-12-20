const { default: mongoose } = require("mongoose");

const ghostSchema = new mongoose.Schema({
    userId: { type: String, require: true },
    nickname: { type: String, require: false },
    level: { type: Number, require: true, default: 1 },
    experience: { type: Number, require: true, default: 0 },
    catchAt: { type: Date, require: true, default: Date.now },
    isEquipped: { type: Boolean, require: true, default: false },
    skill: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'GhostSkill'
            }
        ],
        validate: [arrayLimit, '{PATH} exceeds the limit of 5']
    },
    ghost: { type: mongoose.Schema.Types.ObjectId, ref: 'Ghost', require: true }
});
function arrayLimit(val) {
    return val.length <= 5;
}
module.exports = mongoose.model('UserGhost', ghostSchema);
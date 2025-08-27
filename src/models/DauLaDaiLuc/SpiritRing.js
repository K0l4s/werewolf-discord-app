const { default: mongoose, Schema } = require("mongoose");
const { ITEM_RARITY } = require("../../config/constants");
// const Item = require("./Item");

const spiritRingSchema = new mongoose.Schema(
    {
        userId: { type: String, require: true },
        ringRef: { type: String, require: true, unique: true },
        years: { type: Number, require: true, default: 1 },
        hp: { type: Number, require: true, default: 1 },
        icon: { type: String, require: true },
        atk: { type: Number, require: true, default: 1 },
        def: { type: Number, require: true, default: 1 },
        sp: { type: Number, require: true, default: 1 },
        isAttach: { type: Boolean, require: true, default: false }
    }
)
// Auto-generate ringRef trước khi save (6 ký tự base36 ngẫu nhiên)
spiritRingSchema.pre("save", async function (next) {
    if (!this.ringRef) {
        let isUnique = false;
        while (!isUnique) {
            const candidate = Math.random().toString(36).substring(2, 8).toUpperCase();
            const exists = await this.constructor.findOne({ ringRef: candidate });
            if (!exists) {
                this.ringRef = candidate;
                isUnique = true;
            }
        }
    }
    next();
});
module.exports = mongoose.model('SpiritRing', spiritRingSchema);
const { default: mongoose, Schema } = require("mongoose");
const { ITEM_RARITY } = require("../../config/constants");
// const Item = require("./Item");

const spiritRingSchema = new mongoose.Schema(
    {
        years: { type: Number, require: true, default: 1 },
        hp: { type: Number, require: true, default: 0 }, 
        icon: {type:String,require:true},
        atk: { type: Number, require: true, default: 1 },
        def: { type: Number, require: true, default: 1 },
        sp: { type: Number, require: true, default: 1 }
    }
)

module.exports = mongoose.model('SpiritRing', spiritRingSchema);
const { default: mongoose, Schema } = require("mongoose");
const { ITEM_RARITY } = require("../../config/constants");
// const Item = require("./Item");

const spiritSchema = new mongoose.Schema(
    {
        name: { type: String, require: true },
        ref: {type:String,require:true,unique:true},
        description: { type: String, require: true },
        imgUrl: { type: String, require: true },
        icon: { type: String, require: true },
        hp: { type: Number, require: true, default: 0 },
        atk: { type: Number, require: true, default: 0 },
        def: { type: Number, require: true, default: 0 },
        sp: { type: Number, require: true, default: 0 },
        rarity: {
            type: String,
            enum: [ITEM_RARITY.C, ITEM_RARITY.SM, ITEM_RARITY.R, ITEM_RARITY.SR,
            ITEM_RARITY.E, ITEM_RARITY.SE, ITEM_RARITY.L, ITEM_RARITY.SL,
            ITEM_RARITY.MY, ITEM_RARITY.SMY
            ],
            required: true,
            default: ITEM_RARITY.C
        },
        isFirstAwake:{type:Boolean,require:false,default:true},
        nextId: { type: String, require: false } //Có thể tiến hóa được vũ hồn
    }
)

module.exports = mongoose.model('Spirit', spiritSchema);
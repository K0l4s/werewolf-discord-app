const { default: mongoose } = require("mongoose");
const { ITEM_RARITY, ITEM_TYPE } = require("../config/constants");

const itemSchema = new mongoose.Schema(
    {
        name: { type: String, require: true },
        price: { type: Number, require: true, default: 0 },
        tokenPrice: {type:Number,require: false},
        sell: {type:Number,require:false,default:0}, //Giá bán
        point: {type:Number,require: false,default:0}, //Điểm tình bạn cộng vào
        multiplierRate:{type:Number,require:false,default:1},
        isBuy: { type: Boolean, required: false, default: true },
        description: { type: String, require: false },
        itemRef: { type: String, require: true, unique: true },
        icon: {
            type: String, require: true,
            default: "<:source:1383223035334627358>"
        },
        rarity: {
            type: String,
            enum: Object.values(ITEM_RARITY),
            required: true,
            default: ITEM_RARITY.C
        },
        type: {
            type: String,
            enum: Object.values(ITEM_TYPE),
            required: true,
            default: ITEM_TYPE.NORMAL
        },
        maxPerDay: { type: Number, require: false },
        limitedUse: {type:Number,require:false}
    }
)

module.exports = mongoose.model('Item', itemSchema);
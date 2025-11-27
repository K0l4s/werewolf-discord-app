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
            enum: [ITEM_RARITY.C, ITEM_RARITY.SM, ITEM_RARITY.R, ITEM_RARITY.SR,
            ITEM_RARITY.E, ITEM_RARITY.SE, ITEM_RARITY.L, ITEM_RARITY.SL,
            ITEM_RARITY.MY, ITEM_RARITY.SMY
            ],
            required: true,
            default: ITEM_RARITY.C
        },
        type: {
            type: String,
            enum: [ITEM_TYPE.NORMAL, ITEM_TYPE.PRESENT_BOX, ITEM_TYPE.PET_FOOD, ITEM_TYPE.MINERAL,ITEM_TYPE.RING,ITEM_TYPE.WOOD,ITEM_TYPE.PICKACE,ITEM_TYPE.AXE,ITEM_TYPE.FRUIT],
            required: true,
            default: ITEM_TYPE.NORMAL
        },
        maxPerDay: { type: Number, require: false },
        limitedUse: {type:Number,require:false}
    }
)

module.exports = mongoose.model('Item', itemSchema);
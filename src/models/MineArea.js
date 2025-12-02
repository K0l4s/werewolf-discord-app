const { default: mongoose } = require("mongoose");
// const { ITEM_RARITY, ITEM_TYPE } = require("../config/constants");

const mineAreaSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        requiredLevel: { type: Number, required: true, default: 1 },

        // rarityRates sẽ lưu như { C: 60, SM: 25, ... }
        rarityRates: { type: Object, required: true },

        index: { type: Number, required: true, unique: true }, // để xác định khu 0,1,2,3,...
        icon: { type: String, required: false },
        image: { type: String, required: false }
    });



module.exports = mongoose.model('MineArea', mineAreaSchema);
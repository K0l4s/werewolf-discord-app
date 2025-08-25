const { default: mongoose } = require("mongoose");
const { ITEM_RARITY, ITEM_TYPE } = require("../config/constants");

const prefixSchema = new mongoose.Schema(
    {
        guildId: { type: String, required: true, unique: true },
        prefix: { type: String, default: "w" } // mặc định global prefix
    }
)

module.exports = mongoose.model('Prefix', prefixSchema);
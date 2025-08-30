const { default: mongoose } = require("mongoose");
// const { ITEM_RARITY, ITEM_TYPE } = require("../config/constants");

const languageSchema = new mongoose.Schema(
    {
        guildId: { type: String, required: true, unique: true },
        lang: {
            type: String, default: "en", require: true
            , enum: ["en", "vi"]
        }
    }
)

module.exports = mongoose.model('Language', languageSchema);
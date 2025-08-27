const { default: mongoose, Schema } = require("mongoose");
// const Item = require("./Item");

const spiritMasterSchema = new mongoose.Schema(
    {
        userId: { type: String, require: true },
        spirit: { type: mongoose.Schema.Types.ObjectId, ref: "Spirit", required: true },
        equipRing: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: "SpiritRing" }],
            default: []
        }

    }
)

module.exports = mongoose.model('SpiritMaster', spiritMasterSchema);
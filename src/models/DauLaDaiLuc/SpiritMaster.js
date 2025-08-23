const { default: mongoose, Schema } = require("mongoose");
// const Item = require("./Item");

const spiritMasterSchema = new mongoose.Schema(
    {
        userId: { type: String, require: true},
        spirit: { type: mongoose.Schema.Types.ObjectId, ref: "Spirit", required: true },
        equipRing: [{type:mongoose.Schema.Types.ObjectId,ref:"SpiritRing",required:false}]       
    }
)

module.exports = mongoose.model('SpiritMaster', spiritMasterSchema);
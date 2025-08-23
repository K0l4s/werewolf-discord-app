const { default: mongoose, Schema } = require("mongoose");
// const Item = require("./Item");

const inventorySchema = new mongoose.Schema(
    {
        userId: { type: String, require: true },
        item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
        quantity: { type: Number, require: true, default: 0 },
    }
)

module.exports = mongoose.model('Inventory', inventorySchema);
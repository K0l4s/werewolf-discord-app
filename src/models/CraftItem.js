// role model
const mongoose = require('mongoose');

const craftItemSchema = new mongoose.Schema({
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true, unique: true },
    components: [
        {
            component: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
            quantity: { type: Number, required: true, min: 1 }
        }
    ],
    conditions: {
        requiredLevel: { type: Number, default: 1, min: 1 },
    },
    successRate: { type: Number, required: false, default: 1 }
});


module.exports = mongoose.model('CraftItem', craftItemSchema); 
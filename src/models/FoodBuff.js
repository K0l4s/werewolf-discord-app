// role model
const mongoose = require('mongoose');

const foodBuffchema = new mongoose.Schema({
    // ref to item
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true, unique: true },
    hungerBuff: { type: Number, required: true, default: 20 },
    happinessBuff: { type: Number, required: true, default: 20 },
    luckyBuff: { type: Number, required: true, default: 0 }
});

module.exports = mongoose.model('FoodBuff', foodBuffchema); 
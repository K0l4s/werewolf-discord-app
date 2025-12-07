// role model
const mongoose = require('mongoose');
const { TEAMS } = require("../config/constants");

const boxDropRateSchema = new mongoose.Schema({
    box: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true, unique: true },
    // dropRate: { type: Number, require: true, default: 0 } //Tính theo 0.2 0.3. Max là 1.
    items: [
        {
            id: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
            dropRate: { type: Number, require: true, default: 0 }, //Tính theo 0.2 0.3. Max là 1.
            maxQuantity: { type: Number, require: true, default: 1 }
        }
    ],
    maxDrop: { type: Number, required: false, default: 0 }
});

module.exports = mongoose.model('BoxDropRate', boxDropRateSchema);
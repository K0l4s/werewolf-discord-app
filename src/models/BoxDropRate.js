// role model
const mongoose = require('mongoose');
const { TEAMS } = require("../config/constants");

const boxDropRateSchema = new mongoose.Schema({
    itemDrop: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    box: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    dropRate: { type: Number, require: true, default: 0 } //Tính theo 0.2 0.3. Max là 1.
});

module.exports = mongoose.model('BoxDropRate', boxDropRateSchema);
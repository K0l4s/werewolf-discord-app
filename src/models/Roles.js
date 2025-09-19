// role model
const mongoose = require('mongoose');
const { TEAMS } = require("../config/constants");

const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    enName: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    enDescription: { type: String, required: false },
    team: {
        type: Number,
        enum: [TEAMS.WOLVES, TEAMS.VILLAGERS, TEAMS.THIRD_PARTY],
        required: true
    },
    isFunc:{type:Boolean,default:false},
    image: { type: String },
    color: { type: String },
    minPlayer: { type: Number, default: 0, required: true },
    isAlwaysShow: { type: Boolean, default: false, required: true }
});

module.exports = mongoose.model('Role', roleSchema);
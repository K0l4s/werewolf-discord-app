
const mongoose = require('mongoose');
const userSchema = new mongoose.Schema(({
    userId: { type: String, require: true, unique: true },
    coin: { type: Number, require: true, default: 0 },
    exp: { type: Number, require: false, default: 0 },
    lvl: { type: Number, require: false, default: 1 },
    lastDaily: { type: Date, require: false },
    spiritLvl: { type: Number, require: true, default: 1 },
    spiritExp: { type: Number, require: true, default: 0 },
    inviteCode: { type: String, require: false },
    luckyBoost: { type: Number, require: true, default: 0 },
    token: {type:Number, require:false,default:0}
}));
module.exports = mongoose.model('User', userSchema);

const mongoose = require('mongoose');
const userSchema = new mongoose.Schema(({
    // id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    userId: {type:String, require:true, unique:true},
    coin: {type:Number,require:true,default:0},
    exp: {type:Number, require:false, default:0}, 
    lvl: {type:Number,require:false,default:1},
    lastDaily: {type:Date,require:false},
    spiritLvl: {type:Number, require:true,default:1},
    spiritExp:{type:Number,require:true,default:0}
    // inventory: {type:Array, require:false, default:[]},
}));
module.exports = mongoose.model('User', userSchema);
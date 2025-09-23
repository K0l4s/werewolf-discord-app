// role model
const mongoose = require('mongoose');

const petchema = new mongoose.Schema({
    image: { type: String, required: true, default: "https://i.imgur.com/0DElr0H.png" },
    lvlRequirement: { type: Number, required: true, default: 100 },
    expStats: { type: Number, required: true, default: 100 },
    hungerStats: { type: Number, required: true, default: 20 },
    happinessStats: { type: Number, required: true, default: 20 },
    price: { type: Number, required: false }, // price is optional
    type: { type: String, required: true, default: "Dog" },
    luckyBoost: { type: Number, required: true, default: 0 },
    prevPetRequirement: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: false } // previous pet is optional
});

module.exports = mongoose.model('Pet', petchema);
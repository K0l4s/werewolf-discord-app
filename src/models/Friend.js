const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
    user1: { type: String, required: true },
    user2: { type: String, required: true },
    itemsCount: { type: Number, required: false, default: 0 },
    friendPoint: { type: Number, required: true, default: 0 },

    // Lưu 5 lần tặng gần nhất
    last5Send: {
        type: [{ type: Date }],
        default: []
    }
});

module.exports = mongoose.model('Friend', friendSchema);


const mongoose = require('mongoose');
const { PHASES, ACTION_TYPE } = require('../config/constants');

const paymentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    orderId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    status: { type: String, required: true, default: 'pending' }, // pending, completed, failed
    paymentDate: { type: Date },
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
// Xóa trong 1 năm
paymentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });
module.exports = mongoose.model('Payment', paymentSchema);
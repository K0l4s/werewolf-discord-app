// role model
const mongoose = require('mongoose');

const buffActivateSchema = new mongoose.Schema({
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true, unique: true },
    userId: { type: String, required: true },
    activatedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    luckyBuff: { type: Number, required: true, default: 0 },
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

buffActivateSchema.virtual("isExpired").get(function () {
    return this.expiresAt < new Date();
});
// auto set expiresAt to 1 hour after activatedAt
buffActivateSchema.pre('save', function (next) {
    if (!this.expiresAt) {
        this.expiresAt = new Date(this.activatedAt.getTime() + 60 * 60 * 1000); // 1 hour later
    }
    next();
});
// delete document after expiresAt
buffActivateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BuffActivate', buffActivateSchema);
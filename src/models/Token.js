
const mongoose = require('mongoose');
const tokenSchema = new mongoose.Schema(({
    userId: { type: String, require: true},
    token: { type: String, require: true, unique: true },
    discordToken: { type: String, require: true },
    expiresAt: { type: Date, require: true },
    isExpired: { type: Boolean, require: true, default: false },
}));
// auto delete expired tokens
tokenSchema.index({ "expiresAt": 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('Token', tokenSchema);
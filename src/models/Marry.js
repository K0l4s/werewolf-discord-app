const mongoose = require('mongoose');

const marrySchema = new mongoose.Schema({
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    // ring: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    rings: [{
        ring: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
        giftDate: { type: Date, default: Date.now() }
    }],
    marryDate: { type: Date, required: true, default: Date.now() },
    lovePoint: { type: Number, required: true, default: 0 },
    blesserIds: { type: [{ type: String }], required: false, default: [] }
});

// Check 1 người chỉ được marry 1 lần
// marrySchema.pre('save', async function (next) {
//     const sender = this.senderId;
//     const receiver = this.receiverId;

//     const existed = await mongoose.model('Marry').findOne({
//         $or: [
//             { senderId: sender },
//             { receiverId: sender },
//             { senderId: receiver },
//             { receiverId: receiver }
//         ]
//     });

//     if (existed) {
//         return next(new Error("Một người chỉ được cưới 1 lần!"));
//     }

//     next();
// });

module.exports = mongoose.model('Marry', marrySchema);

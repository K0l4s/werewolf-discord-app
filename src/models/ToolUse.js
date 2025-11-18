const { default: mongoose } = require("mongoose");
const toolUseSchema = new mongoose.Schema(
    {
        userId: { type: String, require: true },
        item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
        remainingUse: { type: Number, default: 1, required: true }
    }
)
// toolUseSchema.post('findOneAndUpdate', async function (doc) {
//     if (doc && doc.remainingUse === 0) {
//         await doc.deleteOne();
//         console.log(`🔄 ToolUse ${doc._id} đã bị xoá vì remainingUse = 0`);
//     }
// });
module.exports = mongoose.model('ToolUse', toolUseSchema);
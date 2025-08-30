const { default: mongoose } = require("mongoose");
// const { ITEM_RARITY, ITEM_TYPE } = require("../config/constants");

const inviteCodeSchema = new mongoose.Schema(
    {
        userId: { type: String, require: true,unique:true },
        code: { type: String, unique:true }
    }
)
inviteCodeSchema.pre("save", async function (next) {
    if (!this.code) {
        let isUnique = false;
        while (!isUnique) {
            const candidate = Math.random().toString(36).substring(2, 8).toUpperCase();
            const exists = await this.constructor.findOne({ code: candidate });
            if (!exists) {
                this.code = candidate;
                isUnique = true;
            }
        }
    }
    next();
});
module.exports = mongoose.model('InviteCode', inviteCodeSchema);
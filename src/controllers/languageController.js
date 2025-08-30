
const Language = require("../models/Language");
// const Lang = require("../models/Language");

class LanguageController {
    static async setLanguage(lang, guildId) {
        const result = await Language.findOneAndUpdate(
            { guildId },                  // điều kiện tìm
            { $set: { lang } },          // cập nhật
            { new: true, upsert: true }  // nếu không có thì tạo mới, trả về document mới
        );
        return result;
    }
    static async getLang(guildId){
        const result = await Language.findOne({guildId:guildId})
        if(result)
            return result.lang;
        return "en"
    }
}
module.exports = LanguageController;
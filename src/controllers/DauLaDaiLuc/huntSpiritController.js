const { EmbedBuilder } = require("discord.js");
const SpiritRing = require("../../models/DauLaDaiLuc/SpiritRing");
const User = require("../../models/User");
const { addExperience } = require("../userController");
const UserController = require("../userController");
const UserService = require("../../services/userService");
const { wolfCoin } = require("../../utils/wolfCoin");

class HuntSpiritController {
    static async huntSpirits(userId) {
        const user = await UserService.findUserById(userId);
        if (!user) throw new Error("User not found");

        // --- Xác định mốc years có thể rơi dựa theo lvl ---
        let possibleRanges = [];
        if (user.spiritLvl >= 1) possibleRanges.push({ min: 1, max: 9, weight: 50 });       // dễ rớt nhất
        if (user.spiritLvl >= 10) possibleRanges.push({ min: 9, max: 500, weight: 25 });
        if (user.spiritLvl >= 20) possibleRanges.push({ min: 500, max: 700, weight: 10 });
        if (user.spiritLvl >= 30) possibleRanges.push({ min: 700, max: 800, weight: 7 });
        if (user.spiritLvl >= 40) possibleRanges.push({ min: 800, max: 999, weight: 5 });
        if (user.spiritLvl >= 50) possibleRanges.push({ min: 1000, max: 2500, weight: 2 });
        if (user.spiritLvl >= 60) possibleRanges.push({ min: 2500, max: 5000, weight: 1 });
        if (user.spiritLvl >= 70) possibleRanges.push({ min: 10000, max: 70000, weight: 0.5 });

        // --- chọn range theo tỷ lệ weight ---
        const totalWeight = possibleRanges.reduce((a, b) => a + b.weight, 0);
        let rnd = Math.random() * totalWeight;
        let chosenRange;
        for (let range of possibleRanges) {
            if (rnd < range.weight) {
                chosenRange = range;
                break;
            }
            rnd -= range.weight;
        }

        if (!chosenRange) chosenRange = possibleRanges[0]; // fallback

        // random years trong range
        const years = Math.floor(Math.random() * (chosenRange.max - chosenRange.min + 1)) + chosenRange.min;

        // Base stats
        let hp = 5, atk = 5, def = 5, sp = 5;

        const getBonus = (years) => {
            if (years <= 10) return Math.floor(Math.random() * 10) + 1;
            if (years <= 100) return Math.floor(Math.random() * 11) + 10;
            if (years <= 500) return Math.floor(Math.random() * 11) + 20;
            if (years <= 1000) return Math.floor(Math.random() * 11) + 30;
            if (years <= 5000) return Math.floor(Math.random() * 11) + 40;
            if (years <= 10000) return Math.floor(Math.random() * 11) + 50;
            if (years <= 20000) return Math.floor(Math.random() * 11) + 60;
            if (years <= 50000) return Math.floor(Math.random() * 11) + 70;
            return Math.floor(Math.random() * 21) + 80;
        };

        const bonus = getBonus(years);
        hp += bonus; atk += bonus; def += bonus; sp += bonus;

        // chọn thumbnail theo years
        let thumbnailUrl = "";
        if (years <= 9) thumbnailUrl = "https://i.ibb.co/rqL5yyp/10nam.png";
        else if (years <= 999) thumbnailUrl = "https://i.ibb.co/ks3FpBxh/100nam.png";
        else if (years <= 9999) thumbnailUrl = "https://i.ibb.co/HT3qsjSk/1000nam.png";
        else thumbnailUrl = "https://i.ibb.co/gZGZk3NS/10000nam.png";

        // lưu DB
        const icon = "<a:1000nam:1408868369951752233>";
        const newSpiritRing = new SpiritRing({
            userId,
            years,
            hp,
            atk,
            def,
            sp,
            icon
        });
        await newSpiritRing.save();
        await UserController.addExperienceSpirit(userId, 10);
        await UserController.addCoin(userId,50);
        // Tạo Embed trả về
        const embed = new EmbedBuilder()
            .setTitle(`${icon} You have hunted a new Spirit Ring!`)
            .setDescription(`**Years:** ${years}\n**HP:** ${hp}\n**ATK:** ${atk}\n**DEF:** ${def}\n**SP:** ${sp}\n
                +10 Spirit Exp\n+${wolfCoin(10)}`)
            .setThumbnail(thumbnailUrl)
            .setColor("#8B5CF6")
            .setFooter({ text: `Hunter: ${userId}` });
        return { embeds: [embed] };
    }
}

module.exports = HuntSpiritController
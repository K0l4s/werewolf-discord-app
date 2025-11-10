const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const UserService = require("../services/userService");
const UserController = require("./userController");
const { DEFAULT_EXP_LVL1, STEP_EXP } = require("../config/constants");
const { t } = require("../i18n");
const LanguageController = require("./languageController");
const Notification = require("../models/Notification");
const Prefix = require("../models/Prefix");

class CommonController {
    static async ping() {
        return "Pong!";
    }
    static async donate() {
        const donateEmbed = new EmbedBuilder()
            .setColor("#ff4081")
            .setTitle("<a:purplecrystalheart:1433020260398665780> Ủng Hộ / Donate")
            .setDescription("Nếu bạn muốn ủng hộ để duy trì và phát triển bot, bạn có thể chuyển khoản qua thông tin dưới đây:")
            .addFields(
                { name: "<a:moneyfly:1437401769503232021> Momo QR", value: "Quét mã QR bên dưới để thanh toán nhanh chóng." },
                { name: "<a:rwhitesmoke:1433076077642780705> Thông tin chuyển khoản", value: "<a:book3:1433020262990745600> **Ngân hàng:** Agribank\n<a:rocket:1433022000112074862> **Chủ TK:** HUỲNH TRUNG KIÊN\n<a:purplecrystalheart:1433020260398665780> **Số TK:** 8888827626203" }
            )
            .setImage("https://i.ibb.co/5hyjcdXc/d843e510-f7ed-4b6d-ac8a-1f87aae068db.jpg") // thay link QR Momo thật vào đây
            .setFooter({ text: "Cảm ơn bạn rất nhiều ❤️" });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel("Liên hệ Admin")
                .setStyle(ButtonStyle.Link)
                .setURL("https://discord.gg/kDkydXrtua") // link server hoặc contact
        );

        return ({ embeds: [donateEmbed], components: [row] })
    }
    static async dailyReward(userId) {
        let userData = await UserService.findUserById(userId);
        if (!userData) {
            userData = await UserController.createUser(userId);
        }

        const cooldown = 1000 * 60 * 60 * 24;
        const reward = {
            coin: 100 + Math.floor(Math.random() * 50),
            exp: 50 + Math.floor(Math.random() * 30),
            bonus: Math.random() < 0.2
        };

        if (userData.lastDaily && Date.now() - userData.lastDaily.getTime() < cooldown) {
            const timeLeft = cooldown - (Date.now() - userData.lastDaily.getTime());
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

            const cooldownEmbed = new EmbedBuilder()
                .setColor('#FF5555')
                .setTitle('<a:annouce:1433017025491636356> Đã nhận Daily rồi!')
                .setDescription(`Bạn cần chờ thêm **${hours}h ${minutes}m** nữa để nhận daily tiếp theo.`)
                .addFields(
                    { name: '<a:globalwarming:1433024007741112320> Lần cuối nhận', value: `<t:${Math.floor(userData.lastDaily.getTime() / 1000)}:R>`, inline: true },
                    { name: '<a:alarm:1433097857740574840> Còn lại', value: `${hours}h ${minutes}m`, inline: true }
                )
                .setFooter({ text: 'Daily reset mỗi 24 giờ' });

            return { embeds: [cooldownEmbed] };
        }

        let totalCoin = reward.coin;
        let totalExp = reward.exp;
        let bonusText = '';

        if (reward.bonus) {
            const bonusCoin = Math.floor(totalCoin * 0.5);
            const bonusExp = Math.floor(totalExp * 0.5);
            totalCoin += bonusCoin;
            totalExp += bonusExp;
            bonusText = `<a:purplepresent:1433017039575846932> **Bonus:** +${bonusCoin} coin +${bonusExp} exp`;
        }

        userData.coin += totalCoin;
        userData.exp += totalExp;

        let levelsGained = 0;
        let levelUpText = '';
        const originalLevel = userData.lvl;
        const expToNextLevel = () => Number(userData.lvl) * Number(DEFAULT_EXP_LVL1) * Number(STEP_EXP);

        while (userData.exp >= expToNextLevel()) {
            userData.exp -= expToNextLevel();
            userData.lvl += 1;
            levelsGained += 1;
        }


        console.log({
            originalLevel,
            currentLevel: userData.lvl,
            expRemaining: userData.exp,
            levelsGained
        });


        if (levelsGained > 0) {
            if (levelsGained === 1) {
                levelUpText = `<a:rocket:1433022000112074862> **Level Up!** Level ${originalLevel} → **${userData.lvl}**`;
            } else {
                levelUpText = `<a:rocket:1433022000112074862> **Level Up!** +${levelsGained} levels (${originalLevel} → **${userData.lvl}**)`;
            }
        }

        const expToLevel = Number(userData.lvl) * Number(DEFAULT_EXP_LVL1) * Number(STEP_EXP);
        userData.lastDaily = new Date();
        await userData.save();

        const successEmbed = new EmbedBuilder()
            .setColor('#55FF55')
            .setTitle('<a:annouce:1433017025491636356> Daily Reward')
            .setDescription('Bạn đã nhận daily thành công!')
            .addFields(
                { name: '<a:moneyfly:1437401769503232021> Coin nhận được', value: `**${totalCoin}** coin`, inline: true },
                { name: '<a:starr:1437402008465440788> EXP nhận được', value: `**${totalExp}** exp`, inline: true },
                { name: '<a:rocket:1433022000112074862> Level hiện tại', value: `**${userData.lvl}**`, inline: true },
                { name: '<a:book3:1433020262990745600> EXP hiện tại', value: `**${userData.exp}/${expToLevel}**`, inline: true },
                { name: '<a:holodia:1433016936022802453> Tổng coin', value: `**${userData.coin.toLocaleString()}** coin`, inline: true }
            )
            .setFooter({ text: `Daily tiếp theo: ${new Date(Date.now() + cooldown).toLocaleTimeString()}` });

        if (bonusText) {
            successEmbed.addFields({ name: '<a:moneyfly:1437401769503232021> May mắn', value: bonusText, inline: false });
        }

        if (levelUpText) {
            successEmbed.addFields({ name: '<a:yellowsparklies:1437402422371815477> Thành tựu', value: levelUpText, inline: false });
        }

        return { embeds: [successEmbed] };
    }
    static async setPrefix(guildId, newPrefix,lang) {
        try {
            await Prefix.findOneAndUpdate(
                { guildId: guildId },
                { prefix: newPrefix },
                { upsert: true }
            );
            const embed = new EmbedBuilder()
                .setColor('#55FF55')
                .setTitle(`<a:annouce:1433017025491636356> ${t('s.setting', lang)}`)
                .setDescription(`✅ ${t('s.prefix_succ', lang)} \`${newPrefix}\``);
            return { embeds: [embed] };
        } catch (error) {
            const embed = new EmbedBuilder()
                .setColor('#FF5555')
                .setTitle(`<a:annouce:1433017025491636356> ${t('e.setting', lang)}`)
                .setDescription(`❌ ${lang == "en" ? "An error occurred while setting the prefix. Please try again later." : "Đã có lỗi xảy ra khi cài đặt prefix. Vui lòng thử lại sau."}`);
            return { embeds: [embed] };
        }
    }
    static async setLanguage(guildId, newLang) {
        try {
            await LanguageController.setLanguage(newLang, guildId);
            const embed = new EmbedBuilder()
            let lang = "Rồi tao đổi sang  **Tiếng Việt** :flag_vn:(Nếu như mày không biết 😏) ngay đây";
            if (newLang == "en")
                lang = "Hold on, I changed the language to **English :england:** (as if you didn’t know 😏)"
            // msg.reply(`✅ ${lang}`);
            embed.setColor('#55FF55')
                .setTitle(`<a:annouce:1433017025491636356> ${newLang == "en" ? "Set Language" : "Cài đặt Ngôn ngữ"}`)
                .setDescription(`✅ ${lang}`);
            return { embeds: [embed] };
        } catch (error) {
            const embed = new EmbedBuilder()
                .setColor('#FF5555')
                .setTitle(`<a:annouce:1433017025491636356> ${newLang == "en" ? "Error Setting Language" : "Lỗi Cài đặt Ngôn ngữ"}`)
                .setDescription(`❌ ${newLang == "en" ? "An error occurred while setting the language. Please try again later." : "Đã có lỗi xảy ra khi cài đặt ngôn ngữ. Vui lòng thử lại sau."}`);
            return { embeds: [embed] };
        }
    }
    static async setStreak(guildId, newS, lang) {
        try {
            const isEnabled = newS === "on";
            // await VoiceChannelController.setVoiceChannel(isEnabled, msg.guild.id);
            const serverSetting = await Notification.findOne({ guildId: guildId });
            if (serverSetting) {
                serverSetting.isStreakEnabled = isEnabled;
                await serverSetting.save();
            } else {
                const newSetting = new Notification({
                    guildId: guildId,
                    isStreakEnabled: isEnabled
                });
                await newSetting.save();
            }
            const embed = new EmbedBuilder()
                .setColor('#55FF55')
                .setTitle(`<a:annouce:1433017025491636356>  ${t('s.setting', lang)}`)
                .setDescription(`✅ ${t('s.streak_succ', lang)} \`${newS}\` ${t('s.streak_succ2', lang)}`);
            return { embeds: [embed] };
        } catch (error) {
            const embed = new EmbedBuilder()
                .setColor('#FF5555')
                .setTitle(`<a:annouce:1433017025491636356> ${t('e.setting', lang)}`)
                .setDescription(`❌ ${lang == "en" ? "An error occurred while setting the streak. Please try again later." : "Đã có lỗi xảy ra khi cài đặt streak. Vui lòng thử lại sau."}`);
            return { embeds: [embed] };
        }
        // msg.reply(`✅ ${t('s.streak_succ', lang)} \`${newS}\` ${t('s.streak_succ2', lang)}`);
    }
    static async setVoiceAnnouce(guildId, newVC, lang) {
        //chuyển sang true/ false
        try {
            const isEnabled = newVC === "true";
            // await VoiceChannelController.setVoiceChannel(isEnabled, msg.guild.id);
            const serverSetting = await Notification.findOne({ guildId: guildId });
            if (serverSetting) {
                serverSetting.isChannelEnabled = isEnabled;
                await serverSetting.save();
            } else {
                const newSetting = new Notification({
                    guildId: msg.guild.id,
                    isChannelEnabled: isEnabled
                });
                await newSetting.save();
            }
            const embed = new EmbedBuilder()
                .setColor('#55FF55')
                .setTitle(`<a:annouce:1433017025491636356>  ${t('s.setting', lang)}`)
                .setDescription(`✅ ${t('s.vc_succ', lang)} \`${newVC}\` ${t('s.vc_succ2', lang)}`);
            return { embeds: [embed] };
        } catch (error) {
            const embed = new EmbedBuilder()
                .setColor('#FF5555')
                .setTitle(`<a:annouce:1433017025491636356> ${t('e.setting', lang)}`)
                .setDescription(`❌ ${lang == "en" ? "An error occurred while setting the voice channel notification. Please try again later." : "Đã có lỗi xảy ra khi cài đặt thông báo voice channel. Vui lòng thử lại sau."}`);
            return { embeds: [embed] };
        }
        // msg.reply(`✅ ${t('s.vc_succ', lang)} \`${newVC}\` ${t('s.vc_succ2', lang)}`);
    }
    static async setEmbedAnounce(guildId, newE, lang) {
        try {
            const isEnabled = newE === "true";
            // await VoiceChannelController.setVoiceChannel(isEnabled, msg.guild.id);
            const serverSetting = await Notification.findOne({ guildId: guildId });
            if (serverSetting) {
                serverSetting.isEmbedEnabled = isEnabled;
                await serverSetting.save();
            } else {
                const newSetting = new Notification({
                    guildId: msg.guild.id,
                    isEmbedEnabled: isEnabled
                });
                await newSetting.save();
            }
            const embed = new EmbedBuilder()
                .setColor('#55FF55')
                .setTitle(`<a:annouce:1433017025491636356>  ${t('s.setting', lang)}`)
                .setDescription(`✅ ${t('s.embed_succ', lang)} \`${newE}\` ${t('s.embed_succ2', lang)}`);
            return { embeds: [embed] };
        } catch (error) {
            const embed = new EmbedBuilder()
                .setColor('#FF5555')
                .setTitle(`<a:annouce:1433017025491636356> ${t('e.setting', lang)}`)
                .setDescription(`❌ ${lang == "en" ? "An error occurred while setting the embed notification. Please try again later." : "Đã có lỗi xảy ra khi cài đặt thông báo embed. Vui lòng thử lại sau."}`);
            return { embeds: [embed] };
        }
        // msg.reply(`✅ ${t('s.embed_succ', lang)} \`${newE}\` ${t('s.embed_succ2', lang)}`);
    }
}

module.exports = CommonController;

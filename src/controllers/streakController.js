const { ChannelType, EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const StreakService = require("../services/StreakService");
const LanguageController = require("./languageController");
const Notification = require("../models/Notification");
const userStreak = require("../models/userStreak");

class StreakController {
    static async getNotificationSettings(guildId) {
        const setting = await Notification.findOne({ guildId });
        return {
            isStreak: setting ? setting.isStreakEnabled : true // Default to true if not set
        };
    };
    static async getUserStreakInfo(client, userId, guildId, page = 1) {
        try {
            const perPage = 2;
            const skip = (page - 1) * perPage;

            // Lấy dữ liệu user streak
            const streaks = await userStreak.find({ userId })
                .sort({ currentStreak: -1 })
                .skip(skip)
                .limit(perPage);

            const total = await userStreak.countDocuments({ userId });
            const totalPages = Math.ceil(total / perPage);

            if (!streaks.length) {
                return new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("📉 No Streak Data Found")
                    .setDescription("Bạn chưa có dữ liệu streak nào được ghi nhận.")
                    .setTimestamp();
            }

            // Format từng streak entry
            const fields = streaks.map(s => {
                const guild = client.guilds.cache.get(s.guildId);
                // console.log(guild)
                const guildName = guild ? guild.name : "Unknown Guild";
                return {
                    name: `<a:moneyfly:1437401769503232021> **${guildName}**`,
                    value: [
                        `<a:fire2:1433091789044318332> **Current Streak:** ${s.currentStreak} ngày`,
                        `<a:hammer:1437444063635706037> **Longest Streak:** ${s.longestStreak} ngày`,
                        `<a:book3:1433020262990745600> **Last Join:** ${s.lastJoinDate ? `<t:${Math.floor(s.lastJoinDate.getTime() / 1000)}:R>` : "Chưa có"}`,
                        `<a:purplecrystalheart:1433020260398665780> **Start Date:** ${s.streakStartDate ? `<t:${Math.floor(s.streakStartDate.getTime() / 1000)}:d>` : "N/A"}`,
                        `<a:starr:1437402008465440788> **Recoveries Used:** ${s.recoveryCount}`,
                        `<a:alarm:1433097857740574840> **Total Joined:** ${s.totalDaysJoined} ngày`
                    ].join("\n"),
                    // inline: false
                };
            });
            const prevButtonDisabled = page <= 1;
            const nextButtonDisabled = page >= totalPages;
            const prevButton = new ButtonBuilder()
                .setCustomId(`streak|${userId}|${guildId}|${page - 1}`)
                .setLabel('Previous')
                .setStyle('Primary')
                .setDisabled(prevButtonDisabled);
            const nextButton = new ButtonBuilder()
                .setCustomId(`streak|${userId}|${guildId}|${page + 1}`)
                .setLabel('Next')
                .setStyle('Primary')
                .setDisabled(nextButtonDisabled);
            const actionRow = new ActionRowBuilder().addComponents(prevButton, nextButton);
            const user = await client.users.fetch(userId);
            const embed = new EmbedBuilder()
                .setColor("Aqua")
                .setTitle(`<a:fire2:1433091789044318332> Streak Profile of ${user.globalName || user.username}`)
                .setDescription(`Trang **${page}/${totalPages}**`)
                .addFields(fields)
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter({
                    text: `Trang ${page}/${totalPages} • Tổng: ${total} record`,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            return { embeds: [embed], components: [actionRow] };

        } catch (err) {
            console.error("getUserStreakInfo error:", err);
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("<a:deny:1433805273595904070> Error Loading Streak Info")
                .setDescription("Đã có lỗi khi lấy dữ liệu streak của bạn.")
                .setTimestamp();
            return { embeds: [embed] };
        }
    }
    static async streakAnoucement(client, oldState, newState) {
        const settings = await this.getNotificationSettings(newState.guild.id);
        if (!settings.isStreak) return;
        let channel = newState.channel || oldState.channel;
        if (!channel || channel.type !== ChannelType.GuildVoice) return;
        // xử lý streak
        const userId = newState.member.id;
        const guildId = newState.guild.id;
        try {
            const result = await StreakService.handleUserJoin(userId, guildId);
            // Gửi thông báo tùy theo hành động
            let embed;
            let lang = await LanguageController.getLang(guildId) || 'en';
            console.log(lang)
            switch (result.action) {
                case 'created':
                    embed = new EmbedBuilder()
                        .setColor(0x00FFFF)
                        .setTitle(lang === 'vi' ? '<a:rocket:1433022000112074862> Chuỗi mới!' : '<a:rocket:1433022000112074862> New Streak!')
                        .setDescription(`<@${userId}> ${lang === 'vi' ? 'vừa bắt đầu chuỗi!' : 'has started a new streak!'}`)
                        .addFields(
                            { name: lang === 'vi' ? '<a:fire2:1433091789044318332> Chuỗi hiện tại' : '<a:fire2:1433091789044318332> Current Streak', value: `**${result.streak.currentStreak}** ${lang === 'vi' ? 'ngày' : 'days'}`, inline: true },
                        )
                        .setTimestamp();
                    break;
                case 'incremented':
                    embed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle(lang === 'vi' ? '<a:fire2:1433091789044318332> Chuỗi tăng!' : '<a:fire2:1433091789044318332> Streak Increased!')
                        .setDescription(`<@${userId}> ${lang === 'vi' ? 'vừa duy trì chuỗi!' : 'has maintained their streak!'}`)
                        .addFields(
                            // { name: '🔥 Chuỗi hiện tại', value: `**${result.streak.currentStreak}** ngày`, inline: true },
                            // { name: '🔥 Chuỗi dài nhất', value: `**${result.streak.longestStreak}** ngày`, inline: true }
                            { name: lang === 'vi' ? '<a:fire2:1433091789044318332> Chuỗi hiện tại' : '<a:fire2:1433091789044318332> Current Streak', value: `**${result.streak.currentStreak}** ${lang === 'vi' ? 'ngày' : 'days'}`, inline: true },
                            { name: lang === 'vi' ? '<a:fire2:1433091789044318332> Chuỗi dài nhất' : '<a:fire2:1433091789044318332> Longest Streak', value: `**${result.streak.longestStreak}** ${lang === 'vi' ? 'ngày' : 'days'}`, inline: true }
                        )
                        .setTimestamp();
                    break;

                case 'recovered':
                    embed = new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setTitle(lang === 'vi' ? '<a:pressf:1433016927231545414> Chuỗi đã được hồi phục!' : '<a:pressf:1433016927231545414> Streak Recovered!')
                        .setDescription(`<@${userId}> ${lang === 'vi' ? 'đã sử dụng 1 lần hồi phục' : 'has used 1 recovery'}`)
                        .addFields(
                            { name: lang === 'vi' ? '<a:fire2:1433091789044318332> Chuỗi hiện tại' : '<a:fire2:1433091789044318332> Current Streak', value: `**${result.streak.currentStreak}** ${lang === 'vi' ? 'ngày' : 'days'}`, inline: true },
                            { name: lang === 'vi' ? '<a:fire2:1433091789044318332> Lần hồi phục còn lại' : '<a:fire2:1433091789044318332> Remaining Recoveries', value: `**${result.streak.recoveryCount}**/3`, inline: true }
                        )
                        .setTimestamp();
                    break;

                case 'reset':
                    embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle(lang === 'vi' ? '<a:nonefire:1433092219899740241> Chuỗi đã bị ngắt!' : '<a:nonefire:1433092219899740241> Streak Reset!')
                        .setDescription(`<@${userId}> ${lang === 'vi' ? 'đã không duy trì được chuỗi' : 'has not maintained their streak'}`)
                        .addFields(
                            { name: lang === 'vi' ? '<a:nonefire:1433092219899740241> Chuỗi dài nhất' : '<a:nonefire:1433092219899740241> Longest Streak', value: `**${result.streak.longestStreak}** ${lang === 'vi' ? 'ngày' : 'days'}`, inline: true },
                            { name: lang === 'vi' ? '<a:fire2:1433091789044318332> Chuỗi mới' : '<a:fire2:1433091789044318332> New Streak', value: `**1** ${lang === 'vi' ? 'ngày' : 'days'}`, inline: true }
                        )
                        .setTimestamp();
                    break;
            }

            if (embed) {
                embed.setFooter({
                    text: `${lang === 'vi' ? 'Bật/ tắt chuỗi bằng lệnh wset streak on/off •' : 'Toggle streak with wset streak on/off in your server •'} ${client.user.username}`,
                });
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error handling voice state update:', error);
        }
    }
}
module.exports = StreakController;
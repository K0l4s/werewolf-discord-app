const { ChannelType, EmbedBuilder } = require("discord.js");
const StreakService = require("../services/StreakService");
const LanguageController = require("./languageController");
const Notification = require("../models/Notification");

class StreakController {
    static async getNotificationSettings(guildId) {
        const setting = await Notification.findOne({ guildId });
        return {
            isStreak: setting ? setting.isStreakEnabled : true // Default to true if not set
        };
    };
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
                        .setTitle(lang === 'vi' ? '<a:F_:1433016927231545414> Chuỗi đã được hồi phục!' : '<a:F_:1433016927231545414> Streak Recovered!')
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
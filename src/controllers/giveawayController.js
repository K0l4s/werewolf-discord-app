const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { wolfCoin } = require('../utils/wolfCoin');
const GA_STATUS = require('../models/Giveaway').GA_STATUS;
const GA_TYPE = require('../models/Giveaway').GA_TYPE;

class GiveawayController {
    static createGiveawayEmbed(giveaway, user) {
        const participantCount = giveaway.participants ? giveaway.participants.length : 0;
        const endTime = giveaway.approvedAt.getTime() + (giveaway.duration * 1000);
        const embed = new EmbedBuilder()
            .setTitle(`<a:annouce:1433017025491636356> ${giveaway.title}`)
            .setColor(0x00AE86)
            .setDescription(giveaway.description || 'Không có mô tả')
            .addFields(
                { name: '<a:pixelbat:1433016993946275922> Host', value: `<@${giveaway.hostId}>`, inline: true },
                { name: '<a:flyingpiglet:1433016976099508304> Số người thắng', value: `${giveaway.winnerCount}`, inline: true },
                { name: '<a:alarm:1433097857740574840> Thời gian', value: this.formatDuration(giveaway.duration), inline: true },
                // countdown dựa vào endTime
                { name: '<a:loading:1433098442392993973> Kết thúc vào', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true },
                { name: '<a:holodia:1433016936022802453>  Số người tham gia', value: `${participantCount}`, inline: true }
            )
            .setTimestamp(giveaway.createdAt);

        // Thêm phần thưởng
        let rewardText = '';
        if (giveaway.rewards.currency) {
            rewardText += `<a:animatedarrowgreen:1433017001567059968> **${giveaway.rewards.currency} coins**\n`;
        }
        if (giveaway.rewards.items && giveaway.rewards.items.length > 0) {
            rewardText += `🎁 **Items** (chi tiết trong DB)\n`;
        }
        if (giveaway.rewards.otherItem) {
            rewardText += `<a:holodia:1433016936022802453> **${giveaway.rewards.otherValue? giveaway.rewards.otherValue : 0} ${giveaway.rewards.otherItem}**\n`;
        }

        if (rewardText) {
            embed.addFields({ name: 'Phần thưởng', value: rewardText });
        }

        // Thêm yêu cầu
        if (giveaway.requirementMessage) {
            embed.addFields({ name: '<a:paper:1433099319711629393> Yêu cầu', value: giveaway.requirementMessage });
        }

        // Thêm requirements
        let requirementText = '';
        if (giveaway.requirements.minLevel > 0) {
            requirementText += `<a:book3:1433020262990745600> Level tối thiểu: ${giveaway.requirements.minLevel}\n`;
        }
        if (giveaway.requirements.roleRequired && giveaway.requirements.roleRequired.length > 0) {
            requirementText += `<a:orangeribbon:1433017050195824701> Role: ${giveaway.requirements.roleRequired.map(roleId => `<@&${roleId}>`).join(', ')}`;
        }

        if (requirementText) {
            embed.addFields({ name: '<a:purplecrystalheart:1433020260398665780> Điều kiện tham gia', value: requirementText });
        }

        return embed;
    }

    static createGiveawayButtons(giveaway, isAdmin = false) {
        const row = new ActionRowBuilder();

        if (giveaway.status === GA_STATUS.PENDING) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ga_approve_${giveaway._id}`)
                    .setLabel('Duyệt')
                    .setEmoji('<a:redtick:1433017893154459698>')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`ga_reject_${giveaway._id}`)
                    .setLabel('Từ chối')
                    .setEmoji('<a:deny:1433805273595904070>')
                    .setStyle(ButtonStyle.Danger)
            );
        } else if (giveaway.status === GA_STATUS.ACTIVE) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ga_join_${giveaway._id}`)
                    .setEmoji('<a:rocket:1433022000112074862>')
                    .setLabel('Tham gia')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`ga_list_${giveaway._id}`)
                    .setLabel('Người Tham Gia')
                    .setEmoji('<a:tools:1438545912325476533>')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`ga_remove_${giveaway._id}`)
                    .setLabel('Xóa người')
                    .setEmoji('<a:hammer:1437444063635706037>')
                    .setStyle(ButtonStyle.Danger)
            );

            if (isAdmin) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ga_end_${giveaway._id}`)
                        .setLabel('Kết thúc')
                        .setEmoji('<a:holodia:1433016936022802453>')
                        .setStyle(ButtonStyle.Danger)
                );
            }
        } else if (giveaway.status === GA_STATUS.ENDED && giveaway.winners && giveaway.winners.length > 0) {
            const hasUnclaimed = giveaway.winners.some(w => !w.claimed);
            if (hasUnclaimed) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ga_claim_${giveaway._id}`)
                        .setLabel('Xác nhận phần thưởng')
                        .setEmoji('<a:redtick:1433017893154459698>')
                        .setStyle(ButtonStyle.Success)
                );
            }
        }

        return row;
    }

    static createApprovalEmbed(giveaway) {
        const embed = new EmbedBuilder()
            .setTitle('<a:loading:1433098442392993973> Giveaway Chờ Duyệt')
            .setColor(0xFFA500)
            .setDescription(`**<a:annouce:1433017025491636356> ${giveaway.title}**\n\n${giveaway.description || 'Không có mô tả'}`)
            .addFields(
                { name: '<a:pixelbat:1433016993946275922> Người tạo', value: `<@${giveaway.hostId}>`, inline: true },
                { name: '<a:arrowwhite:1433016988988608582> Số người thắng', value: `${giveaway.winnerCount}`, inline: true },
                { name: '<a:alarm:1433097857740574840> Thời gian', value: this.formatDuration(giveaway.duration), inline: true }
            )
            .setTimestamp();
        let rewardText = '';
        if (giveaway.rewards.currency) {
            rewardText += `<a:animatedarrowgreen:1433017001567059968> **${wolfCoin(giveaway.rewards.currency)}**\n`;
        }
        if (giveaway.rewards.items && giveaway.rewards.items.length > 0) {
            rewardText += `🎁 **Items** (chi tiết trong DB)\n`;
        }
        if (giveaway.rewards.otherItem) {
            rewardText += `<a:holodia:1433016936022802453> **${giveaway.rewards.otherValue.toLocaleString()} ${giveaway.rewards.otherItem}**\n`;
        }

        if (rewardText) {
            embed.addFields({ name: 'Phần thưởng', value: rewardText });
        }
        return embed
    }

    static createResultEmbed(giveaway, winners) {
        const embed = new EmbedBuilder()
            .setTitle(`<a:annouce:1433017025491636356> Kết thúc Giveaway: ${giveaway.title}`)
            .setColor(0x9B59B6)
            .setDescription(`<a:confetti:1433017019141197895> Giveaway đã kết thúc! Chúc mừng những người thắng cuộc!`)
            .addFields(
                { name: '<a:pixelbat:1433016993946275922> Host', value: `<@${giveaway.hostId}>`, inline: true },
                { name: '<a:arrowwhite:1433016988988608582> Số người thắng', value: `${winners.length}`, inline: true }
            );

        if (winners.length > 0) {
            // Winners là mảng các string ID
            const winnerMentions = winners.map(winnerId => `<@${winnerId}>`).join(', ');
            embed.addFields({ name: '<a:flyingpiglet:1433016976099508304> Người thắng', value: winnerMentions });
        } else {
            embed.addFields({ name: '<a:flyingpiglet:1433016976099508304> Người thắng', value: 'Không có người tham gia hợp lệ' });
        }

        // Hiển thị phần thưởng
        let rewardText = '';
        if (giveaway.rewards.currency && giveaway.rewards.currency > 0) {
            rewardText += `<a:animatedarrowgreen:1433017001567059968> **${wolfCoin(giveaway.rewards.currency)} **\n`;
        }
        if (giveaway.rewards.otherItem) {
            rewardText += `<a:holodia:1433016936022802453> **${giveaway.rewards.otherValue.toLocaleString()} ${giveaway.rewards.otherItem}**`;
            // if (giveaway.rewards.otherValue && giveaway.rewards.otherValue > 0) {
            //     rewardText += ` (Số lượng: ${giveaway.rewards.otherValue.toLocaleString()})`;
            // }
        }

        if (rewardText) {
            embed.addFields({ name: '<a:rwhitesmoke:1433076077642780705> Phần thưởng <a:lwhitesmoke:1433024102636982284>', value: rewardText });
        }

        // Thêm timestamp
        embed.setTimestamp();

        return embed;
    }

    static formatDuration(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        const parts = [];
        if (days > 0) parts.push(`${days} ngày`);
        if (hours > 0) parts.push(`${hours} giờ`);
        if (minutes > 0) parts.push(`${minutes} phút`);

        return parts.join(' ') || 'Vài giây';
    }

    static createErrorEmbed(message) {
        return new EmbedBuilder()
            .setTitle('<a:globalwarming:1433024007741112320> Lỗi')
            .setColor(0xFF0000)
            .setDescription(message)
            .setTimestamp();
    }

    static createSuccessEmbed(message) {
        return new EmbedBuilder()
            .setTitle('<a:redtick:1433017893154459698> Thành công')
            .setColor(0x00FF00)
            .setDescription(message)
            .setTimestamp();
    }
}

module.exports = GiveawayController;
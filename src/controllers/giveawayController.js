const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { wolfCoin } = require('../utils/wolfCoin');
const GA_STATUS = require('../models/Giveaway').GA_STATUS;
const GA_TYPE = require('../models/Giveaway').GA_TYPE;

class GiveawayController {
    static createGiveawayEmbed(giveaway, user) {
        const embed = new EmbedBuilder()
            .setTitle(`🎉 ${giveaway.title}`)
            .setColor(0x00AE86)
            .setDescription(giveaway.description || 'Không có mô tả')
            .addFields(
                { name: '👤 Host', value: `<@${giveaway.hostId}>`, inline: true },
                { name: '🎁 Số người thắng', value: `${giveaway.winnerCount}`, inline: true },
                { name: '⏰ Thời gian', value: this.formatDuration(giveaway.duration), inline: true }
            )
            .setTimestamp(giveaway.createdAt);

        // Thêm phần thưởng
        let rewardText = '';
        if (giveaway.rewards.currency) {
            rewardText += `💰 **${giveaway.rewards.currency} coins**\n`;
        }
        if (giveaway.rewards.items && giveaway.rewards.items.length > 0) {
            rewardText += `🎁 **Items** (chi tiết trong DB)\n`;
        }
        if (giveaway.rewards.otherItem) {
            rewardText += `📦 **${giveaway.rewards.otherItem}**\n`;
        }

        if (rewardText) {
            embed.addFields({ name: 'Phần thưởng', value: rewardText });
        }

        // Thêm yêu cầu
        if (giveaway.requirementMessage) {
            embed.addFields({ name: '📝 Yêu cầu', value: giveaway.requirementMessage });
        }

        // Thêm requirements
        let requirementText = '';
        if (giveaway.requirements.minLevel > 0) {
            requirementText += `📊 Level tối thiểu: ${giveaway.requirements.minLevel}\n`;
        }
        if (giveaway.requirements.roleRequired && giveaway.requirements.roleRequired.length > 0) {
            requirementText += `👥 Role: ${giveaway.requirements.roleRequired.map(roleId => `<@&${roleId}>`).join(', ')}`;
        }

        if (requirementText) {
            embed.addFields({ name: '⚙️ Điều kiện tham gia', value: requirementText });
        }

        return embed;
    }

    static createGiveawayButtons(giveaway, isAdmin = false) {
        const row = new ActionRowBuilder();

        if (giveaway.status === GA_STATUS.PENDING) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ga_approve_${giveaway._id}`)
                    .setLabel('✅ Duyệt')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`ga_reject_${giveaway._id}`)
                    .setLabel('❌ Từ chối')
                    .setStyle(ButtonStyle.Danger)
            );
        } else if (giveaway.status === GA_STATUS.ACTIVE) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ga_join_${giveaway._id}`)
                    .setLabel('🎯 Tham gia')
                    .setStyle(ButtonStyle.Primary)
            );

            if (isAdmin) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ga_end_${giveaway._id}`)
                        .setLabel('⏹️ Kết thúc')
                        .setStyle(ButtonStyle.Danger)
                );
            }
        } else if (giveaway.status === GA_STATUS.ENDED && giveaway.winners && giveaway.winners.length > 0) {
            const hasUnclaimed = giveaway.winners.some(w => !w.claimed);
            if (hasUnclaimed) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ga_claim_${giveaway._id}`)
                        .setLabel('✅ Xác nhận phần thưởng')
                        .setStyle(ButtonStyle.Success)
                );
            }
        }

        return row;
    }

    static createApprovalEmbed(giveaway) {
        const embed = new EmbedBuilder()
            .setTitle('🔄 Giveaway Chờ Duyệt')
            .setColor(0xFFA500)
            .setDescription(`**${giveaway.title}**\n\n${giveaway.description || 'Không có mô tả'}`)
            .addFields(
                { name: '👤 Người tạo', value: `<@${giveaway.hostId}>`, inline: true },
                { name: '🎁 Số người thắng', value: `${giveaway.winnerCount}`, inline: true },
                { name: '⏰ Thời gian', value: this.formatDuration(giveaway.duration), inline: true }
            )
            .setTimestamp();
        let rewardText = '';
        if (giveaway.rewards.currency) {
            rewardText += `💰 **${wolfCoin(giveaway.rewards.currency)}**\n`;
        }
        if (giveaway.rewards.items && giveaway.rewards.items.length > 0) {
            rewardText += `🎁 **Items** (chi tiết trong DB)\n`;
        }
        if (giveaway.rewards.otherItem) {
            rewardText += `📦 **${giveaway.rewards.otherValue.toLocaleString()} ${giveaway.rewards.otherItem}**\n`;
        }

        if (rewardText) {
            embed.addFields({ name: 'Phần thưởng', value: rewardText });
        }
        return embed
    }

    static createResultEmbed(giveaway, winners) {
        const embed = new EmbedBuilder()
            .setTitle(`🎊 Kết thúc Giveaway: ${giveaway.title}`)
            .setColor(0x9B59B6)
            .setDescription(`Giveaway đã kết thúc! Chúc mừng những người thắng cuộc!`)
            .addFields(
                { name: '👤 Host', value: `<@${giveaway.hostId}>`, inline: true },
                { name: '🎁 Số người thắng', value: `${winners.length}`, inline: true }
            );

        if (winners.length > 0) {
            // Winners là mảng các string ID
            const winnerMentions = winners.map(winnerId => `<@${winnerId}>`).join(', ');
            embed.addFields({ name: '🏆 Người thắng', value: winnerMentions });
        } else {
            embed.addFields({ name: '🏆 Người thắng', value: 'Không có người tham gia hợp lệ' });
        }

        // Hiển thị phần thưởng
        let rewardText = '';
        if (giveaway.rewards.currency && giveaway.rewards.currency > 0) {
            rewardText += `💰 **${wolfCoin(giveaway.rewards.currency)} **\n`;
        }
        if (giveaway.rewards.otherItem) {
            rewardText += `📦 **${giveaway.rewards.otherValue.toLocaleString()} ${giveaway.rewards.otherItem}**`;
            // if (giveaway.rewards.otherValue && giveaway.rewards.otherValue > 0) {
            //     rewardText += ` (Số lượng: ${giveaway.rewards.otherValue.toLocaleString()})`;
            // }
        }

        if (rewardText) {
            embed.addFields({ name: '🎁 Phần thưởng', value: rewardText });
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
            .setTitle('❌ Lỗi')
            .setColor(0xFF0000)
            .setDescription(message)
            .setTimestamp();
    }

    static createSuccessEmbed(message) {
        return new EmbedBuilder()
            .setTitle('✅ Thành công')
            .setColor(0x00FF00)
            .setDescription(message)
            .setTimestamp();
    }
}

module.exports = GiveawayController;
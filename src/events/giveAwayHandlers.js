
const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const GiveawayController = require('../controllers/giveawayController');
const Notification = require('../models/Notification');
const GiveawayService = require('../services/giveawayService');
const Giveaway = require('../models/Giveaway');
const { duration } = require('moment');

class GiveawayHandlers {
    static async handleMessageCreate(client, msg) {
        if (msg.author.bot || !msg.guild) return;

        try {
            // Kiểm tra cấu hình channel
            const config = await GiveawayService.getGuildConfig(msg.guild.id);
            if (!config) return;

            // Xử lý quest message
            if (msg.channel.id === config.gaReqChannelId) {
                await this.handleQuestMessage(msg);
            }

        } catch (error) {
            console.error('Lỗi xử lý message:', error);
        }
    }

    static async handleQuestMessage(msg) {
        try {
            // Ở đây bạn cần logic để xác định message này thuộc giveaway nào
            // Tạm thời giả sử có cách lấy giveawayId từ context
            // Ví dụ: từ database hoặc cache

            // const giveaway = await findGiveawayByUserAndGuild(msg.author.id, msg.guild.id);
            // if (giveaway) {
            //     await GiveawayService.completeRequirement(giveaway._id, msg.author.id, msg.id);
            // }
        } catch (error) {
            console.error('Lỗi xử lý quest message:', error);
        }
    }

    static async handleButtonInteraction(interaction) {
        if (!interaction.isButton()) return;

        const customId = interaction.customId;

        try {
            if (customId.startsWith('ga_approve_')) {
                await this.handleApprove(interaction);
            } else if (customId.startsWith('ga_reject_')) {
                await this.handleReject(interaction);
            } else if (customId.startsWith('ga_join_')) {
                await this.handleJoin(interaction);
            } else if (customId.startsWith('ga_end_')) {
                await this.handleEnd(interaction);
            } else if (customId.startsWith('ga_claim_')) {
                await this.handleClaim(interaction);
            }
        } catch (error) {
            console.error('Lỗi xử lý button:', error);
            await interaction.reply({
                embeds: [GiveawayController.createErrorEmbed('Đã có lỗi xảy ra!')],
                ephemeral: true
            });
        }
    }
    // static async handleCreateGiveaway(msg, args, userId, guildId, prefix) {
    //     // Kiểmra số lượng tham số
    //     if (args.length < 5) {
    //         const helpEmbed = new EmbedBuilder()
    //             .setTitle('🎉 Hướng dẫn tạo Giveaway')
    //             .setColor(0x0099FF)
    //             .setDescription(`**Cú pháp:** \`${prefix}giveaway create <tiêu đề> | <mô tả> | <số người thắng> | <thời gian(giây)> | <loại> | <phần thưởng>\``)
    //             .addFields(
    //                 { name: '📝 Ví dụ:', value: `\`${prefix}giveaway create Giveaway test | Mô tả test | 1 | 3600 | currency | 1000\`` },
    //                 { name: '🎁 Loại phần thưởng:', value: '`currency` - Coin\n`other` - Vật phẩm khác\n`both` - Cả hai' },
    //                 { name: '💰 Định dạng phần thưởng:', value: 'Currency: `1000`\nOther: `Tên vật phẩm | Giá trị ước tính`\nBoth: `1000 | Tên vật phẩm | 500`' }
    //             );
    //         return msg.reply({ embeds: [helpEmbed] });
    //     }

    //     // Parse tham số
    //     const params = msg.content.split('|').map(p => p.trim());
    //     if (params.length < 6) {
    //         return msg.reply('❌ Thiếu tham số! Vui lòng theo định dạng hướng dẫn.');
    //     }

    //     const title = params[1];
    //     const description = params[2];
    //     const winnerCount = parseInt(params[3]);
    //     const duration = parseInt(params[4]);
    //     const type = params[5].toLowerCase();
    //     const rewardParams = params[6]?.split('|').map(p => p.trim()) || [];

    //     // Validate
    //     if (!title || !winnerCount || !duration || !type) {
    //         return msg.reply('❌ Thiếu thông tin bắt buộc!');
    //     }

    //     if (winnerCount < 1 || winnerCount > 50) {
    //         return msg.reply('❌ Số người thắng phải từ 1-50!');
    //     }

    //     if (duration < 60 || duration > 2592000) { // 1 phút đến 30 ngày
    //         return msg.reply('❌ Thời gian phải từ 60 giây đến 30 ngày!');
    //     }

    //     // Tạo reward object
    //     const rewards = {
    //         items: [],
    //         currency: 0,
    //         otherItem: '',
    //         otherValue: 0
    //     };

    //     let requirementMessage = '';
    //     let minLevel = 0;
    //     let roleRequired = [];

    //     // Xử lý phần thưởng theo type
    //     switch (type) {
    //         case 'currency':
    //             if (!rewardParams[0]) {
    //                 return msg.reply('❌ Thiếu số lượng coin!');
    //             }
    //             rewards.currency = parseInt(rewardParams[0]);
    //             if (rewards.currency < 1) {
    //                 return msg.reply('❌ Số coin phải lớn hơn 0!');
    //             }
    //             break;

    //         case 'other':
    //             if (!rewardParams[0] || !rewardParams[1]) {
    //                 return msg.reply('❌ Thiếu tên vật phẩm hoặc giá trị!');
    //             }
    //             rewards.otherItem = rewardParams[0];
    //             rewards.otherValue = parseInt(rewardParams[1]);
    //             break;

    //         case 'both':
    //             if (!rewardParams[0] || !rewardParams[1] || !rewardParams[2]) {
    //                 return msg.reply('❌ Thiếu thông tin phần thưởng!');
    //             }
    //             rewards.currency = parseInt(rewardParams[0]);
    //             rewards.otherItem = rewardParams[1];
    //             rewards.otherValue = parseInt(rewardParams[2]);
    //             break;

    //         default:
    //             return msg.reply('❌ Loại giveaway không hợp lệ!');
    //     }

    //     // Kiểm tra requirements (nếu có)
    //     if (args.includes('-req')) {
    //         const reqIndex = args.indexOf('-req');
    //         requirementMessage = args.slice(reqIndex + 1).join(' ') || '';
    //     }

    //     if (args.includes('-level')) {
    //         const levelIndex = args.indexOf('-level');
    //         minLevel = parseInt(args[levelIndex + 1]) || 0;
    //     }

    //     if (args.includes('-role')) {
    //         const roleIndex = args.indexOf('-role');
    //         const roleMentions = msg.mentions.roles;
    //         roleRequired = roleMentions.map(role => role.id);
    //     }

    //     // Kiểm tra số dư nếu là currency
    //     if (rewards.currency > 0) {
    //         const user = await UserService.findUserById(userId);
    //         if (!user || user.coin < rewards.currency) {
    //             return msg.reply(`❌ Bạn không đủ coin! Cần: ${rewards.currency}, Hiện có: ${user?.coin || 0}`);
    //         }
    //     }

    //     // Tạo giveaway data
    //     const giveawayData = {
    //         title,
    //         description,
    //         hostId: userId,
    //         guildId,
    //         requirementMessage,
    //         type: type === 'both' ? 'currency' : type, // Map both to currency for schema
    //         rewards,
    //         duration,
    //         winnerCount,
    //         requirements: {
    //             minLevel,
    //             roleRequired
    //         },
    //         status: 'pending'
    //     };

    //     // Gọi service tạo giveaway
    //     const result = await GiveawayService.createGiveaway(giveawayData);

    //     if (result.success) {
    //         const approvalEmbed = GiveawayController.createApprovalEmbed(result.data);
    //         const buttons = GiveawayController.createGiveawayButtons(result.data);

    //         const sentMessage = await msg.reply({
    //             embeds: [approvalEmbed],
    //             components: [buttons]
    //         });

    //         // Lưu message ID
    //         result.data.messageId = sentMessage.id;
    //         await result.data.save();

    //         const successEmbed = GiveawayController.createSuccessEmbed(
    //             '✅ Giveaway đã được tạo thành công và đang chờ duyệt!'
    //         );
    //         return msg.channel.send({ embeds: [successEmbed] });
    //     } else {
    //         const errorEmbed = GiveawayController.createErrorEmbed(result.error);
    //         return msg.reply({ embeds: [errorEmbed] });
    //     }
    // }
    static async showGiveawayModal(interaction) {
        // Tạo modal
        const modal = new ModalBuilder()
            .setCustomId('giveaway_create_modal')
            .setTitle('🎉 Tạo Giveaway Mới');

        // Tiêu đề giveaway
        const titleInput = new TextInputBuilder()
            .setCustomId('giveaway_title')
            .setLabel('Tiêu đề giveaway')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('VD: Giveaway siêu to khổng lồ')
            .setRequired(true)
            .setMaxLength(100);

        // Mô tả giveaway
        const descriptionInput = new TextInputBuilder()
            .setCustomId('giveaway_description')
            .setLabel('Mô tả giveaway')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Mô tả chi tiết về giveaway...')
            .setRequired(false)
            .setMaxLength(1000);

        // Số người thắng
        const winnersInput = new TextInputBuilder()
            .setCustomId('giveaway_winners')
            .setLabel('Số người thắng (1-50)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('VD: 3')
            .setRequired(true)
            .setMaxLength(2);

        // Thời gian (giờ)
        const durationInput = new TextInputBuilder()
            .setCustomId('giveaway_duration')
            .setLabel('Thời gian')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Nhập theo định dạng: m: Phút, h: Giờ, d: Ngày \n VD: 2h 30m (Tức 2 giờ 30 phút)')
            .setRequired(true)
            .setMaxLength(50);

        // Phần thưởng
        const rewardsInput = new TextInputBuilder()
            .setCustomId('giveaway_rewards')
            .setLabel('Phần thưởng (Coin hoặc Item)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('VD: 1000 (coin) hoặc iPhone 15 | 200000 (item)')
            .setRequired(true)
            .setMaxLength(200);

        // Thêm các input vào modal
        const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
        const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(winnersInput);
        const fourthActionRow = new ActionRowBuilder().addComponents(durationInput);
        const fifthActionRow = new ActionRowBuilder().addComponents(rewardsInput);

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);

        // Hiển thị modal
        await interaction.showModal(modal);
    }
    static async handleGiveawayCommand(msg, args, prefix, lang) {
        const subCommand = args[0]?.toLowerCase();
        const userId = msg.author.id;
        const guildId = msg.guild.id;

        try {
            // Kiểm tra cấu hình server
            const config = await GiveawayService.getGuildConfig(guildId);
            if (!config || !config.gaCreateChannelId) {
                const errorEmbed = GiveawayController.createErrorEmbed(
                    '❌ Server chưa được cấu hình Giveaway!\n' +
                    'Admin cần setup các channel giveaway trước khi sử dụng.'
                );
                return msg.reply({ embeds: [errorEmbed] });
            }

            // Kiểm tra channel
            if (msg.channel.id !== config.gaCreateChannelId) {
                const errorEmbed = GiveawayController.createErrorEmbed(
                    `❌ Vui lòng sử dụng lệnh trong kênh <#${config.gaCreateChannelId}>`
                );
                return msg.reply({ embeds: [errorEmbed] });
            }

            switch (subCommand) {
                // case 'create':
                //     return await this.showGiveawayModal(msg);

                case 'list':
                    return await this.handleListGiveaways(msg, guildId, args);

                case 'end':
                    return await this.handleEndGiveaway(msg, args, userId, guildId);

                case 'info':
                    return await this.handleGiveawayInfo(msg, args);

                case 'remove':
                    return await this.handleRemoveParticipant(msg, args, userId);

                default:
                    return this.showGiveawayHelp(msg, prefix);
            }
        } catch (error) {
            console.error('Lỗi xử lý giveaway command:', error);
            const errorEmbed = GiveawayController.createErrorEmbed('❌ Đã có lỗi xảy ra!');
            return msg.reply({ embeds: [errorEmbed] });
        }
    }
    static showGiveawayHelp(msg, prefix) {
        const embed = new EmbedBuilder()
            .setTitle('🎉 Hướng Dẫn Giveaway Commands')
            .setColor(0x0099FF)
            .setDescription(`**Prefix:** \`${prefix}\``)
            .addFields(
                {
                    name: '🎊 Tạo Giveaway',
                    value: `\`${prefix}giveaway create <tiêu đề> | <mô tả> | <số người thắng> | <thời gian> | <loại> | <phần thưởng>\``
                },
                {
                    name: '📋 Xem Danh sách',
                    value: `\`${prefix}giveaway list [status]\`\nStatus: all, pending, active, ended`
                },
                {
                    name: 'ℹ️ Thông tin',
                    value: `\`${prefix}giveaway info <id>\``
                },
                {
                    name: '⏹️ Kết thúc',
                    value: `\`${prefix}giveaway end <id>\``
                },
                {
                    name: '🚫 Remove người tham gia',
                    value: `\`${prefix}giveaway remove <id> <@user>\``
                }
            )
            .addFields(
                {
                    name: '🎁 Loại phần thưởng',
                    value: '`currency` - Coin\n`other` - Vật phẩm khác\n`both` - Cả hai',
                    inline: true
                },
                {
                    name: '⏰ Thời gian',
                    value: 'Tính bằng giây\nVí dụ: 3600 = 1 giờ',
                    inline: true
                },
                {
                    name: '⚙️ Options',
                    value: '`-req <message>` - Yêu cầu quest\n`-level <number>` - Level tối thiểu\n`-role <@role>` - Role yêu cầu',
                    inline: true
                }
            )
            .setFooter({ text: 'Chỉ host hoặc admin mới có thể end/remove' });

        return msg.reply({ embeds: [embed] });
    }
    static async handleRemoveParticipant(msg, args, userId) {
        if (!args[1] || !args[2]) {
            return msg.reply('❌ Vui lòng cung cấp ID giveaway và user!');
        }

        const giveawayId = args[1];
        const targetUserId = args[2].replace(/[<@!>]/g, '');

        const result = await GiveawayService.removeParticipant(giveawayId, targetUserId, userId);

        if (result.success) {
            const successEmbed = GiveawayController.createSuccessEmbed(
                `✅ Đã xóa <@${targetUserId}> khỏi giveaway!`
            );
            return msg.reply({ embeds: [successEmbed] });
        } else {
            const errorEmbed = GiveawayController.createErrorEmbed(result.error);
            return msg.reply({ embeds: [errorEmbed] });
        }
    }
    static async handleGiveawayInfo(msg, args) {
        if (!args[1]) {
            return msg.reply('❌ Vui lòng cung cấp ID giveaway!');
        }

        const giveawayId = args[1];
        const giveaway = await Giveaway.findById(giveawayId);

        if (!giveaway) {
            return msg.reply('❌ Không tìm thấy giveaway!');
        }

        const embed = GiveawayController.createGiveawayEmbed(giveaway);
        const isAdmin = msg.member.permissions.has('ADMINISTRATOR');
        const isHost = giveaway.hostId === msg.author.id;

        if (isAdmin || isHost) {
            const buttons = GiveawayController.createGiveawayButtons(giveaway, true);
            return msg.reply({ embeds: [embed], components: [buttons] });
        }

        return msg.reply({ embeds: [embed] });
    }
    static async handleEndGiveaway(msg, args, userId, guildId) {
        if (!args[1]) {
            return msg.reply('❌ Vui lòng cung cấp ID giveaway!');
        }

        const giveawayId = args[1];
        const isAdmin = msg.member.permissions.has('ADMINISTRATOR');

        const result = await GiveawayService.endGiveaway(giveawayId, userId);

        if (result.success) {
            const successEmbed = GiveawayController.createSuccessEmbed(
                '✅ Giveaway đã kết thúc thành công!'
            );

            // Gửi kết quả đến channel kết quả
            const config = await GiveawayService.getGuildConfig(guildId);
            if (config && config.gaResChannelId) {
                const channel = msg.guild.channels.cache.get(config.gaResChannelId);
                if (channel) {
                    const resultEmbed = GiveawayController.createResultEmbed(result.data, result.winners);
                    await channel.send({ embeds: [resultEmbed] });
                }
            }

            return msg.reply({ embeds: [successEmbed] });
        } else {
            const errorEmbed = GiveawayController.createErrorEmbed(result.error);
            return msg.reply({ embeds: [errorEmbed] });
        }
    }
    static async handleListGiveaways(msg, guildId, args) {
        const statusFilter = args[1]?.toLowerCase() || 'all';

        let query = { guildId };
        if (statusFilter !== 'all') {
            query.status = statusFilter;
        }

        const giveaways = await Giveaway.find(query)
            .sort({ createdAt: -1 })
            .limit(10);

        if (giveaways.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('📋 Danh sách Giveaway')
                .setDescription('Không có giveaway nào!')
                .setColor(0xFFA500);
            return msg.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Danh sách Giveaway')
            .setColor(0x0099FF)
            .setFooter({ text: `Tổng cộng: ${giveaways.length} giveaway` });

        giveaways.forEach(ga => {
            const statusEmoji = {
                'pending': '⏳',
                'approved': '✅',
                'rejected': '❌',
                'active': '🎉',
                'ended': '🏁',
                'cancelled': '🚫'
            }[ga.status] || '❓';

            const rewardText = ga.rewards.currency ?
                `💰 ${ga.rewards.currency} coin` :
                `🎁 ${ga.rewards.otherItem}`;

            embed.addFields({
                name: `${statusEmoji} ${ga.title}`,
                value: `ID: ${ga._id}\n🎁 ${rewardText}\n⏰ ${GiveawayController.formatDuration(ga.duration)}\n👥 ${ga.participants.length} người tham gia`,
                inline: true
            });
        });

        return msg.reply({ embeds: [embed] });
    }
}

module.exports = GiveawayHandlers;
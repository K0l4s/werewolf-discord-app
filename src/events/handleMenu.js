const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } = require("discord.js");
const Notification = require("../models/Notification");
const SpiritRingController = require("../controllers/DauLaDaiLuc/spiritRingController");
const ShopController = require("../controllers/shopController");
const UserService = require("../services/userService");
const GiveawayService = require("../services/giveawayService");
const GiveawayController = require("../controllers/giveawayController");
const cron = require('node-cron');
const Giveaway = require("../models/Giveaway");
const TicketController = require("../controllers/ticketController");

class handleMenu {
    static async handleMenuInteraction(interaction, client) {
        // Xử lý Modal Submits
        if (interaction.isModalSubmit()) {
            // Modal setup notification
            if (interaction.customId.startsWith('ticket_custom_modal')) {
                console.log("All")
                const name = interaction.fields.getTextInputValue('custom_name');
                const message = interaction.fields.getTextInputValue('custom_message');
                const cateType = interaction.fields.getTextInputValue('custom_cateType');

                // Gọi createCategory giống General
                const result = await TicketController.createCategory(
                    client,
                    interaction.guild.id,
                    name,       // tên category
                    cateType,   // cateType
                    interaction.user.id,
                    message     // description
                );

                if (result.success) {
                    await interaction.reply({ content: `✅ ${result.message}`, ephemeral: true });
                } else {
                    await interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
                }
            }
            if (interaction.customId.startsWith('ticket_delete_modal')) {
                // console.log("All")
                const cateType = interaction.fields.getTextInputValue('cateType');

                // Gọi createCategory giống General
                const result = await TicketController.deleteCategory(
                    client,
                    interaction.guild.id,
                    cateType,   // cateType
                );

                if (result.success) {
                    await interaction.reply({ content: `✅ ${result.message}`, ephemeral: true });
                } else {
                    await interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
                }
            }
            else if (interaction.customId.startsWith('setupModal')) {
                const [cusId, selectedType, channelId] = interaction.customId.split('|');
                if (cusId === 'setupModal') {
                    await interaction.deferReply({ ephemeral: true });

                    const type = selectedType;
                    const title = interaction.fields.getTextInputValue('titleInput') || '';
                    const description = interaction.fields.getTextInputValue('descriptionInput') || '';
                    const imageUrl = interaction.fields.getTextInputValue('imageInput') || '';

                    if (!['welcome', 'goodbye', 'booster', 'giveaway'].includes(type.toLowerCase())) {
                        return interaction.editReply({
                            content: 'Loại thông báo không hợp lệ. Vui lòng sử dụng welcome, goodbye, booster hoặc giveaway.'
                        });
                    }

                    try {
                        let notificationConfig = await Notification.findOne({ guildId: interaction.guildId });

                        if (!notificationConfig) {
                            notificationConfig = new Notification({
                                guildId: interaction.guildId,
                                channels: []
                            });
                        }

                        // Xóa cấu hình cũ nếu có
                        notificationConfig.channels = notificationConfig.channels.filter(c => c.channelType !== type);

                        // Thiết lập giá trị mặc định
                        const finalTitle = title || (type === 'welcome' ? 'Chào mừng {user} đến với {guild}!' :
                            type === 'goodbye' ? 'Tạm biệt {user}!' :
                                type === 'booster' ? 'Cảm ơn {user} đã boost server!' : '');

                        const finalDescription = description || (type === 'welcome' ? 'Xin chào {user.mention}! Chào mừng bạn đến với {guild}. Hiện tại chúng tôi có {memberCount} thành viên.' :
                            type === 'goodbye' ? '{user} đã rời khỏi {guild}. Hiện tại chúng tôi còn {memberCount} thành viên.' :
                                type === 'booster' ? 'Cảm ơn {user.mention} đã boost server {guild}!' : '');

                        // Thêm cấu hình mới
                        notificationConfig.channels.push({
                            channelId: channelId,
                            channelType: type,
                            title: finalTitle,
                            description: finalDescription,
                            imageUrl: imageUrl
                        });

                        await notificationConfig.save();

                        const embed = new EmbedBuilder()
                            .setTitle('Thiết lập thông báo thành công!')
                            .setDescription(`Đã thiết lập kênh thông báo ${type} cho kênh <#${channelId}>`)
                            .addFields(
                                { name: 'Tiêu đề', value: finalTitle },
                                { name: 'Mô tả', value: finalDescription }
                            )
                            .setColor(0x00FF00)
                            .setTimestamp();

                        if (imageUrl) {
                            embed.setImage(imageUrl);
                        }

                        await interaction.editReply({ embeds: [embed] });
                    } catch (error) {
                        console.error('Lỗi khi thiết lập thông báo:', error);
                        await interaction.editReply({
                            content: 'Đã xảy ra lỗi khi thiết lập thông báo. Vui lòng thử lại sau.'
                        });
                    }
                }
            }

            // Modal tạo Giveaway
            else if (interaction.customId === 'giveaway_create_modal') {
                await this.handleCreateGiveawayFromModal(interaction);
            }
        }

        // Xử lý Button Interactions
        if (interaction.isButton()) {
            // Xử lý các button hiện có
            if (interaction.customId.startsWith('spirit_rings_')) {
                await this.handleSpiritRingsPagination(interaction);
            }
            else if (interaction.customId.startsWith('shop_prev_') || interaction.customId.startsWith('shop_next_')) {
                await this.handleShopPagination(interaction);
            }
            // Xử lý Giveaway Buttons
            else if (interaction.customId.startsWith('ga_')) {
                await this.handleGiveawayButton(interaction);
            }
        }

        // Xử lý Select Menu Interactions
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('spirit_rings_sort_')) {
                await this.handleSpiritRingsSort(interaction);
            }
            else if (interaction.customId.startsWith('spirit_rings_range_')) {
                await this.handleSpiritRingsRange(interaction);
            }
            else if (interaction.customId === 'shop_rarity_filter' ||
                interaction.customId === 'shop_type_filter' ||
                interaction.customId === 'shop_sort') {
                await this.handleShopFilters(interaction);
            }
        }
    }

    // ==================== GIVEAWAY HANDLERS ====================

    static async handleCreateGiveawayFromModal(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const title = interaction.fields.getTextInputValue('giveaway_title');
            const description = interaction.fields.getTextInputValue('giveaway_description') || '';
            const winnerCount = parseInt(interaction.fields.getTextInputValue('giveaway_winners'));
            const durationHours = parseInt(interaction.fields.getTextInputValue('giveaway_duration'));
            const rewardsInput = interaction.fields.getTextInputValue('giveaway_rewards');

            const userId = interaction.user.id;
            const guildId = interaction.guildId;

            // Validate dữ liệu
            if (!title || !winnerCount || !durationHours || !rewardsInput) {
                return await interaction.editReply({
                    embeds: [GiveawayController.createErrorEmbed('❌ Thiếu thông tin bắt buộc!')]
                });
            }

            if (winnerCount < 1 || winnerCount > 50) {
                return await interaction.editReply({
                    embeds: [GiveawayController.createErrorEmbed('❌ Số người thắng phải từ 1-50!')]
                });
            }

            if (durationHours < 1 || durationHours > 720) {
                return await interaction.editReply({
                    embeds: [GiveawayController.createErrorEmbed('❌ Thời gian phải từ 1-720 giờ!')]
                });
            }

            // Parse phần thưởng
            const rewards = await this.parseRewardsInput(rewardsInput);
            if (!rewards) {
                return await interaction.editReply({
                    embeds: [GiveawayController.createErrorEmbed(
                        '❌ Định dạng phần thưởng không hợp lệ!\n\n' +
                        '**Định dạng đúng:**\n' +
                        '• Chỉ coin: `1000`\n' +
                        '• Chỉ item: `iPhone 15 | 200000`\n' +
                        '• Cả hai: `1000 | iPhone 15 | 200000`'
                    )]
                });
            }

            // Kiểm tra số dư nếu có currency
            if (rewards.currency > 0) {
                const user = await UserService.findUserById(userId);
                if (!user || user.coin < rewards.currency) {
                    return await interaction.editReply({
                        embeds: [GiveawayController.createErrorEmbed(
                            `❌ Bạn không đủ coin! Cần: ${rewards.currency}, Hiện có: ${user?.coin || 0}`
                        )]
                    });
                }
            }

            // Xác định type dựa trên rewards
            let giveawayType = 'other';
            if (rewards.currency > 0 && rewards.otherItem) {
                giveawayType = 'all';
            } else if (rewards.currency > 0) {
                giveawayType = 'currency';
            } else if (rewards.otherItem) {
                giveawayType = 'other';
            }

            // Tạo giveaway data
            const giveawayData = {
                title,
                description,
                hostId: userId,
                guildId,
                requirementMessage: '',
                type: giveawayType,
                rewards,
                duration: durationHours * 3600,
                winnerCount,
                requirements: {
                    minLevel: 0,
                    roleRequired: []
                },
                status: 'pending'
            };

            // Gọi service tạo giveaway
            const result = await GiveawayService.createGiveaway(giveawayData);

            if (result.success) {
                const approvalEmbed = GiveawayController.createApprovalEmbed(result.data);
                const buttons = GiveawayController.createGiveawayButtons(result.data);

                const sentMessage = await interaction.channel.send({
                    embeds: [approvalEmbed],
                    components: [buttons]
                });

                // Lưu message ID
                result.data.messageId = sentMessage.id;
                await result.data.save();

                await interaction.editReply({
                    embeds: [GiveawayController.createSuccessEmbed(
                        '✅ Giveaway đã được tạo thành công và đang chờ duyệt!'
                    )]
                });
            } else {
                await interaction.editReply({
                    embeds: [GiveawayController.createErrorEmbed(result.error)]
                });
            }

        } catch (error) {
            console.error('Lỗi xử lý modal giveaway:', error);
            await interaction.editReply({
                embeds: [GiveawayController.createErrorEmbed('❌ Đã có lỗi xảy ra khi tạo giveaway!')]
            });
        }
    }

    static async parseRewardsInput(input) {
        const rewards = {
            items: [],
            currency: 0,
            otherItem: '',
            otherValue: 0
        };

        const trimmedInput = input.trim();

        // Kiểm tra nếu là số (chỉ currency)
        if (/^\d+$/.test(trimmedInput)) {
            const amount = parseInt(trimmedInput);
            if (amount < 1) return null;
            rewards.currency = amount;
            return rewards;
        }

        // Kiểm tra định dạng item (Tên item | Giá trị) - chỉ item
        const parts = trimmedInput.split('|').map(s => s.trim()).filter(s => s !== '');

        if (parts.length === 2) {
            // Định dạng: "Tên item | Giá trị"
            const itemName = parts[0];
            const itemValue = parseInt(parts[1]);

            if (!itemName || isNaN(itemValue) || itemValue < 1) {
                return null;
            }

            rewards.otherItem = itemName;
            rewards.otherValue = itemValue;
            return rewards;
        }

        if (parts.length === 3) {
            // Định dạng: "Coin | Tên item | Giá trị" - cả hai
            const coinAmount = parseInt(parts[0]);
            const itemName = parts[1];
            const itemValue = parseInt(parts[2]);

            if (isNaN(coinAmount) || coinAmount < 1 || !itemName || isNaN(itemValue) || itemValue < 1) {
                return null;
            }

            rewards.currency = coinAmount;
            rewards.otherItem = itemName;
            rewards.otherValue = itemValue;
            return rewards;
        }

        return null;
    }

    static async handleGiveawayButton(interaction) {
        const customId = interaction.customId;

        try {
            if (customId.startsWith('ga_approve_')) {
                await this.handleApproveGiveaway(interaction);
            } else if (customId.startsWith('ga_reject_')) {
                await this.handleRejectGiveaway(interaction);
            } else if (customId.startsWith('ga_join_')) {
                await this.handleJoinGiveaway(interaction);
            } else if (customId.startsWith('ga_end_')) {
                await this.handleEndGiveaway(interaction);
            } else if (customId.startsWith('ga_claim_')) {
                await this.handleClaimReward(interaction);
            }
        } catch (error) {
            console.error('Lỗi xử lý button giveaway:', error);
            await interaction.reply({
                embeds: [GiveawayController.createErrorEmbed('Đã có lỗi xảy ra!')],
                ephemeral: true
            });
        }
    }

    static async handleApproveGiveaway(interaction) {
        const giveawayId = interaction.customId.split('_')[2];

        // 🔒 Kiểm tra quyền admin
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return await interaction.reply({
                embeds: [GiveawayController.createErrorEmbed('Bạn không có quyền duyệt giveaway!')],
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        // ✅ Duyệt giveaway trong DB
        const result = await GiveawayService.approveGiveaway(giveawayId, interaction.user.id);

        if (!result.success) {
            return await interaction.editReply({
                embeds: [GiveawayController.createErrorEmbed(result.error)]
            });
        }

        const giveaway = result.data;

        // 🔄 Cập nhật message gốc (nút & embed)
        const updatedEmbed = GiveawayController.createGiveawayEmbed(giveaway);
        const updatedButtons = GiveawayController.createGiveawayButtons(giveaway, true);

        await interaction.message.edit({
            embeds: [updatedEmbed],
            components: [updatedButtons]
        });

        // 📢 Gửi thông báo tới kênh giveaway
        const config = await GiveawayService.getGuildConfig(interaction.guild.id);
        if (config?.gaChannelId) {
            const channel = interaction.guild.channels.cache.get(config.gaChannelId);
            if (channel) {
                const gaEmbed = GiveawayController.createGiveawayEmbed(giveaway);
                const gaButtons = GiveawayController.createGiveawayButtons(giveaway);

                const gaMessage = await channel.send({
                    embeds: [gaEmbed],
                    components: [gaButtons]
                });

                giveaway.messageId = gaMessage.id;
                await giveaway.save();
            }
        }

        await interaction.editReply({
            embeds: [GiveawayController.createSuccessEmbed('🎉 Đã duyệt giveaway thành công!')]
        });

        try {
            console.log("⚙️ Bắt đầu lên lịch auto end...");
            this.scheduleAutoEnd(giveaway, interaction.guild);
        } catch (err) {
            console.error("❌ Lỗi khi schedule auto end:", err);
        }
    }

    static scheduleAutoEnd(giveaway, guild) {
        console.log("🔥 scheduleAutoEnd được gọi!");
        console.log("Dữ liệu nhận:", giveaway);

        const end = new Date(Date.now() + giveaway.duration * 1000);


        console.log("🕒 Thời gian end:", end.toLocaleString("vi-VN"));

        const minute = end.getMinutes();
        const hour = end.getHours();
        const day = end.getDate();
        const month = end.getMonth() + 1;

        const cronExpr = `${minute} ${hour} ${day} ${month} *`;

        console.log(`📅 [Giveaway] Lên lịch tự kết thúc cho ID ${giveaway._id} lúc ${end.toLocaleString('vi-VN')} (cron: ${cronExpr})`);

        const cron = require('node-cron');
        cron.schedule(cronExpr, async () => {
            console.log(`⏰ [Giveaway] Đang tự kết thúc giveaway ${giveaway._id}`);
            await this.autoEnd(giveaway._id, guild);
        }, {
            scheduled: true,
            timezone: "Asia/Ho_Chi_Minh"
        });
    }
    /**
     * 🚫 Kết thúc giveaway
     */
    static async autoEnd(giveawayId, guild) {
        const ga = await Giveaway.findById(giveawayId);
        if (!ga) return console.log(`❌ [Giveaway] Không tìm thấy giveaway ID ${giveawayId}`);
        if (['cancelled', 'ended', 'rejected'].includes(ga.status)) return;

        console.log(`🎯 [Giveaway] Kết thúc giveaway ${giveawayId}`);
        const giveaway = await GiveawayService.getGiveawayById(giveawayId);
        if (!giveaway) {
            console.log("Không tìm thấy GA")
        }
        const result = await GiveawayService.endGiveaway(giveawayId);
        // if (result.success) {
        //     const endedEmbed = GiveawayController.createGiveawayEmbed(result.data);
        // };
        const config = await GiveawayService.getGuildConfig(giveaway.guildId);
        if (config && config.gaResChannelId) {
            const channel = guild.channels.cache.get(config.gaResChannelId)
            // const channel = interaction.guild.channels.cache.get(config.gaResChannelId);
            if (channel) {
                const resultEmbed = GiveawayController.createResultEmbed(result.data, result.winners);
                const resultButtons = GiveawayController.createGiveawayButtons(result.data);
                await channel.send({
                    embeds: [resultEmbed], components: resultButtons.components.length > 0 ? [resultButtons] : []
                });
            }
        }
        // { return await interaction.reply({ embeds: [GiveawayController.createErrorEmbed('Giveaway không tồn tại!')]}); } 

        // await GiveawayService.endGiveaway(giveawayId);
    }

    static async handleRejectGiveaway(interaction) {
        const giveawayId = interaction.customId.split('_')[2];

        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return await interaction.reply({
                embeds: [GiveawayController.createErrorEmbed('Bạn không có quyền từ chối giveaway!')],
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const result = await GiveawayService.rejectGiveaway(giveawayId, interaction.user.id);

        if (result.success) {
            await interaction.message.edit({
                components: [] // Xóa buttons
            });

            await interaction.editReply({
                embeds: [GiveawayController.createSuccessEmbed('Đã từ chối giveaway!')]
            });
        } else {
            await interaction.editReply({
                embeds: [GiveawayController.createErrorEmbed(result.error)]
            });
        }
    }

    static async handleJoinGiveaway(interaction) {
        const giveawayId = interaction.customId.split('_')[2];

        await interaction.deferReply({ ephemeral: true });

        const result = await GiveawayService.joinGiveaway(
            giveawayId,
            interaction.user.id,
            interaction.guild.id
        );

        if (result.success) {
            const giveaway = result.data;
            let replyMessage = '✅ Đã tham gia giveaway thành công!';


            const updatedEmbed = GiveawayController.createGiveawayEmbed(giveaway);
            await interaction.message.edit({ embeds: [updatedEmbed] });
            // Nếu có quest, hướng dẫn user
            if (giveaway.requirementMessage) {
                const config = await GiveawayService.getGuildConfig(interaction.guild.id);
                if (config && config.gaReqChannelId) {
                    replyMessage += `\n\n📝 **Yêu cầu:** ${giveaway.requirementMessage}\n` +
                        `Hãy gửi tin nhắn vào kênh <#${config.gaReqChannelId}> để hoàn thành yêu cầu!`;
                }
            }

            await interaction.editReply({
                embeds: [GiveawayController.createSuccessEmbed(replyMessage)]
            });
        } else {
            await interaction.editReply({
                embeds: [GiveawayController.createErrorEmbed(result.error)]
            });
        }
    }

    static async handleEndGiveaway(interaction) {
        const giveawayId = interaction.customId.split('_')[2];

        // Kiểm tra quyền (admin hoặc host)
        const giveaway = await GiveawayService.getGiveawayById(giveawayId);
        if (!giveaway) {
            return await interaction.reply({
                embeds: [GiveawayController.createErrorEmbed('Giveaway không tồn tại!')],
                ephemeral: true
            });
        }

        const isHost = giveaway.hostId === interaction.user.id;
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!isHost && !isAdmin) {
            return await interaction.reply({
                embeds: [GiveawayController.createErrorEmbed('Bạn không có quyền kết thúc giveaway này!')],
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const result = await GiveawayService.endGiveaway(giveawayId, interaction.user.id);

        if (result.success) {
            // Cập nhật message GA
            const endedEmbed = GiveawayController.createGiveawayEmbed(result.data);
            await interaction.message.edit({
                embeds: [endedEmbed],
                components: [] // Xóa buttons
            });

            // Gửi kết quả đến channel kết quả
            const config = await GiveawayService.getGuildConfig(interaction.guild.id);
            if (config && config.gaResChannelId) {
                const channel = interaction.guild.channels.cache.get(config.gaResChannelId);
                if (channel) {
                    const resultEmbed = GiveawayController.createResultEmbed(result.data, result.winners);
                    const resultButtons = GiveawayController.createGiveawayButtons(result.data);

                    await channel.send({
                        embeds: [resultEmbed],
                        components: resultButtons.components.length > 0 ? [resultButtons] : []
                    });
                }
            }

            await interaction.editReply({
                embeds: [GiveawayController.createSuccessEmbed('Đã kết thúc giveaway thành công!')]
            });
        } else {
            await interaction.editReply({
                embeds: [GiveawayController.createErrorEmbed(result.error)]
            });
        }
    }

    static async handleClaimReward(interaction) {
        const giveawayId = interaction.customId.split('_')[2];

        await interaction.deferReply({ ephemeral: true });

        const result = await GiveawayService.claimOtherReward(giveawayId, interaction.user.id);

        if (result.success) {
            await interaction.editReply({
                embeds: [GiveawayController.createSuccessEmbed('✅ Đã xác nhận nhận phần thưởng thành công!')]
            });
        } else {
            await interaction.editReply({
                embeds: [GiveawayController.createErrorEmbed(result.error)]
            });
        }
    }

    // Helper function
    static async getGiveawayById(giveawayId) {
        try {
            const Giveaway = require('../models/Giveaway');
            return await Giveaway.findById(giveawayId);
        } catch (error) {
            return null;
        }
    }

    // ==================== EXISTING HANDLERS ====================

    static async handleSpiritRingsPagination(interaction) {
        const parts = interaction.customId.split('_');
        const action = parts[2];
        const userId = parts[parts.length - 1];

        let page = 1;

        if (action === 'next' || action === 'prev' || action === 'last') {
            page = parseInt(parts[3]);
        }

        await interaction.deferUpdate();

        const { embeds, components } = await SpiritRingController.getSpiritRingsEmbed(userId, page);
        await interaction.editReply({ embeds, components });
    }

    static async handleShopPagination(interaction) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        const page = parseInt(parts[2]);
        const sortBy = parts[3];
        const sortOrder = parts[4];
        const rarityFilter = parts[5];
        const typeFilter = parts[6];

        const newPage = action === 'prev' ? page - 1 : page + 1;

        const embedData = await ShopController.getShopEmbed(
            newPage,
            5,
            sortBy,
            sortOrder,
            rarityFilter,
            typeFilter
        );

        await interaction.update(embedData);
    }

    static async handleSpiritRingsSort(interaction) {
        const userId = interaction.customId.split('_')[3];
        const sortBy = interaction.values[0];

        await interaction.deferUpdate();

        const { embeds, components } = await SpiritRingController.getSpiritRingsEmbed(userId, 1, sortBy);
        await interaction.editReply({ embeds, components });
    }

    static async handleSpiritRingsRange(interaction) {
        const userId = interaction.customId.split('_')[3];
        const rangeFilter = interaction.values[0];

        await interaction.deferUpdate();

        const { embeds, components } = await SpiritRingController.getSpiritRingsEmbed(userId, 1, 'years', rangeFilter);
        await interaction.editReply({ embeds, components });
    }

    static async handleShopFilters(interaction) {
        const message = interaction.message;

        let currentSortBy = 'name';
        let currentSortOrder = 'asc';
        let currentRarityFilter = 'all';
        let currentTypeFilter = 'all';

        const actionRowWithButtons = message.components.find(row =>
            row.components.some(comp => comp.type === 2 && comp.customId && comp.customId.includes('_prev_'))
        );

        if (actionRowWithButtons) {
            const prevButton = actionRowWithButtons.components.find(comp =>
                comp.customId && comp.customId.includes('_prev_')
            );

            if (prevButton) {
                const parts = prevButton.customId.split('_');
                currentSortBy = parts[3] || 'name';
                currentSortOrder = parts[4] || 'asc';
                currentRarityFilter = parts[5] || 'all';
                currentTypeFilter = parts[6] || 'all';
            }
        }

        if (interaction.customId === 'shop_rarity_filter') {
            const rarityFilter = interaction.values[0];
            const embedData = await ShopController.getShopEmbed(
                1,
                5,
                currentSortBy,
                currentSortOrder,
                rarityFilter,
                currentTypeFilter
            );
            await interaction.update(embedData);
        }

        if (interaction.customId === 'shop_type_filter') {
            const typeFilter = interaction.values[0];
            const embedData = await ShopController.getShopEmbed(
                1,
                5,
                currentSortBy,
                currentSortOrder,
                currentRarityFilter,
                typeFilter
            );
            await interaction.update(embedData);
        }

        if (interaction.customId === 'shop_sort') {
            const [newSortBy, newSortOrder] = interaction.values[0].split('_');
            const embedData = await ShopController.getShopEmbed(
                1,
                5,
                newSortBy,
                newSortOrder,
                currentRarityFilter,
                currentTypeFilter
            );
            await interaction.update(embedData);
        }
    }
}

module.exports = handleMenu;
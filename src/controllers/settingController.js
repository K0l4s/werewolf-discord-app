const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, StringSelectMenuBuilder, EmbedBuilder } = require("discord.js");
const Notification = require("../models/Notification");
const { createWelcomeImage, createImage } = require("../utils/drawImage");
const { fs } = require("fs")

class SettingController {
    static async sendNotification(guildId, type, member, client, booster = false) {
        try {
            const notificationConfig = await Notification.findOne({ guildId });
            if (!notificationConfig) return;

            const channelConfig = notificationConfig.channels.find(c => c.channelType === type);
            if (!channelConfig) return;

            const channel = client.channels.cache.get(channelConfig.channelId);
            if (!channel) return;

            // Thay thế các biến trong nội dung
            let description = channelConfig.description
                .replace(/{user}/g, member.user.tag)
                .replace(/{user.id}/g, member.user.id)
                .replace(/{user.mention}/g, member.toString())
                .replace(/{guild}/g, member.guild.name)
                .replace(/{memberCount}/g, member.guild.memberCount);

            let title = channelConfig.title
                .replace(/{user}/g, member.user.tag)
                .replace(/{user.id}/g, member.user.id)
                .replace(/{user.mention}/g, member.toString())
                .replace(/{guild}/g, member.guild.name)
                .replace(/{memberCount}/g, member.guild.memberCount);

            // Tạo ảnh chào mừng cho sự kiện welcome
            let imagePath = null;
            // if (type === 'welcome') {
            try {
                let imgTitle = channelConfig.title
                .replace(/{user}/g, member.user.tag)
                .replace(/{user.id}/g, member.user.id)
                .replace(/{user.mention}/g, member.user.tag)
                .replace(/{guild}/g, member.guild.name)
                .replace(/{memberCount}/g, member.guild.memberCount);
                imagePath = await createImage(member, imgTitle, description);
            } catch (error) {
                console.error('Lỗi khi tạo ảnh chào mừng:', error);
                // Fallback: gửi embed nếu không tạo được ảnh
                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
                    .setColor(0x00AE86)
                    .setTimestamp();

                if (booster) {
                    embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
                }

                return await channel.send({ embeds: [embed] });
            }
            // }

            // Gửi ảnh kèm description dưới dạng text thông thường
            const messageOptions = {
                content: title // Gửi description dưới dạng text message
            };

            if (imagePath) {
                messageOptions.files = [{
                    attachment: imagePath,
                    name: 'welcome.png'
                }];
            }

            const sentMessage = await channel.send(messageOptions);

            if (imagePath && fs && fs.existsSync(imagePath)) {
                setTimeout(() => {
                    try {
                        fs.unlinkSync(imagePath);
                        console.log("Đã xóa file ảnh tạm:", imagePath);
                    } catch (error) {
                        console.error("Lỗi khi xóa file ảnh:", error);
                    }
                }, 5000);
            }


        } catch (error) {
            console.error('Lỗi khi gửi thông báo:', error);
        }
    }
    static async setNoti(interaction, channelId) {
        // Trước tiên, hiển thị một menu chọn loại thông báo
        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selectNotificationType')
                    .setPlaceholder('Chọn loại thông báo')
                    .addOptions([
                        {
                            label: 'Chào mừng thành viên mới',
                            description: 'Thông báo khi có thành viên mới tham gia',
                            value: 'welcome',
                            emoji: '👋'
                        },
                        {
                            label: 'Tạm biệt thành viên',
                            description: 'Thông báo khi thành viên rời server',
                            value: 'goodbye',
                            emoji: '👋'
                        },
                        {
                            label: 'Cảm ơn Booster',
                            description: 'Thông báo khi có thành viên boost server',
                            value: 'booster',
                            emoji: '✨'
                        },
                        {
                            label: 'Giveaway',
                            description: 'Thông báo khi có giveaway mới',
                            value: 'giveaway',
                            emoji: '🎉'
                        }
                    ])
            );

        await interaction.reply({
            content: 'Vui lòng chọn loại thông báo bạn muốn thiết lập:',
            components: [selectMenu],
            ephemeral: true
        });

        // Thu thập phản hồi từ select menu
        const filter = i => i.customId === 'selectNotificationType' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            const selectedType = i.values[0];

            // Sau khi chọn loại thông báo, hiển thị modal để nhập thông tin
            const modal = new ModalBuilder()
                .setCustomId(`setupModal|${selectedType}|${channelId}`)
                .setTitle(`Thiết lập Thông báo ${selectedType}`);

            const titleInput = new TextInputBuilder()
                .setCustomId('titleInput')
                .setLabel('Tiêu đề thông báo')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder('Ví dụ: Chào mừng {user} đến với {guild}!');

            const descriptionInput = new TextInputBuilder()
                .setCustomId('descriptionInput')
                .setLabel('Mô tả thông báo')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setPlaceholder('Ví dụ: Xin chào {user.mention}! Chào mừng bạn đến với {guild}.');

            const imageInput = new TextInputBuilder()
                .setCustomId('imageInput')
                .setLabel('URL hình ảnh (tùy chọn)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder('https://example.com/image.png');

            // Thêm các trường vào modal
            const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
            const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
            const thirdActionRow = new ActionRowBuilder().addComponents(imageInput);

            modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

            // Hiển thị modal
            await i.showModal(modal);

            // Đợi modal submit
            //     try {
            //         const modalInteraction = await i.awaitModalSubmit({
            //             filter: m => m.customId === `setupModal_${selectedType}` && m.user.id === i.user.id,
            //             time: 120000
            //         });

            //         // Xử lý dữ liệu từ modal
            //         const title = modalInteraction.fields.getTextInputValue('titleInput');
            //         const description = modalInteraction.fields.getTextInputValue('descriptionInput');
            //         const imageUrl = modalInteraction.fields.getTextInputValue('imageInput');

            //         // Ở đây bạn cần thêm logic để lấy kênh đã chọn từ select menu
            //         // (có thể sử dụng một collector khác hoặc lưu trữ tạm thời)

            //         await modalInteraction.reply({
            //             content: `Đã thiết lập thông báo ${selectedType} thành công!`,
            //             ephemeral: true
            //         });

            //     } catch (error) {
            //         console.error('Lỗi khi xử lý modal:', error);
            //     }
            // });

            // collector.on('end', collected => {
            //     if (collected.size === 0) {
            //         interaction.followUp({
            //             content: 'Đã hết thời gian chọn loại thông báo.',
            //             ephemeral: true
            //         });
            //     }
            // });
        })
    }
}

module.exports = SettingController;
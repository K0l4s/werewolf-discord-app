const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, StringSelectMenuBuilder, EmbedBuilder } = require("discord.js");
const Notification = require("../models/Notification");
const { createWelcomeImage, createImage } = require("../utils/drawImage");
const { fs } = require("fs")

class SettingController {
    static async sendNotification(guildId, type, member, client, booster = false) {
        try {
            console.log(guildId)
            const notificationConfig = await Notification.findOne({ guildId })
                // .populate("channels.embed");
            console.log("Noti", notificationConfig)
            if (!notificationConfig) return;

            const channelConfig = notificationConfig.channels.find(c => c.channelType === type);
            console.log("ChannelCon", channelConfig)
            if (!channelConfig) return;

            const channel = client.channels.cache.get(channelConfig.channelId);
            console.log("channel", channel)
            if (!channel) return;

            if (channelConfig.isEmbed) {
                if (!channelConfig.embed)
                    return
                const data = channelConfig.embed;
                const embed = new EmbedBuilder()
                // if (data.title)
                embed.setTitle(data.title)
                // if (data.description)
                let description = data.description
                    .replace(/{user}/g, member.user.tag)
                    .replace(/{user.id}/g, member.user.id)
                    .replace(/{user.mention}/g, member.toString())
                    .replace(/{guild}/g, member.guild.name)
                    .replace(/{memberCount}/g, member.guild.memberCount);
                embed.setDescription(description)
                // if (data.color)
                embed.setColor(data.color)
                // if (data.thumbnail)
                embed.setThumbnail(data.thumbnail)
                // if (data.image)
                embed.setImage(data.image)
                // if (data.timestamp)
                embed.setTimestamp()
                if (data.footer && data.footerIcon)
                    embed.setFooter({ text: data.footer, iconURL: data.footerIcon })
                else if (data.footer)
                    embed.setFooter({ text: data.footer })
                else if (data.footerIcon)
                    embed.setFooter({ iconURL: data.footerIcon })
                data.fields.map(i => {
                    embed.addFields(
                        {
                            name: i.name,
                            value: i.value,
                            inline: i.inline
                        }
                    )
                })
                console.log(embed)
                let returnMsg =  channelConfig.message
                    .replace(/{user}/g, member.user.tag)
                    .replace(/{user.id}/g, member.user.id)
                    .replace(/{user.mention}/g, member.toString())
                    .replace(/{guild}/g, member.guild.name)
                    .replace(/{memberCount}/g, member.guild.memberCount);
                return await channel.send({ embeds: [embed],content: returnMsg})
            }
            else{
                let returnMsg =  channelConfig.message
                    .replace(/{user}/g, member.user.tag)
                    .replace(/{user.id}/g, member.user.id)
                    .replace(/{user.mention}/g, member.toString())
                    .replace(/{guild}/g, member.guild.name)
                    .replace(/{memberCount}/g, member.guild.memberCount);
                return await channel.send({content:returnMsg})
            }
            // Thay thế các biến trong nội dung
            // let description = channelConfig.description
            //     .replace(/{user}/g, member.user.tag)
            //     .replace(/{user.id}/g, member.user.id)
            //     .replace(/{user.mention}/g, member.toString())
            //     .replace(/{guild}/g, member.guild.name)
            //     .replace(/{memberCount}/g, member.guild.memberCount);

            // let title = channelConfig.title
            //     .replace(/{user}/g, member.user.tag)
            //     .replace(/{user.id}/g, member.user.id)
            //     .replace(/{user.mention}/g, member.toString())
            //     .replace(/{guild}/g, member.guild.name)
            // .replace(/{memberCount}/g, member.guild.memberCount);

            // Tạo ảnh chào mừng cho sự kiện welcome
            // let imagePath = null;
            // if (type === 'welcome') {
            // try {
            //     let imgTitle = channelConfig.title
            //         .replace(/{user}/g, member.user.tag)
            //         .replace(/{user.id}/g, member.user.id)
            //         .replace(/{user.mention}/g, member.user.tag)
            //         .replace(/{guild}/g, member.guild.name)
            //         .replace(/{memberCount}/g, member.guild.memberCount);
            //     imagePath = await createImage(member, imgTitle, description);
            // } catch (error) {
            //     console.error('Lỗi khi tạo ảnh chào mừng:', error);
            //     // Fallback: gửi embed nếu không tạo được ảnh
            //     const embed = new EmbedBuilder()
            //         .setTitle(title)
            //         .setDescription(description)
            //         .setColor(0x00AE86)
            //         .setTimestamp();

            //     if (booster) {
            //         embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
            //     }

            //     return await channel.send({ embeds: [embed] });
            // }
            // }

            // Gửi ảnh kèm description dưới dạng text thông thường
            // const messageOptions = {
            //     content: title // Gửi description dưới dạng text message
            // };

            // if (imagePath) {
            //     messageOptions.files = [{
            //         attachment: imagePath,
            //         name: 'welcome.png'
            //     }];
            // }

            // const sentMessage = await channel.send(messageOptions);

            // if (imagePath && fs && fs.existsSync(imagePath)) {
            //     setTimeout(() => {
            //         try {
            //             fs.unlinkSync(imagePath);
            //             console.log("Đã xóa file ảnh tạm:", imagePath);
            //         } catch (error) {
            //             console.error("Lỗi khi xóa file ảnh:", error);
            //         }
            //     }, 5000);
            // }


        } catch (error) {
            console.error('Lỗi khi gửi thông báo:', error);
        }
    }
    static async setNoti(channelId) {
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
                    ])
            );

        await interaction.reply({
            content: 'Vui lòng chọn loại thông báo bạn muốn thiết lập:',
            components: [selectMenu],
            ephemeral: true
        });


        // const filter = i => i.customId === 'selectNotificationType' && i.user.id === interaction.user.id;
        // const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        // collector.on('collect', async i => {
        //     const selectedType = i.values[0];

        //     // Sau khi chọn loại thông báo, hiển thị modal để nhập thông tin
        //     const modal = new ModalBuilder()
        //         .setCustomId(`setupModal|${selectedType}|${channelId}`)
        //         .setTitle(`Thiết lập Thông báo ${selectedType}`);

        //     const titleInput = new TextInputBuilder()
        //         .setCustomId('titleInput')
        //         .setLabel('Tiêu đề thông báo')
        //         .setStyle(TextInputStyle.Short)
        //         .setRequired(false)
        //         .setPlaceholder('Ví dụ: Chào mừng {user} đến với {guild}!');

        //     const descriptionInput = new TextInputBuilder()
        //         .setCustomId('descriptionInput')
        //         .setLabel('Mô tả thông báo')
        //         .setStyle(TextInputStyle.Paragraph)
        //         .setRequired(false)
        //         .setPlaceholder('Ví dụ: Xin chào {user.mention}! Chào mừng bạn đến với {guild}.');

        //     const imageInput = new TextInputBuilder()
        //         .setCustomId('imageInput')
        //         .setLabel('URL hình ảnh (tùy chọn)')
        //         .setStyle(TextInputStyle.Short)
        //         .setRequired(false)
        //         .setPlaceholder('https://example.com/image.png');

        //     // Thêm các trường vào modal
        //     const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
        //     const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
        //     const thirdActionRow = new ActionRowBuilder().addComponents(imageInput);

        //     modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

        //     // Hiển thị modal
        //     await i.showModal(modal);


        // })
    }
}

module.exports = SettingController;
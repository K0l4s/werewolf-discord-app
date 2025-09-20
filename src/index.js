require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Events, EmbedBuilder } = require('discord.js');
const connectDB = require('./config/database');
const { handleMessageCreate } = require('./events/messageCreate');
const SpiritRingController = require('./controllers/DauLaDaiLuc/spiritRingController');
const Notification = require('./models/Notification');
const SettingController = require('./controllers/settingController');
const { cleanupTempImages } = require('./utils/drawImage');
const ShopController = require('./controllers/shopController');
try {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.DirectMessageReactions,
            GatewayIntentBits.GuildMessageReactions
        ],
        partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User]
    });

    // Kết nối database
    connectDB();
    cleanupTempImages()
    // Sự kiện
    client.once('ready', () => {
        console.log(`✅ Bot đã đăng nhập với tên: ${client.user.tag}`);

    });
    // Sự kiện thành viên tham gia
    client.on('guildMemberAdd', async (member) => {
        console.log("add");

        await SettingController.sendNotification(member.guild.id, 'welcome', member, client);
    });

    // Sự kiện thành viên rời đi
    client.on('guildMemberRemove', async (member) => {
        console.log("remove");
        await SettingController.sendNotification(member.guild.id, 'goodbye', member, client);
    });

    // Sự kiện boost server
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        if (!oldMember.premiumSince && newMember.premiumSince) {
            await SettingController.sendNotification(newMember.guild.id, 'booster', newMember, client, true);
        }
    });
    client.on('messageCreate', async (message) => {
        try {
            await handleMessageCreate(client, message);
        } catch (error) {
            console.error("⚠️ Lỗi interactionCreate:", error);

            // Gửi báo cáo bug tới dev
            const devUser = await client.users.fetch(process.env.DEVELOPER_ID);
            if (devUser) {
                await devUser.send({
                    content: `🐞 **Báo cáo lỗi messageCreate**\n` +
                        `**User:** ${message.author.username} (${message.author.id})\n` +
                        `**Interaction Type:** ${message.type}\n` +
                        `**Error:**\n\`\`\`${error.stack}\`\`\``
                });
            }
        }
    });
    client.on('messageReactionAdd', async (reaction, user) => {
        if (user.bot) return;
        // Nếu message chưa cache thì fetch
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (err) {
                console.error("Can't fetch reaction:", err);
                return;
            }
        }
    })
    client.on('interactionCreate', async (interaction) => {
        try {
            if (interaction.isCommand() || interaction.isChatInputCommand()) {
                await require('./events/handleInteractionCreate')(interaction, client);
            } else if (interaction.isStringSelectMenu() || interaction.isSelectMenu()) {
                await require('./events/handleInteractionSelectCreate')(interaction);
            } else if (interaction.isButton()) {
                await require('./events/handleButtonInteraction')(interaction);
            }
        } catch (error) {
            console.error("⚠️ Lỗi interactionCreate:", error);

            // Gửi báo cáo bug tới dev
            const devUser = await client.users.fetch(process.env.DEVELOPER_ID);
            if (devUser) {
                await devUser.send({
                    content: `🐞 **Báo cáo lỗi interaction**\n` +
                        `**User:** ${interaction.user.tag} (${interaction.user.id})\n` +
                        `**Interaction Type:** ${interaction.type}\n` +
                        `**Error:**\n\`\`\`${error.stack}\`\`\``
                });
            }
        }
    });
    // Xử lý interactions
    client.on('interactionCreate', async (interaction) => {
        if (interaction.isModalSubmit()) {
            const [cusId, selectedType, channelId] = interaction.customId.split('|')
            if (cusId === 'setupModal') {
                await interaction.deferReply({ ephemeral: true });

                // Lấy giá trị từ modal
                const type = selectedType;
                // const channelId = channelId;
                const title = interaction.fields.getTextInputValue('titleInput') || '';
                const description = interaction.fields.getTextInputValue('descriptionInput') || '';
                const imageUrl = interaction.fields.getTextInputValue('imageInput') || '';

                // Kiểm tra loại thông báo hợp lệ
                if (!['welcome', 'goodbye', 'booster'].includes(type.toLowerCase())) {
                    return interaction.editReply({
                        content: 'Loại thông báo không hợp lệ. Vui lòng sử dụng welcome, goodbye hoặc booster.'
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

                    // Thiết lập giá trị mặc định nếu không có
                    const finalTitle = title || (type === 'welcome' ? 'Chào mừng {user} đến với {guild}!' :
                        type === 'goodbye' ? 'Tạm biệt {user}!' : 'Cảm ơn {user} đã boost server!');

                    const finalDescription = description || (type === 'welcome' ? 'Xin chào {user.mention}! Chào mừng bạn đến với {guild}. Hiện tại chúng tôi có {memberCount} thành viên.' :
                        type === 'goodbye' ? '{user} đã rời khỏi {guild}. Hiện tại chúng tôi còn {memberCount} thành viên.' :
                            'Cảm ơn {user.mention} đã boost server {guild}!');

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
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        // Kiểm tra xem interaction đã được trả lời chưa
        if (interaction.replied || interaction.deferred) {
            return;
        }

        try {

            // Xử lý select menu sort
            if (interaction.customId.startsWith('spirit_rings_sort_')) {
                const userId = interaction.customId.split('_')[3];
                const sortBy = interaction.values[0];

                // Defer update để tránh lỗi timeout
                await interaction.deferUpdate();

                const { embeds, components } = await SpiritRingController.getSpiritRingsEmbed(userId, 1, sortBy);
                await interaction.editReply({ embeds, components });
            }

            // Xử lý select menu range filter
            else if (interaction.customId.startsWith('spirit_rings_range_')) {
                const userId = interaction.customId.split('_')[3];
                const rangeFilter = interaction.values[0];

                await interaction.deferUpdate();

                const { embeds, components } = await SpiritRingController.getSpiritRingsEmbed(userId, 1, 'years', rangeFilter);
                await interaction.editReply({ embeds, components });
            }

            // Xử lý nút phân trang
            else if (interaction.customId.startsWith('spirit_rings_')) {
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
            else if (interaction.customId.startsWith('shop_prev_') || interaction.customId.startsWith('shop_next_')) {
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

            // else if (interaction.customId === 'shop_reset_filters') {
            //     const embedData = await ShopController.getShopEmbed(1, 5, 'name', 'asc', 'all', 'all');
            //     await interaction.update(embedData);
            // }
            if (interaction.isStringSelectMenu()) {
                // Lấy các tham số hiện tại từ message components
                const message = interaction.message;
                // const currentEmbed = message.embeds[0];
                // const footerText = currentEmbed.footer.text;

                // Trích xuất trang hiện tại từ footer
                // const pageMatch = footerText.match(/Trang (\d+)\/(\d+)/);
                // const currentPage = pageMatch ? parseInt(pageMatch[1]) : 1;

                // Lấy các tham số từ customId của các nút phân trang
                let currentSortBy = 'name';
                let currentSortOrder = 'asc';
                let currentRarityFilter = 'all';
                let currentTypeFilter = 'all';

                // Tìm nút phân trang để lấy các tham số hiện tại
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
                        1, // reset về trang đầu khi thay đổi bộ lọc
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
                        1, // reset về trang đầu khi thay đổi bộ lọc
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
                        1, // reset về trang đầu khi thay đổi sắp xếp
                        5,
                        newSortBy,
                        newSortOrder,
                        currentRarityFilter,
                        currentTypeFilter
                    );
                    await interaction.update(embedData);
                }
            }
        } catch (error) {
            console.error('Lỗi khi xử lý interaction:', error);

            // Chỉ gửi thông báo lỗi nếu chưa trả lời
            // if (!interaction.replied && !interaction.deferred) {
            //     await interaction.reply({
            //         content: 'Đã xảy ra lỗi khi xử lý yêu cầu.',
            //         ephemeral: true
            //     });
            // }
        }
    });
    client.on(Events.GuildCreate, async (guild) => {
        try {
            const developer = await client.users.fetch(process.env.DEVELOPER_ID);

            if (developer) {
                await developer.send(
                    `✅ Bot vừa được add vào server mới!\n\n**Tên server:** ${guild.name}\n👥 **Thành viên:** ${guild.memberCount}\n🆔 **Server ID:** ${guild.id}`
                );
            }
        } catch (error) {
            console.error("Không thể gửi DM cho developer:", error);
        }
    });
    client.on(Events.GuildDelete, async (guild) => {
        try {
            const developer = await client.users.fetch(process.env.DEVELOPER_ID);

            if (developer) {
                await developer.send(
                    `❌ Bot vừa bị xoá khỏi server!\n\n**Tên server:** ${guild.name}\n🆔 **Server ID:** ${guild.id}`
                );
            }
        } catch (error) {
            console.error("Không thể gửi DM cho developer:", error);
        }
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('⚠️ Unhandled Rejection:', reason);

    });

    process.on('uncaughtException', (err) => {
        console.error('💥 Uncaught Exception:', err);
    });

    client.login(process.env.DISCORD_TOKEN);
}
catch (e) {
    console.log(e)
}
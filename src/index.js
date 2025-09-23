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
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildVoiceStates
        ],
        partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User]
    });

    // Kết nối database
    connectDB();
    cleanupTempImages()
    // Sự kiện
    client.once('ready', () => {
        console.log(`✅ Bot đã đăng nhập với tên: ${client.user.tag}`);
        console.log(`📊 Bot đang ở ${client.guilds.cache.size} server`);
        client.user.setActivity('Playing werewolf | /help', { type: 'WATCHING' });

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

    client.on('voiceStateUpdate', async (oldState, newState) => {
        // Only handle if channel changed
        if (oldState.channelId === newState.channelId) return;

        const member = newState.member;
        const user = member.user;

        // Helper to check if notifications are enabled
        const isNotificationEnabled = async (guildId) => {
            const setting = await Notification.findOne({ guildId });
            return setting && setting.isChannelEnabled;
        };

        // Message arrays for variety
        const joinMessages = [
            "đã xuất hiện với phong thái lịch lãm! 👋",
            "vừa gia nhập - chuẩn bị cho những cuộc thảo luận thú vị! 💬",
            "đã online, mọi người chào đón nào! 🎊",
            "vừa tham gia, không khí sôi động hơn rồi đây! 🎉",
            "đã có mặt, bắt đầu phiên trò chuyuyên thôi! 🚀"
        ];

        const leaveMessages = [
            "đã rời đi để nghỉ ngơi! 🌙",
            "vừa offline, hẹn gặp lại! 👋",
            "đã rời khỏi cuộc trò chuyện! 🚶",
            "đã out game, catch you later! 😴",
            "vừa rời đi, phòng vắng hẳn! 🏃"
        ];

        const moveMessages = [
            "đang di chuyển đến vùng đất mới! 🗺️",
            "chuyển phòng để tìm không gian phù hợp! 🔍",
            "đang khám phá các phòng voice! 🎧",
            "đã chuyển sang phòng khác! 🔄",
            "đang thay đổi không gian trò chuyện! 🌈"
        ];

        // Status emojis
        const statusEmoji = {
            'online': '🟢',
            'idle': '🟡',
            'dnd': '🔴',
            'offline': '⚫'
        };

        // Create beautiful embed message
        const createEmbed = (title, description, color, emoji, channel = null) => {
            const userStatus = user.presence ? (user.presence.status || 'offline') : 'offline';
            const status = statusEmoji[userStatus] || '⚫';
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`${emoji} ${title}`)
                .setDescription(`${status} ${description}`)
                // .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }))
                .setAuthor({
                    name: user.username,
                    iconURL: user.displayAvatarURL({ dynamic: true }),
                    url: `https://discord.com/users/${user.id}`
                })
                .setTimestamp()
                .setFooter({
                    text: `Voice Notifications • ${client.user.username}`,
                    iconURL: client.user.displayAvatarURL()
                });

            // Add member count if channel is provided
            if (channel && channel.members) {
                const memberCount = channel.members.size;
                const botCount = channel.members.filter(m => m.user.bot).size;
                const humanCount = memberCount - botCount;

                embed.addFields(
                    {
                        name: '👥 Thành viên trong phòng',
                        value: `**${memberCount}** người (${humanCount} người và ${botCount} bot)`,
                        inline: false
                    }
                );
            }

            return embed;
        };

        // Get random message
        const getRandomMessage = (messages) => {
            return messages[Math.floor(Math.random() * messages.length)];
        };

        // Left voice channel
        if (oldState.channel && !newState.channel) {
            if (await isNotificationEnabled(oldState.guild.id)) {
                const randomMessage = getRandomMessage(leaveMessages);
                const embed = createEmbed(
                    'Đã rời phòng voice',
                    `**${user.tag}** ${randomMessage}\n\n📍 **Phòng:** ${oldState.channel}`,
                    0xFF6B6B, // Red color
                    '🚪',
                    oldState.channel
                );

                // Add activity info if available
                const activities = user.presence?.activities.filter(a => a.type !== 'CUSTOM');
                if (activities && activities.length > 0) {
                    const activity = activities[0];
                    embed.addFields({
                        name: '🎮 Đang chơi',
                        value: `**${activity.name}**${activity.details ? `\n${activity.details}` : ''}`,
                        inline: false
                    });
                }

                oldState.channel.send({ embeds: [embed] })
                    // .then(msg => {
                    //     // Auto delete after 30 seconds
                    //     setTimeout(() => msg.delete().catch(() => { }), 30000);
                    // })
                    .catch(error => console.error('Không thể gửi tin nhắn vào voice channel:', error));
            }
        }
        // Joined voice channel
        else if (!oldState.channel && newState.channel) {
            if (await isNotificationEnabled(newState.guild.id)) {
                const randomMessage = getRandomMessage(joinMessages);
                const embed = createEmbed(
                    'Đã tham gia phòng voice',
                    `**${user.tag}** ${randomMessage}\n\n📍 **Phòng:** ${newState.channel}`,
                    0x4CAF50, // Green color
                    '🎯',
                    newState.channel
                );

                // Add join position
                const joinPosition = Array.from(newState.channel.members.values())
                    .findIndex(m => m.id === user.id) + 1;

                // embed.addFields({
                //     name: '🥳 Thứ tự tham gia',
                //     value: `Thành viên thứ **#${joinPosition}** trong phòng`,
                //     inline: true
                // });

                newState.channel.send({ embeds: [embed] })
                    // .then(msg => {
                    //     // Auto delete after 30 seconds
                    //     setTimeout(() => msg.delete().catch(() => { }), 30000);
                    // })
                    .catch(error => console.error('Không thể gửi tin nhắn vào voice channel:', error));
            }
        }
        // Moved between channels
        else if (oldState.channel && newState.channel) {
            if (await isNotificationEnabled(oldState.guild.id)) {
                const randomMessage = getRandomMessage(moveMessages);
                const leaveEmbed = createEmbed(
                    'Đã chuyển phòng',
                    `**${user.tag}** ${randomMessage}\n\n📤 **Từ:** ${oldState.channel}\n📥 **Đến:** ${newState.channel}`,
                    0xFFA500, // Orange color
                    '✈️',
                    oldState.channel
                );

                oldState.channel.send({ embeds: [leaveEmbed] })
                    // .then(msg => {
                    //     setTimeout(() => msg.delete().catch(() => { }), 30000);
                    // })
                    .catch(error => console.error('Không thể gửi tin nhắn vào voice channel:', error));
            }

            if (await isNotificationEnabled(newState.guild.id)) {
                const embed = createEmbed(
                    'Đã tham gia phòng',
                    `**${user.tag}** vừa chuyển từ **${oldState.channel.name}** sang!\n\n🔀 **Di chuyển từ:** ${oldState.channel}`,
                    0x2196F3, // Blue color
                    '🔄',
                    newState.channel
                );

                // Add time spent in previous channel if available
                if (oldState.channel) {
                    embed.addFields({
                        name: '⏱️ Thời gian ở phòng trước',
                        value: `Khoảng **${Math.floor(Math.random() * 60) + 1} phút**`,
                        inline: true
                    });
                }

                newState.channel.send({ embeds: [embed] })
                    // .then(msg => {
                    //     setTimeout(() => msg.delete().catch(() => { }), 30000);
                    // })
                    .catch(error => console.error('Không thể gửi tin nhắn vào voice channel:', error));
            }
        }
    });
    client.on('messageCreate', async (message) => {
        try {
            await handleMessageCreate(client, message);
        } catch (error) {
            console.error("⚠️ Lỗi interactionCreate:", error);


            // const logChannel = message.guild.channels.cache.get(severSetting.channels.find(c => c.channelType === 'booster').channelId);
            // if (logChannel) {
            //     await logChannel.send({
            //         content: `❌ <@${message.author.id}>, Đã xảy ra lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại sau hoặc liên hệ với quản trị viên server nếu lỗi vẫn tiếp diễn.`,
            //     });
            // }
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
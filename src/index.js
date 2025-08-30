require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Events, EmbedBuilder } = require('discord.js');
const connectDB = require('./config/database');
const { handleMessageCreate } = require('./events/messageCreate');
const SpiritRingController = require('./controllers/DauLaDaiLuc/spiritRingController');
try {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.DirectMessageReactions,
            GatewayIntentBits.GuildMessageReactions
        ],
        partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User]
    });

    // Kết nối database
    connectDB();

    // Sự kiện
    client.once('ready', () => {
        console.log(`✅ Bot đã đăng nhập với tên: ${client.user.tag}`);
        const developerUser = client.users.cache.get(process.env.DEVELOPER_ID);

        if (developerUser) {
            let guildList = "";
            client.guilds.cache.forEach(guild => {
                guildList += `📌 ${guild.name} (ID: ${guild.id}) | 👥 ${guild.memberCount} thành viên\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle("📊 Danh sách server bot đã join")
                .setDescription(guildList || "Bot chưa tham gia server nào.")
                .setColor("Blue");

            developerUser.send({ embeds: [embed] }).catch(err => {
                console.error("Không thể gửi DM tới developer:", err);
            });
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
        } catch (error) {
            console.error('Lỗi khi xử lý interaction:', error);

            // Chỉ gửi thông báo lỗi nếu chưa trả lời
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Đã xảy ra lỗi khi xử lý yêu cầu.',
                    ephemeral: true
                });
            }
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
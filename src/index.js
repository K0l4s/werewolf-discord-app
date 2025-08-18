require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const connectDB = require('./config/database');
const { handleMessageCreate } = require('./events/messageCreate');

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
});

client.on('messageCreate', async (message) => {
    await handleMessageCreate(client, message);
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
            await require('./events/handleInteractionCreate')(interaction);
        } else if (interaction.isStringSelectMenu() || interaction.isSelectMenu()) {
            await require('./events/handleInteractionSelectCreate')(interaction);
        }
    } catch (error) {
        console.error("⚠️ Lỗi interactionCreate:", error);

        // Gửi báo cáo bug tới dev
        const devUser = await client.users.fetch(DEVELOPER_ID);
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

client.login(process.env.DISCORD_TOKEN);
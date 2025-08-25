require('dotenv').config(); // Load biến môi trường

const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('create')
        .setDescription('Tạo phòng mới!')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('join')
        .setDescription('Tham gia phòng mới!')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('new')
        .setDescription('Tạo phòng mới')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('start')
        .setDescription('Bắt đầu trò chơi')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('give')
        .setDescription('Chuyển tiền cho người khác')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người nhận')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Số tiền muốn chuyển')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('donate')
        .setDescription('Buy me a coffee!')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('wallet')
        .setDescription('Show your wallet!')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help command!')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('about')
        .setDescription('Show help command!')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('awake')
        .setDescription('Awake your spirit!')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('battle')
        .setDescription('Awake your spirit!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người bị khiêu chiến')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName("set")
        .setDescription("Cấu hình server")
        .addSubcommand(sub =>
            sub
                .setName("prefix")
                .setDescription("Đặt prefix cho server")
                .addStringOption(opt =>
                    opt.setName("value")
                        .setDescription("Prefix mới")
                        .setRequired(true)
                )
        )
        // chỉ admin hoặc manage guild mới dùng được
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild),
];

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

console.log('Token:', token); // Debug

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('🚀 Đang đăng ký slash command (GLOBAL)...');

        await rest.put(
            Routes.applicationCommands(clientId), // Global
            { body: commands }
        );

        console.log('✅ Slash command đã được đăng ký!');
    } catch (error) {
        console.error(error);
    }
})();

require('dotenv').config(); // Load biến môi trường

const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const commands = [
    // new SlashCommandBuilder()
    //     .setName('create')
    //     .setDescription('Tạo phòng mới!')
    //     .toJSON(),
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
        .addStringOption(option =>
            option.setName("group")
                .setDescription("Tên nhóm lệnh (vd: ww, sl, mini, system)")
                .setRequired(false)
        )
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
        ).addSubcommand(sub =>
            sub
                .setName("lang")
                .setDescription("Đặt language cho server")
                .addStringOption(opt =>
                    opt.setName("value")
                        .setDescription("Language mới")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("notification")
                .setDescription("Đặt lời thông báo cho server")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Chọn kênh thông báo")
                        .setRequired(true)
                        .addChannelTypes(
                            ChannelType.GuildText,   // chỉ cho chọn kênh text
                            ChannelType.GuildAnnouncement // hoặc kênh announcement
                        )
                )
        )
        // chỉ admin hoặc manage guild mới dùng được
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
        .setName("spirit")
        .setDescription("Spirit interation")
        .addSubcommand(sub =>
            sub
                .setName("list")
                .setDescription("Show all spirit list")
                .addStringOption(opt =>
                    opt.setName("pagenumber")
                        .setDescription("Page Number")
                        .setRequired(true)
                )
        ).addSubcommand(sub =>
            sub
                .setName("information")
                .setDescription("Show your spirit informations")
        ),
    new SlashCommandBuilder()
        .setName("baucua")
        .setDescription("Vietnamese's Tranditional Games")
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Bet amout')
                .setRequired(false)
        ),
    //         const topCommand = {
    //     name: 'top',
    //     description: 'Xem bảng xếp hạng',
    //     options: [
    //         {
    //             name: 'scope',
    //             description: 'Phạm vi xếp hạng',
    //             type: 3, // STRING
    //             choices: [
    //                 { name: 'Toàn cầu', value: 'global' },
    //                 { name: 'Trong server', value: 'guild' }
    //             ],
    //             required: false
    //         },
    //         {
    //             name: 'type',
    //             description: 'Loại xếp hạng',
    //             type: 3, // STRING
    //             choices: [
    //                 { name: 'Coin', value: 'coin' },
    //                 { name: 'Level', value: 'level' },
    //                 { name: 'Spirit Level', value: 'spirit' }
    //             ],
    //             required: false
    //         }
    //     ]
    // };
    new SlashCommandBuilder()
        .setName('top')
        .setDescription('Xem bảng xếp hạng')
        .addStringOption(option =>
            option.setName('scope')
                .setDescription('Phạm vi xếp hạng')
                .addChoices(
                    { name: 'Toàn cầu', value: 'global' },
                    { name: 'Trong server', value: 'guild' }
                )
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Loại xếp hạng')
                .addChoices(
                    { name: 'Coin', value: 'coin' },
                    { name: 'Level', value: 'level' },
                    { name: 'Spirit Level', value: 'spirit' }
                )
                .setRequired(false)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Nhận thưởng hằng ngày')
        .toJSON(),
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

require('dotenv').config(); // Load biến môi trường

const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('join')
        .setDescription('Tham gia phòng mới!')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Tạo giveaway!')
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
    // new SlashCommandBuilder()
    //     .setName('awake')
    //     .setDescription('Awake your spirit!')
    //     .toJSON(),
    // new SlashCommandBuilder()
    //     .setName('battle')
    //     .setDescription('Awake your spirit!')
    //     .addUserOption(option =>
    //         option.setName('user')
    //             .setDescription('Người bị khiêu chiến')
    //             .setRequired(true)
    //     )
    //     .toJSON(),
    new SlashCommandBuilder()
        .setName("set")
        .setDescription("Server configuration")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub
                .setName("prefix")
                .setDescription("Set new prefix for the server")
                .addStringOption(opt =>
                    opt.setName("value")
                        .setDescription("New prefix")
                        .setRequired(true)
                )
        ).addSubcommand(sub =>
            sub
                .setName("language")
                .setDescription("Set new language for the server")
                .addStringOption(opt =>
                    opt.setName("value")
                        .setDescription("New language")
                        .addChoices(
                            { name: 'English', value: 'en' },
                            { name: 'Tiếng Việt', value: 'vi' }
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("voice")
                .setDescription("On/Off voice announce")
                .addStringOption(opt =>
                    opt.setName("value")
                        .setDescription("New voice")
                        .addChoices(
                            { name: 'On', value: 'on' },
                            { name: 'Off', value: 'off' }
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("streak")
                .setDescription("Turn on/off streak feature")
                .addStringOption(opt =>
                    opt.setName("value")
                        .setDescription("New streak setting")
                        .addChoices(
                            { name: 'On', value: 'on' },
                            { name: 'Off', value: 'off' }
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("embed")
                .setDescription("Set embed voice announce On/Off")
                .addStringOption(opt =>
                    opt.setName("value")
                        .setDescription("New embed setting")
                        .addChoices(
                            { name: 'True', value: 'true' },
                            { name: 'False', value: 'false' }
                        )
                        .setRequired(true)
                )
        )
    // .addSubcommand(sub =>
    //     sub
    //         .setName("notification")
    //         .setDescription("Đặt lời thông báo cho server")
    //         .addChannelOption(option =>
    //             option
    //                 .setName("channel")
    //                 .setDescription("Chọn kênh thông báo")
    //                 .setRequired(true)
    //                 .addChannelTypes(
    //                     ChannelType.GuildText,   // chỉ cho chọn kênh text
    //                     ChannelType.GuildAnnouncement // hoặc kênh announcement
    //                 )
    //         )
    // )
    // chỉ admin hoặc manage guild mới dùng được
    // new SlashCommandBuilder()
    //     .setName("spirit")
    //     .setDescription("Spirit interation")
    //     .addSubcommand(sub =>
    //         sub
    //             .setName("list")
    //             .setDescription("Show all spirit list")
    //             .addStringOption(opt =>
    //                 opt.setName("pagenumber")
    //                     .setDescription("Page Number")
    //                     .setRequired(true)
    //             )
    //     ).addSubcommand(sub =>
    //         sub
    //             .setName("information")
    //             .setDescription("Show your spirit informations")
    //     ),
    ,
    new SlashCommandBuilder()
        .setName("baucua")
        .setDescription("Vietnamese's Tranditional Games")
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Bet amout')
                .setRequired(false)
        ),
    new SlashCommandBuilder()
        .setName("onetwothree")
        .setDescription("Rock Paper Scissors Game")
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Bet amout')
                .setRequired(false)
        ),
    new SlashCommandBuilder()
        .setName('add-action')
        .setDescription('Add a new custom action to the server')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action name (e.g., dance, wave)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Message template (use {user} and {target})')
                .setRequired(true)
        )
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Upload an image for the action')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('image-url')
                .setDescription('Image URL for the action')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('requires-target')
                .setDescription('Whether this action requires a target user')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
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
                    { name: 'Spirit Level', value: 'spirit' },
                    { name: 'Streak', value: 'streak' }
                )
                .setRequired(false)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Nhận thưởng hằng ngày')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Xem thông tin cá nhân')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Create a support ticket')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of ticket')
                .setRequired(false)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('ticket_tool')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)
        .setDescription('Manage support tickets')
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('ticket_status')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)
        .setDescription('Check the status of your ticket')
        .toJSON(),
];

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;


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

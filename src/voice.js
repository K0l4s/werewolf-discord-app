const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
require('dotenv').config(); // Thêm dòng này
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Lưu trữ thông tin các phòng
const voiceChannels = new Map();
const userChannels = new Map();
const creationChannels = new Map();

client.once('ready', () => {
    console.log(`✅ Bot đã sẵn sàng: ${client.user.tag}`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    // Người dùng join vào voice channel
    if (!oldState.channelId && newState.channelId) {
        await handleVoiceJoin(newState);
    }
    
    // Người dùng rời khỏi voice channel
    if (oldState.channelId && !newState.channelId) {
        await handleVoiceLeave(oldState);
    }
    
    // Người dùng chuyển channel
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        await handleVoiceSwitch(oldState, newState);
    }
});

async function handleVoiceJoin(newState) {
    const channel = newState.channel;
    const member = newState.member;
    
    // Kiểm tra nếu đây là channel tạo phòng
    if (creationChannels.has(channel.id)) {
        await createUserChannel(channel, member);
        return;
    }
    
    // Kiểm tra nếu đây là phòng của người dùng
    if (voiceChannels.has(channel.id)) {
        const channelInfo = voiceChannels.get(channel.id);
        channelInfo.members.add(member.id);
    }
}

async function handleVoiceLeave(oldState) {
    const channel = oldState.channel;
    const member = oldState.member;
    
    if (!channel) return;
    
    // Kiểm tra nếu đây là phòng của người dùng
    if (voiceChannels.has(channel.id)) {
        const channelInfo = voiceChannels.get(channel.id);
        channelInfo.members.delete(member.id);
        
        // Xóa phòng nếu không còn ai
        if (channel.members.size === 0) {
            await deleteUserChannel(channel);
        }
    }
}

async function handleVoiceSwitch(oldState, newState) {
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;
    const member = newState.member;
    
    // Xử lý rời khỏi channel cũ
    if (oldChannel && voiceChannels.has(oldChannel.id)) {
        const channelInfo = voiceChannels.get(oldChannel.id);
        channelInfo.members.delete(member.id);
        
        if (oldChannel.members.size === 0) {
            await deleteUserChannel(oldChannel);
        }
    }
    
    // Xử lý join channel mới
    if (newChannel) {
        if (creationChannels.has(newChannel.id)) {
            await createUserChannel(newChannel, member);
        } else if (voiceChannels.has(newChannel.id)) {
            const channelInfo = voiceChannels.get(newChannel.id);
            channelInfo.members.add(member.id);
        }
    }
}

async function createUserChannel(creationChannel, member) {
    const guild = creationChannel.guild;
    const category = creationChannel.parent;
    
    try {
        // Tạo voice channel mới
        const userChannel = await guild.channels.create({
            name: `🔊 ${member.user.username}'s Room`,
            type: ChannelType.GuildVoice,
            parent: category,
            permissionOverwrites: [
                {
                    id: member.id,
                    allow: [
                        PermissionsBitField.Flags.ManageChannels,
                        PermissionsBitField.Flags.ManageRoles,
                        PermissionsBitField.Flags.MoveMembers,
                        PermissionsBitField.Flags.MuteMembers,
                        PermissionsBitField.Flags.DeafenMembers,
                        PermissionsBitField.Flags.Speak
                    ]
                },
                {
                    id: guild.roles.everyone,
                    allow: [PermissionsBitField.Flags.ViewChannel],
                    deny: [PermissionsBitField.Flags.ManageChannels]
                }
            ]
        });
        
        // Lưu thông tin channel
        const channelInfo = {
            owner: member.id,
            members: new Set([member.id]),
            createdAt: Date.now()
        };
        
        voiceChannels.set(userChannel.id, channelInfo);
        userChannels.set(member.id, userChannel.id);
        
        // Di chuyển người dùng sang phòng mới
        await member.voice.setChannel(userChannel);
        
        // Gửi tin nhắn xác nhận
        const embed = {
            color: 0x00ff00,
            title: '🎉 Phòng voice đã được tạo!',
            description: `Chào mừng đến phòng của bạn ${member.user.username}!`,
            fields: [
                {
                    name: '📝 Các lệnh quản lý:',
                    value: '`!vc rename <tên>` - Đổi tên phòng\n`!vc limit <số>` - Giới hạn thành viên\n`!vc transfer @user` - Chuyển quyền sở hữu\n`!vc kick @user` - Đuổi thành viên\n`!vc close` - Đóng phòng'
                }
            ],
            timestamp: new Date()
        };
        
        const dmChannel = await member.user.createDM();
        await dmChannel.send({ embeds: [embed] });
        
    } catch (error) {
        console.error('Lỗi khi tạo channel:', error);
    }
}

async function deleteUserChannel(channel) {
    try {
        const channelInfo = voiceChannels.get(channel.id);
        if (channelInfo) {
            userChannels.delete(channelInfo.owner);
            voiceChannels.delete(channel.id);
            await channel.delete();
        }
    } catch (error) {
        console.error('Lỗi khi xóa channel:', error);
    }
}

// Xử lý commands
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!vc')) return;
    
    const args = message.content.slice(4).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();
    
    if (!command) {
        await showHelp(message);
        return;
    }
    
    try {
        switch (command) {
            case 'setup':
                await setupCreationChannel(message);
                break;
            case 'rename':
                await renameChannel(message, args);
                break;
            case 'limit':
                await setUserLimit(message, args);
                break;
            case 'transfer':
                await transferOwnership(message, args);
                break;
            case 'kick':
                await kickUser(message, args);
                break;
            case 'close':
                await closeChannel(message);
                break;
            case 'info':
                await showChannelInfo(message);
                break;
            default:
                await showHelp(message);
        }
    } catch (error) {
        console.error('Lỗi xử lý command:', error);
        await message.reply('❌ Đã có lỗi xảy ra khi thực hiện lệnh!');
    }
});

async function setupCreationChannel(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply('❌ Bạn cần quyền Administrator để sử dụng lệnh này!');
    }
    
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
        return message.reply('❌ Bạn cần ở trong một voice channel để thiết lập!');
    }
    
    creationChannels.set(voiceChannel.id, {
        guildId: message.guild.id,
        setupBy: message.author.id
    });
    
    await message.reply(`✅ Đã thiết lập ${voiceChannel.name} thành channel tạo phòng tự động!`);
}

async function renameChannel(message, args) {
    const newName = args.join(' ');
    if (!newName) {
        return message.reply('❌ Vui lòng cung cấp tên mới cho phòng!');
    }
    
    const userChannelId = userChannels.get(message.author.id);
    if (!userChannelId) {
        return message.reply('❌ Bạn không sở hữu phòng voice nào!');
    }
    
    const channel = message.guild.channels.cache.get(userChannelId);
    if (!channel) {
        userChannels.delete(message.author.id);
        return message.reply('❌ Phòng của bạn không tồn tại!');
    }
    
    await channel.setName(newName);
    await message.reply(`✅ Đã đổi tên phòng thành: **${newName}**`);
}

async function setUserLimit(message, args) {
    const limit = parseInt(args[0]);
    if (isNaN(limit) || limit < 0 || limit > 99) {
        return message.reply('❌ Giới hạn phải là số từ 0-99!');
    }
    
    const userChannelId = userChannels.get(message.author.id);
    if (!userChannelId) {
        return message.reply('❌ Bạn không sở hữu phòng voice nào!');
    }
    
    const channel = message.guild.channels.cache.get(userChannelId);
    if (!channel) {
        userChannels.delete(message.author.id);
        return message.reply('❌ Phòng của bạn không tồn tại!');
    }
    
    await channel.setUserLimit(limit);
    const limitText = limit === 0 ? 'không giới hạn' : limit;
    await message.reply(`✅ Đã đặt giới hạn thành viên: **${limitText}**`);
}

async function transferOwnership(message, args) {
    if (args.length === 0 || !message.mentions.members.first()) {
        return message.reply('❌ Vui lòng mention người dùng để chuyển quyền!');
    }
    
    const newOwner = message.mentions.members.first();
    const userChannelId = userChannels.get(message.author.id);
    
    if (!userChannelId) {
        return message.reply('❌ Bạn không sở hữu phòng voice nào!');
    }
    
    const channel = message.guild.channels.cache.get(userChannelId);
    if (!channel) {
        userChannels.delete(message.author.id);
        return message.reply('❌ Phòng của bạn không tồn tại!');
    }
    
    // Cập nhật permissions
    await channel.permissionOverwrites.edit(message.author.id, {
        ManageChannels: null,
        ManageRoles: null,
        MoveMembers: null
    });
    
    await channel.permissionOverwrites.edit(newOwner.id, {
        ManageChannels: true,
        ManageRoles: true,
        MoveMembers: true
    });
    
    // Cập nhật thông tin sở hữu
    const channelInfo = voiceChannels.get(channel.id);
    channelInfo.owner = newOwner.id;
    voiceChannels.set(channel.id, channelInfo);
    
    userChannels.delete(message.author.id);
    userChannels.set(newOwner.id, channel.id);
    
    await message.reply(`✅ Đã chuyển quyền sở hữu phòng cho ${newOwner.user.username}!`);
}

async function kickUser(message, args) {
    if (args.length === 0 || !message.mentions.members.first()) {
        return message.reply('❌ Vui lòng mention người dùng để đuổi!');
    }
    
    const targetMember = message.mentions.members.first();
    const userChannelId = userChannels.get(message.author.id);
    
    if (!userChannelId) {
        return message.reply('❌ Bạn không sở hữu phòng voice nào!');
    }
    
    const channel = message.guild.channels.cache.get(userChannelId);
    if (!channel) {
        userChannels.delete(message.author.id);
        return message.reply('❌ Phòng của bạn không tồn tại!');
    }
    
    // Kiểm tra nếu người dùng đang trong phòng
    if (targetMember.voice.channelId !== channel.id) {
        return message.reply('❌ Người dùng này không ở trong phòng của bạn!');
    }
    
    // Đá người dùng khỏi voice channel
    await targetMember.voice.setChannel(null);
    await message.reply(`✅ Đã đuổi ${targetMember.user.username} khỏi phòng!`);
}

async function closeChannel(message) {
    const userChannelId = userChannels.get(message.author.id);
    if (!userChannelId) {
        return message.reply('❌ Bạn không sở hữu phòng voice nào!');
    }
    
    const channel = message.guild.channels.cache.get(userChannelId);
    if (!channel) {
        userChannels.delete(message.author.id);
        return message.reply('❌ Phòng của bạn không tồn tại!');
    }
    
    // Di chuyển tất cả thành viên ra khỏi phòng
    for (const [memberId, member] of channel.members) {
        await member.voice.setChannel(null);
    }
    
    await deleteUserChannel(channel);
    await message.reply('✅ Đã đóng phòng voice của bạn!');
}

async function showChannelInfo(message) {
    const userChannelId = userChannels.get(message.author.id);
    if (!userChannelId) {
        return message.reply('❌ Bạn không sở hữu phòng voice nào!');
    }
    
    const channel = message.guild.channels.cache.get(userChannelId);
    if (!channel) {
        userChannels.delete(message.author.id);
        return message.reply('❌ Phòng của bạn không tồn tại!');
    }
    
    const channelInfo = voiceChannels.get(channel.id);
    const memberCount = channel.members.size;
    const userLimit = channel.userLimit || 'Không giới hạn';
    
    const embed = {
        color: 0x0099ff,
        title: `📊 Thông tin phòng: ${channel.name}`,
        fields: [
            { name: '👑 Chủ sở hữu', value: `<@${channelInfo.owner}>`, inline: true },
            { name: '👥 Thành viên', value: `${memberCount} người`, inline: true },
            { name: '📈 Giới hạn', value: userLimit.toString(), inline: true },
            { name: '🕐 Tạo lúc', value: `<t:${Math.floor(channelInfo.createdAt / 1000)}:R>`, inline: true }
        ],
        timestamp: new Date()
    };
    
    await message.reply({ embeds: [embed] });
}

async function showHelp(message) {
    const embed = {
        color: 0x0099ff,
        title: '🎮 Hướng dẫn sử dụng Voice Channel Manager',
        description: 'Các lệnh quản lý phòng voice:',
        fields: [
            {
                name: '🛠️ Thiết lập',
                value: '`!vc setup` - Thiết lập voice channel hiện tại thành channel tạo phòng (Admin only)'
            },
            {
                name: '📝 Quản lý phòng',
                value: '`!vc rename <tên>` - Đổi tên phòng\n`!vc limit <số>` - Đặt giới hạn thành viên (0-99)\n`!vc info` - Xem thông tin phòng'
            },
            {
                name: '👥 Quản lý thành viên',
                value: '`!vc transfer @user` - Chuyển quyền sở hữu\n`!vc kick @user` - Đuổi thành viên\n`!vc close` - Đóng phòng'
            }
        ],
        footer: { text: 'Tự động tạo phòng khi join vào channel tạo phòng' }
    };
    
    await message.reply({ embeds: [embed] });
}

// Xử lý lỗi
process.on('unhandledRejection', error => {
    console.error('Lỗi không xử lý:', error);
});

// Khởi động bot
client.login(process.env.DISCORD_TOKEN);
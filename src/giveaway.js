const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/giveawaybot', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Schema cho giveaway với TTL index
const giveawaySchema = new mongoose.Schema({
    messageId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    guildId: { type: String, required: true },
    prize: { type: String, required: true },
    winners: { type: Number, required: true, min: 1 },
    endTime: { type: Date, required: true },
    hostedBy: { type: String, required: true },
    entries: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

// Thiết lập TTL index - tự động xóa document sau khi endTime đã qua 1 giờ
giveawaySchema.index({ endTime: 1 }, { 
    expireAfterSeconds: 3600 // 1 giờ sau khi endTime
});

const Giveaway = mongoose.model('Giveaway', giveawaySchema);

// Sự kiện khi bot ready
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} is ready!`);
    
    // Khôi phục các giveaway chưa kết thúc
    try {
        const now = new Date();
        const activeGiveaways = await Giveaway.find({ endTime: { $gt: now } });
        
        for (const giveaway of activeGiveaways) {
            const remainingTime = giveaway.endTime - now;
            
            // Thiết lập timeout để kết thúc giveaway
            setTimeout(() => {
                endGiveaway(giveaway.messageId);
            }, remainingTime);
            
            console.log(`⏰ Đã khôi phục giveaway: ${giveaway.prize}`);
        }
    } catch (error) {
        console.error('Lỗi khi khôi phục giveaways:', error);
    }
});

// Prefix cho commands
const prefix = '!';

// Xử lý commands
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Command tạo giveaway
    if (command === 'giveaway') {
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply('Bạn cần có quyền "Manage Messages" để tạo giveaway!');
        }

        if (args.length < 3) {
            return message.reply('Sử dụng: !giveaway <thời gian> <số người thắng> <giải thưởng>');
        }

        const time = args[0];
        const winners = parseInt(args[1]);
        const prize = args.slice(2).join(' ');

        // Chuyển đổi thời gian
        let duration;
        try {
            duration = parseTime(time);
        } catch {
            return message.reply('Thời gian không hợp lệ! Ví dụ: 1d, 2h, 30m');
        }

        if (isNaN(winners) || winners < 1) {
            return message.reply('Số người thắng phải là số và lớn hơn 0!');
        }

        const endTime = new Date(Date.now() + duration);

        // Tạo embed giveaway
        const embed = new EmbedBuilder()
            .setTitle('🎉 **GIVEAWAY** 🎉')
            .setDescription(`**Giải thưởng:** ${prize}\n**Số người thắng:** ${winners}\n**Kết thúc:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n**Người tạo:** ${message.author}`)
            .setColor('#FF0000')
            .setTimestamp(endTime);

        // Tạo button tham gia
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`giveaway_${message.id}`)
                    .setLabel('Tham gia Giveaway')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎉')
            );

        // Gửi message giveaway
        const giveawayMessage = await message.channel.send({
            embeds: [embed],
            components: [row]
        });

        // Lưu thông tin giveaway vào database
        try {
            const giveaway = new Giveaway({
                messageId: giveawayMessage.id,
                channelId: message.channel.id,
                guildId: message.guild.id,
                prize: prize,
                winners: winners,
                endTime: endTime,
                hostedBy: message.author.id,
                entries: []
            });

            await giveaway.save();
            
            // Thiết lập timeout để kết thúc giveaway
            setTimeout(() => {
                endGiveaway(giveawayMessage.id);
            }, duration);

            message.reply('Giveaway đã được tạo thành công!');
        } catch (error) {
            console.error('Lỗi khi lưu giveaway:', error);
            message.reply('Đã xảy ra lỗi khi tạo giveaway!');
        }
    }

    // Command kết thúc giveaway sớm
    if (command === 'end') {
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply('Bạn cần có quyền "Manage Messages" để kết thúc giveaway!');
        }

        const messageId = args[0];
        if (!messageId) {
            return message.reply('Vui lòng cung cấp ID của message giveaway!');
        }

        endGiveaway(messageId);
    }

    // Command xem danh sách giveaway
    if (command === 'giveaways') {
        try {
            const now = new Date();
            const activeGiveaways = await Giveaway.find({ endTime: { $gt: now } });
            
            if (activeGiveaways.length === 0) {
                return message.reply('Hiện không có giveaway nào đang diễn ra!');
            }

            const giveawayList = activeGiveaways.map(g => {
                return `**${g.prize}** - Kết thúc: <t:${Math.floor(g.endTime.getTime() / 1000)}:R> - [Link](https://discord.com/channels/${message.guild.id}/${g.channelId}/${g.messageId})`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setTitle('🎉 Giveaways Đang Diễn Ra')
                .setDescription(giveawayList)
                .setColor('#00FF00');

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách giveaway:', error);
            message.reply('Đã xảy ra lỗi khi lấy danh sách giveaway!');
        }
    }
});

// Xử lý button click
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('giveaway_')) {
        const messageId = interaction.customId.replace('giveaway_', '');
        
        try {
            const giveaway = await Giveaway.findOne({ messageId });
            
            if (!giveaway) {
                return interaction.reply({ content: 'Giveaway không tồn tại hoặc đã kết thúc!', ephemeral: true });
            }

            if (giveaway.endTime < new Date()) {
                return interaction.reply({ content: 'Giveaway đã kết thúc!', ephemeral: true });
            }

            if (giveaway.entries.includes(interaction.user.id)) {
                return interaction.reply({ content: 'Bạn đã tham gia giveaway này rồi!', ephemeral: true });
            }

            giveaway.entries.push(interaction.user.id);
            await giveaway.save();

            interaction.reply({ content: 'Bạn đã tham gia giveaway thành công! 🎉', ephemeral: true });
        } catch (error) {
            console.error('Lỗi khi xử lý tham gia giveaway:', error);
            interaction.reply({ content: 'Đã xảy ra lỗi khi tham gia giveaway!', ephemeral: true });
        }
    }
});

// Hàm kết thúc giveaway
async function endGiveaway(messageId) {
    try {
        const giveaway = await Giveaway.findOne({ messageId });
        
        if (!giveaway) {
            return;
        }

        // Chọn người thắng cuộc
        let winners = [];
        if (giveaway.entries.length > 0) {
            const entries = [...giveaway.entries]; // Copy mảng
            for (let i = 0; i < giveaway.winners && i < entries.length; i++) {
                const randomIndex = Math.floor(Math.random() * entries.length);
                winners.push(entries[randomIndex]);
                entries.splice(randomIndex, 1);
            }
        }

        // Cập nhật embed
        const winnerText = winners.length > 0 
            ? winners.map(winner => `<@${winner}>`).join(', ') 
            : 'Không có người tham gia!';

        const embed = new EmbedBuilder()
            .setTitle('🎉 **GIVEAWAY KẾT THÚC** 🎉')
            .setDescription(`**Giải thưởng:** ${giveaway.prize}\n**Người thắng:** ${winnerText}\n**Số người tham gia:** ${giveaway.entries.length}\n**Người tạo:** <@${giveaway.hostedBy}>`)
            .setColor('#00FF00')
            .setTimestamp();

        try {
            const channel = await client.channels.fetch(giveaway.channelId);
            const message = await channel.messages.fetch(messageId);
            
            await message.edit({
                embeds: [embed],
                components: []
            });

            if (winners.length > 0) {
                channel.send(`🎉 Chúc mừng ${winnerText} đã thắng giải **${giveaway.prize}**!`);
            }

        } catch (error) {
            console.error('Lỗi khi cập nhật message giveaway:', error);
        }
        
        // Không cần xóa giveaway khỏi database vì TTL index sẽ tự động xóa sau 1 giờ
        
    } catch (error) {
        console.error('Lỗi khi kết thúc giveaway:', error);
    }
}

// Hàm parse thời gian
function parseTime(timeStr) {
    const units = {
        's': 1000,
        'm': 1000 * 60,
        'h': 1000 * 60 * 60,
        'd': 1000 * 60 * 60 * 24
    };

    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) {
        throw new Error('Invalid time format');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    return value * units[unit];
}

// Xử lý lỗi kết nối MongoDB
mongoose.connection.on('error', err => {
    console.error('❌ Lỗi kết nối MongoDB:', err);
});

mongoose.connection.once('open', () => {
    console.log('✅ Đã kết nối thành công đến MongoDB');
});

// Kiểm tra token
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ Lỗi: Token bot chưa được cấu hình!');
    console.log('👉 Vui lòng thêm DISCORD_TOKEN vào file .env');
    process.exit(1);
}

// Đăng nhập bot
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Lỗi đăng nhập:', error.message);
});
const cron = require('node-cron');
const { ChannelType } = require('discord.js');
const Ticket = require('../models/Ticket');

async function schedulePendingTicketDeletions(client) {
    console.log("Đang lên lịch xóa ticket dư thừa")
    // Lấy tất cả ticket có deleteAt <= thời điểm hiện tại + thời gian tồn tại
    const now = new Date();

    // Giả sử ticket có deleteAt + 6h mới xóa
    const tickets = await Ticket.find({ deleteAt: { $exists: true } });

    for (const ticket of tickets) {
        const channelId = ticket.channelId;
        const end = new Date(ticket.deleteAt.getTime() + 21600 * 1000); // 6h = 21600s

        if (end <= now) {
            // Ticket đã quá hạn, xóa ngay
            try {
                const ch = await client.channels.fetch(channelId).catch(() => null);
                if (ch && ch.type === ChannelType.GuildText) {
                    await ch.delete(`Ticket ${ticket._id} auto deleted`);
                    console.log(`✅ Đã xóa kênh ${ch.name} (ticket quá hạn)`);
                }
                await Ticket.deleteOne({ channelId });
                console.log(`✅ Đã xóa ticket ${ticket._id} (ticket quá hạn)`);
            } catch (err) {
                console.error(`❌ Lỗi xóa ticket ${ticket._id}:`, err);
            }
        } else {
            // Ticket còn hạn, lên lịch cron
            const minute = end.getMinutes();
            const hour = end.getHours();
            const day = end.getDate();
            const month = end.getMonth() + 1;
            const cronExpr = `${minute} ${hour} ${day} ${month} *`;

            cron.schedule(
                cronExpr,
                async () => {
                    try {
                        const ch = await client.channels.fetch(channelId).catch(() => null);
                        if (ch && ch.type === ChannelType.GuildText) {
                            await ch.delete(`Ticket ${ticket._id} auto deleted`);
                            console.log(`✅ Đã xóa kênh ${ch.name}`);
                        }
                        await Ticket.deleteOne({ channelId });
                        console.log(`✅ Đã xóa ticket ${ticket._id}`);
                    } catch (err) {
                        console.error(`❌ Lỗi xóa ticket ${ticket._id}:`, err);
                    }
                },
                {
                    scheduled: true,
                    timezone: "Asia/Ho_Chi_Minh",
                }
            );

            console.log(`🕒 [Ticket] Lên lịch xóa lại ticket ${ticket._id} lúc ${end.toLocaleString("vi-VN")}`);
        }
    }
}

module.exports = schedulePendingTicketDeletions;

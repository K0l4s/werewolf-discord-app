class ServerController {
    // static async isSpamMessage(message) {
    //     // lấy tin nhắn có cùng nội dung trong 1 phút gần đây
    //     const oneMinuteAgo = Date.now() - 10 * 1000;
    //     // const recentMessages = await message.channel.messages.fetch({ limit: 100 });
    //     // lấy recentMessages từ tất cả các channel trong guild
        
    //     const similarMessages = recentMessages.filter(msg => 
    //         msg.author.id === message.author.id &&
    //         msg.content.toLowerCase() === message.content.toLowerCase() &&
    //         msg.createdTimestamp >= oneMinuteAgo &&
    //         msg.id !== message.id // loại trừ chính tin nhắn hiện tại
    //     );
    //     if (similarMessages.size >= 5) {
    //         return true;
    //     }

    //     // const blockedWords = [
    //     //     'discord.gg/',
    //     // ]
    //     // const messageContent = message.content.toLowerCase();
    //     // for (const word of blockedWords) {
    //     //     if (messageContent.includes(word)) {
    //     //         return true;
    //     //     }
    //     // }
    //     return false;
    // }
    // static async deleteSpamMessages(message) {
    //     try {
    //         const isSpam = await this.isSpamMessage(message);
    //         if (isSpam) {
    //             await message.delete();
    //             // gửi tin nhắn cảnh báo
    //             const warningMessage = await message.channel.send(`⚠️ <@${message.author.id}>, Tin nhắn của bạn đã bị xóa vì chứa nội dung spam.`);
    //             // Xóa tin nhắn cảnh báo sau 5 giây
    //             setTimeout(async () => {
    //                 try {
    //                     await warningMessage.delete();
    //                 }
    //                 catch (error) {
    //                     if (error.code !== 10008) {
    //                         console.error('Lỗi xóa tin nhắn cảnh báo:', error);
    //                     }
    //                 }
    //             }, 5000);
    //             // return true;
    //         }
    //     } catch (error) {
    //         console.error('Lỗi khi xóa tin nhắn spam:', error);
    //     }
    //     return false;
    // }
    static async deleteMessages(channel, limit) {
        try {
            let totalDeleted = 0;
            let fetched;

            do {
                // Lấy tin nhắn (tối đa 100 mỗi lần)
                fetched = await channel.messages.fetch({
                    limit: Math.min(limit, 100)
                });

                if (fetched.size === 0) break;

                // Lọc tin nhắn cũ hơn 14 ngày (không thể bulk delete)
                const deletableMessages = fetched.filter(msg => {
                    const messageAge = Date.now() - msg.createdTimestamp;
                    return messageAge < 14 * 24 * 60 * 60 * 1000; // 14 ngày
                });

                const oldMessages = fetched.filter(msg => {
                    const messageAge = Date.now() - msg.createdTimestamp;
                    return messageAge >= 14 * 24 * 60 * 60 * 1000;
                });

                // Xóa tin nhắn mới (bulk delete)
                if (deletableMessages.size > 0) {
                    await channel.bulkDelete(deletableMessages, true);
                    totalDeleted += deletableMessages.size;
                }

                // Xóa tin nhắn cũ từng cái một
                if (oldMessages.size > 0) {
                    for (const [, message] of oldMessages) {
                        try {
                            await message.delete();
                            totalDeleted++;
                            // Delay để tránh rate limit
                            await new Promise(resolve => setTimeout(resolve, 100));
                        } catch (error) {
                            if (error.code !== 10008) { // Bỏ qua lỗi "Unknown Message"
                                console.error('Lỗi xóa tin nhắn cũ:', error);
                            }
                        }
                    }
                }

                limit -= fetched.size;

            } while (limit > 0 && fetched.size > 0);

            // Gửi tin nhắn xác nhận
            if (totalDeleted > 0) {
                const confirmationMessage = await channel.send(`✅ Đã xóa ${totalDeleted} tin nhắn.`);

                // Xóa tin nhắn xác nhận sau 5 giây
                setTimeout(async () => {
                    try {
                        await confirmationMessage.delete();
                    } catch (error) {
                        if (error.code !== 10008) {
                            console.error('Lỗi xóa tin nhắn xác nhận:', error);
                        }
                    }
                }, 5000);
            } else {
                await channel.send('❌ Không có tin nhắn nào để xóa.');
            }

        } catch (error) {
            console.error('Lỗi khi xóa tin nhắn:', error);

            // Xử lý lỗi cụ thể
            if (error.code === 50013) {
                await channel.send('❌ Bot không có quyền xóa tin nhắn trong kênh này.');
            } else if (error.code === 50001) {
                await channel.send('❌ Bot không có quyền truy cập kênh này.');
            } else {
                await channel.send('❌ Đã xảy ra lỗi khi xóa tin nhắn.');
            }
        }
    }
}

module.exports = ServerController;
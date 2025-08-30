const { ActionRowBuilder, ButtonComponent, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require("discord.js");
const UserService = require("../services/userService");
const { wolfCoin } = require("../utils/wolfCoin");
const { weightedRandom } = require("../utils/weightRnd");

class MiniGameController {
    static identifyMoney(bet) {
        if (bet === "all") {
            bet = Math.min(user.coin, 300000);
        } else {
            bet = parseInt(bet);

            // Nếu không phải số hợp lệ hoặc <=0, đặt mặc định 20
            if (isNaN(bet) || bet <= 0) bet = 20;

            // Giới hạn tối đa 300000
            if (bet > 300000) bet = 300000;
        }
        return bet;
    }

    static async oneTwoThree(userId,msg,money){
        // const bet = 
    }
    static async bauCua(userId, msg, money) {
        const bet = parseInt(this.identifyMoney(money))
        const user = await UserService.findUserById(userId)
        if (user.coin < bet) return msg.reply("🚫 Bạn không đủ coin để đặt cược!");

        const choices = {
            "🍐": "Bầu",
            "🦀": "Cua",
            "🐟": "Cá",
            "🐓": "Gà",
            "🦌": "Nai",
            "🦁": "Hổ"
        };
        const list = [
            {
                label: "Nai/Deer",
                description: `Pick me, you'll be rich!'!`,
                value: "nai",
                emoji: "🦌"
            },
            {
                label: "Bầu/Calabash",
                description: `Pick me, you're the father of my son!`,
                value: "bau",
                emoji: "🤰"
            },
            {
                label: "Gà/Chicken",
                description: `Chicken... Chicken... Chicken!`,
                value: "ga",
                emoji: "🐔"
            },
            {
                label: "Cá/Fish",
                description: `Oc oc oc oc`,
                value: "ca",
                emoji: "🐟"
            },
            {
                label: "Cua/Crab",
                description: `Pick me or eat me?!`,
                value: "cua",
                emoji: "🦀"
            },
            {
                label: "Tôm/Shrimp",
                description: `Pick me, you're the father of my son!`,
                value: "tom",
                emoji: "🦐"
            },
        ]
        const selectMenu = new StringSelectMenuBuilder().setCustomId('mini_baucua|' + bet + "|" + userId)
            .setPlaceholder('Select and become Tycoon...')
            .setMinValues(1)
            .setMaxValues(1) // chỉ chọn 1 người
            .addOptions(list);
        const rows = new ActionRowBuilder().addComponents(selectMenu)
        const embed = new EmbedBuilder()
        embed.setTitle("Minigames | Bầu cua")
            .setDescription(`🎲 You bet **${wolfCoin(bet)}**\n Select random button below and you'll become a **Tycoon**!`)
            .setImage("https://i.pinimg.com/736x/b0/55/7e/b0557ea48b720f61455d10f5dce24eb8.jpg")
        await msg.reply({ embeds: [embed], components: [rows] })
        // gửi tin nhắn mời chọn
        // const msgGame = await msg.reply(
        //     `🎲 Bạn cược **${bet} coin**. Chọn 1 con bằng reaction trong **30s**:\n🍐 Bầu | 🦀 Cua | 🐟 Cá | 🐓 Gà | 🦌 Nai | 🦁 Hổ`
        // );

        // thêm reactions
        // for (const emoji of Object.keys(choices)) {
        //     await msgGame.react(emoji);
        // }

        // filter chỉ nhận reaction từ người gọi lệnh
        // const filter = (reaction, userReact) => {
        //     return Object.keys(choices).includes(reaction.emoji.name) && userReact.id === msg.author.id;
        // };

        // try {
        //     const collected = await msgGame.awaitReactions({ filter, max: 1, time: 50000, errors: ["time"] });
        //     const reaction = collected.first();
        //     const userChoice = choices[reaction.emoji.name];

        //     // roll kết quả
        //     const resultEmoji = Object.keys(choices)[Math.floor(Math.random() * Object.keys(choices).length)];
        //     const resultName = choices[resultEmoji];

        //     let win = -bet;
        //     if (userChoice === resultName) win = bet * 2; // thắng x2

        //     user.coin += win;
        //     await user.save();

        //     msg.reply(
        //         `🎲 Bạn chọn: ${reaction.emoji.name} **${userChoice}**\n` +
        //         `Kết quả: ${resultEmoji} **${resultName}**\n` +
        //         `${win > 0 ? `🎉 Bạn thắng +${win} coin` : `😢 Bạn thua ${Math.abs(win)} coin`}\n` +
        //         `💰 Coin hiện tại: **${user.coin}**`
        //     );

        // } catch (err) {
        //     msg.reply("⌛ Hết thời gian chọn! Trò chơi bị hủy.");
        // }
    }
    static async bauCuaFinal(bet, userId, userChoice, interaction) {
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: "🚫 Đây không phải lượt của bạn!", ephemeral: true });
        }

        const user = await UserService.findUserById(userId);
        if (!user) return interaction.message.send("❌ Không tìm thấy người chơi!");

        // danh sách có trọng số
        const list = [
            { label: "nai", weight: 10 },
            { label: "bau", weight: 15 },
            { label: "ga", weight: 20 },
            { label: "ca", weight: 15 },
            { label: "cua", weight: 20 },
            { label: "tom", weight: 20 }
        ];

        const emojis = {
            nai: "🦌",
            bau: "🍐",
            ga: "🐓",
            ca: "🐟",
            cua: "🦀",
            tom: "🦐"
        };

        // emoji loading custom
        const loadingEmoji = "<a:load:1410394844324429886>";

        // Tạo kết quả thật từ 3 lần roll
        const result = [];
        for (let i = 0; i < 3; i++) {
            result.push(weightedRandom(list));
        }

        // tính tiền
        let win = -bet;
        const matches = result.filter(r => r === userChoice).length;
        if (matches > 0) win = bet * matches;

        user.coin += win;
        await user.save();

        // gửi embed rolling ban đầu
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🎲 Đang gieo xúc xắc...")
                    .setDescription(`${loadingEmoji} ${loadingEmoji} ${loadingEmoji}`)
                    .setColor(0xffff00)
            ],
            components: []
        });

        // Hiển thị từng mặt một với animation
        const displayResult = [];
        for (let i = 0; i < 3; i++) {
            // Tạo hiệu ứng roll cho từng mặt
            // for (let j = 0; j < 3; j++) {
            // await new Promise(resolve => setTimeout(resolve, 10));

            // Tạo kết quả tạm thời cho animation
            const tempDisplay = [...displayResult];
            while (tempDisplay.length <= i) {
                tempDisplay.push(weightedRandom(list));
            }

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🎲 Đang gieo xúc xắc...")
                        .setDescription(
                            `Bạn chọn: ${emojis[userChoice]} **${userChoice.toUpperCase()}**\n` +
                            `Kết quả: ${tempDisplay.map((r, idx) =>
                                idx === i ? `${loadingEmoji}` : emojis[r]
                            ).join(" ")}\n\n` +
                            `${loadingEmoji} Đang lắc mặt thứ ${i + 1}...`
                        )
                        .setColor(0xffff00)
                ]
            });
            // }

            // Hiển thị kết quả thật cho mặt hiện tại
            displayResult.push(result[i]);

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(i === 2 ? "🎲 Kết quả Bầu cua" : "🎲 Đang gieo xúc xắc...")
                        .setDescription(
                            `Bạn chọn: ${emojis[userChoice]} **${userChoice.toUpperCase()}**\n` +
                            `Kết quả: ${displayResult.map(r => emojis[r]).join(" ")}${i < 2 && i > 1 ? ` ${loadingEmoji} ` : ''}\n\n` +
                            (i === 2 ?
                                `${win > 0 ? `🎉 Bạn thắng +${wolfCoin(win)} coin` : `😢 Bạn thua ${wolfCoin(Math.abs(win))} coin`}\n` +
                                `💰 Coin hiện tại: **${wolfCoin(user.coin)}**` :
                                `${loadingEmoji} Đang lắc mặt thứ ${i + 2}...`)
                        )
                        .setColor(i === 2 ? (win > 0 ? 0x00ff00 : 0xff0000) : 0xffff00)
                ]
            });

            // if (i < 2) {
            //     await new Promise(resolve => setTimeout(resolve, 800));
            // }
        }
    }
}

module.exports = MiniGameController;
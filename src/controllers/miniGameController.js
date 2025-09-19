const { ActionRowBuilder, ButtonComponent, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require("discord.js");
const UserService = require("../services/userService");
const { wolfCoin } = require("../utils/wolfCoin");
const { weightedRandom } = require("../utils/weightRnd");
const UserController = require("./userController");

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
    static async oneTwoThree(userId, msg, money) {
        const user = await UserService.findUserById(userId);
        const bet = this.identifyMoney(money, user);

        if (user.coin < bet) {
            return msg.reply("🚫 Bạn không đủ coin để đặt cược!");
        }

        const choice = {
            "scissors": "✂️",
            "hammer": "🔨",
            "paper": "📄"
        };

        const scissorsButton = new ButtonBuilder()
            .setCustomId(`onetwothree|scissors|${bet}|${userId}`)
            .setEmoji("✂️")
            .setLabel("Scissors")
            .setStyle(1);

        const hammerButton = new ButtonBuilder()
            .setCustomId(`onetwothree|hammer|${bet}|${userId}`)
            .setEmoji("🔨")
            .setLabel("Hammer")
            .setStyle(1);

        const paperButton = new ButtonBuilder()
            .setCustomId(`onetwothree|paper|${bet}|${userId}`)
            .setEmoji("📄")
            .setLabel("Paper")
            .setStyle(1);

        const row = new ActionRowBuilder().addComponents(
            scissorsButton,
            hammerButton,
            paperButton
        );

        await msg.reply({
            content: `Bạn đã cược **${bet}** coin!\nHãy chọn:`,
            components: [row]
        });
    }

    static async handle123Result(interaction) {
        const [_, playerChoice, bet, userId] = interaction.customId.split("|");
        const betAmount = parseInt(bet);

        if (interaction.user.id !== userId) {
            return interaction.reply({ content: "🚫 Đây không phải trò chơi của bạn!", ephemeral: true });
        }

        const botChoices = ["scissors", "hammer", "paper"];
        const choiceEmojis = {
            "scissors": "✂️",
            "hammer": "🔨",
            "paper": "📄"
        };

        const botChoice = botChoices[Math.floor(Math.random() * botChoices.length)];

        const loadingEmoji = "<a:load:1410394844324429886>"; // emoji loading

        // Gửi loading trước
        await interaction.update({
            content: `👉 Bạn chọn: ${choiceEmojis[playerChoice]}\n🤖 Bot đang chọn ${loadingEmoji}`,
            components: [] // xoá button ngay khi user bấm
        });


        // Sau 3 giây dừng và show kết quả thật
        setTimeout(async () => {
            let result;
            let coinChange = 0;

            if (playerChoice === botChoice) {
                result = "🤝 Hòa!";
            } else if (
                (playerChoice === "scissors" && botChoice === "paper") ||
                (playerChoice === "hammer" && botChoice === "scissors") ||
                (playerChoice === "paper" && botChoice === "hammer")
            ) {
                result = `🎉 Bạn thắng! **+${wolfCoin(betAmount)}**`;
                coinChange = betAmount;
            } else {
                result = `💀 Bạn thua! **-${wolfCoin(betAmount)}**`;
                coinChange = -betAmount;
            }

            const user = await UserService.findUserById(userId);
            user.coin += coinChange;
            if (user.coin < 0) user.coin = 0;
            await user.save();

            await interaction.editReply({
                content: `👉 Bạn chọn: ${choiceEmojis[playerChoice]}\n🤖 Bot chọn: ${choiceEmojis[botChoice]}\n\n${result}`
            });
        }, 500); // 3 giây loading

    }

    static async bauCua(userId, msg, money) {
        const bet = parseInt(this.identifyMoney(money))
        const user = await UserService.findUserById(userId)
        if (user.coin < bet) return msg.reply("🚫 Bạn không đủ coin để đặt cược!");

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

        }
    }
}

module.exports = MiniGameController;
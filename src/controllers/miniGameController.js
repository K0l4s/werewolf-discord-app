const { ActionRowBuilder, ButtonComponent, InteractionResponseFlags, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require("discord.js");
const UserService = require("../services/userService");
const { wolfCoin } = require("../utils/wolfCoin");
const { weightedRandom } = require("../utils/weightRnd");
const UserController = require("./userController");
const { calculateLuckyBuff } = require("../utils/calculateLuckyBuff");

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
        await interaction.deferUpdate()
        const loadingEmoji = "<a:load:1410394844324429886>";
        const choiceEmojis = {
            scissors: "✂️",
            hammer: "🔨",
            paper: "📄",
        };
        const [_, playerChoice, bet, userId] = interaction.customId.split("|");

        // Gửi loading trước
        await interaction.editReply({
            content: `👉 Bạn chọn: ${choiceEmojis[playerChoice]}\n🤖 Bot đang chọn ${loadingEmoji}`,
            components: [],
        });

        const betAmount = parseInt(bet);

        if (interaction.user.id !== userId) {
            return interaction.reply({ content: "🚫 Đây không phải trò chơi của bạn!", ephemeral: true });
        }



        // lấy buff (0–100)
        const buff = await calculateLuckyBuff(userId, interaction.guildId);



        // xác định botChoice theo trọng số
        let winChoice, loseChoice, drawChoice;

        if (playerChoice === "scissors") {
            winChoice = "paper";
            loseChoice = "hammer";
            drawChoice = "scissors";
        } else if (playerChoice === "hammer") {
            winChoice = "scissors";
            loseChoice = "paper";
            drawChoice = "hammer";
        } else {
            winChoice = "hammer";
            loseChoice = "scissors";
            drawChoice = "paper";
        }

        // tính trọng số
        const winWeight = 1 + buff / 100; // buff càng cao → càng dễ thắng
        const loseWeight = 1;
        const drawWeight = 1;

        const totalWeight = winWeight + loseWeight + drawWeight;
        const rand = Math.random() * totalWeight;

        let botChoice;
        if (rand < winWeight) botChoice = winChoice;
        else if (rand < winWeight + loseWeight) botChoice = loseChoice;
        else botChoice = drawChoice;

        // xử lý kết quả
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
            content: `👉 Bạn chọn: ${choiceEmojis[playerChoice]}\n🤖 Bot chọn: ${choiceEmojis[botChoice]}\n\n${result}`,
        });
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
        try {
            if (interaction.user.id !== userId) {
                return await interaction.followUp({
                    content: "🚫 Đây không phải lượt của bạn!",
                    flags: InteractionResponseFlags.Ephemeral
                });
            }

            const loadingEmoji = "<a:diceRoll:1418927558086492312>";
            const diceColors = [0xFFD700, 0xFF6B6B, 0x4ECDC4];

            // defer để tránh lỗi Unknown interaction
            // await interaction.deferUpdate();

            const initialEmbed = new EmbedBuilder()
                .setTitle("🎲 BẦU CUA - ĐANG LẮC XÚC XẮC")
                .setDescription(`${loadingEmoji} ${loadingEmoji} ${loadingEmoji}`)
                .setColor(0xF9A825)
                .setFooter({ text: "Vui lòng chờ trong giây lát..." });

            await interaction.update({
                embeds: [initialEmbed],
                components: []
            });

            const user = await UserService.findUserById(userId);
            if (!user) {
                return await interaction.followUp({
                    content: "❌ Không tìm thấy người chơi!",
                    // flags: InteractionResponseFlags.Ephemeral
                });
            }

            // Lucky Buff
            const { totalBuff } = await calculateLuckyBuff(userId, interaction.guildId);

            // danh sách có trọng số cơ bản
            const baseList = [
                { label: "nai", weight: 10 },
                { label: "bau", weight: 15 },
                { label: "ga", weight: 20 },
                { label: "ca", weight: 15 },
                { label: "cua", weight: 20 },
                { label: "tom", weight: 20 }
            ];

            // clone list và tăng trọng số cho userChoice dựa vào luckyBuff
            const list = baseList.map(item => {
                if (item.label === userChoice) {
                    const multiplier = 1 + totalBuff / 100;
                    return { ...item, weight: Math.floor(item.weight * multiplier) };
                }
                return { ...item };
            });

            const emojis = {
                nai: "🦌",
                bau: "🍐",
                ga: "🐓",
                ca: "🐟",
                cua: "🦀",
                tom: "🦐"
            };

            const names = {
                nai: "Nai",
                bau: "Bầu",
                ga: "Gà",
                ca: "Cá",
                cua: "Cua",
                tom: "Tôm"
            };

            // Roll 3 mặt
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

            // Hiển thị từng mặt một với animation
            const displayResult = [];
            for (let i = 0; i < 3; i++) {
                await new Promise(resolve => setTimeout(resolve, 500));

                displayResult.push(result[i]);

                const tempDisplay = [...displayResult];
                while (tempDisplay.length < 3) tempDisplay.push("waiting");

                let description = `**Bạn đặt cược:** ${emojis[userChoice]} ${names[userChoice]}\n`;
                description += `**Kết quả:** `;

                tempDisplay.forEach(r => {
                    description += r === "waiting" ? `${loadingEmoji} ` : `${emojis[r]} `;
                });

                description += `\n\n${loadingEmoji} Đang lắc mặt xúc xắc thứ ${i + 1}...`;

                const rollingEmbed = new EmbedBuilder()
                    .setTitle(i === 2 ? "🎲 KẾT QUẢ BẦU CUA" : "🎲 ĐANG LẮC XÚC XẮC")
                    .setDescription(description)
                    .setColor(diceColors[i]);

                await interaction.editReply({
                    embeds: [rollingEmbed]
                });
            }

            // await new Promise(resolve => setTimeout(resolve, 800));

            // Tạo embed kết quả cuối cùng
            const winAmount = bet * matches;
            const resultDescription =
                `**Bạn đặt cược:** ${emojis[userChoice]} ${names[userChoice]}\n` +
                `**Kết quả:** ${emojis[result[0]]} ${emojis[result[1]]} ${emojis[result[2]]}\n\n` +
                `**Số khớp:** ${matches}/3\n` +
                (matches > 0
                    ? `🎉 **Bạn thắng:** +${wolfCoin(winAmount)}`
                    : `😢 **Bạn thua:** ${wolfCoin(bet)}`
                ) +
                `\n💰 **Coin hiện tại:** ${wolfCoin(user.coin)}`;

            const finalEmbed = new EmbedBuilder()
                .setTitle("🎲 KẾT QUẢ BẦU CUA")
                .setDescription(resultDescription)
                .setColor(win > 0 ? 0x4CAF50 : 0xF44336)
                .setFooter({
                    text: win > 0 ? "Chúc mừng bạn!" : "Chúc bạn may mắn lần sau!",
                    iconURL: "https://cdn.discordapp.com/emojis/1065110910836715570.webp"
                })
                .setTimestamp();

            await interaction.editReply({
                embeds: [finalEmbed]
            });

        } catch (error) {
            console.error("Lỗi trong trò chơi Bầu Cua:", error);

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: "❌ Đã xảy ra lỗi khi thực hiện trò chơi!",
                        // flags: InteractionResponseFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        content: "❌ Đã xảy ra lỗi khi thực hiện trò chơi!",
                        // flags: InteractionResponseFlags.Ephemeral
                    });
                }
            } catch (followUpError) {
                console.error("Lỗi khi gửi thông báo lỗi:", followUpError);
            }
        }
    }
}

module.exports = MiniGameController;
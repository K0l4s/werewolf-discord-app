const { ActionRowBuilder, ButtonComponent, InteractionResponseFlags, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require("discord.js");
const UserService = require("../services/userService");
const { wolfCoin } = require("../utils/wolfCoin");
const { weightedRandom } = require("../utils/weightRnd");
const UserController = require("./userController");
const { calculateLuckyBuff } = require("../utils/calculateLuckyBuff");
const { t } = require("../i18n");

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
    static async oneTwoThree(userId, money, lang) {
        const user = await UserService.findUserById(userId);
        const bet = this.identifyMoney(money, user);
        if (user.coin < bet) {
            return t("oneTwoThree.not_enough", lang);
        }

        const scissorsButton = new ButtonBuilder()
            .setCustomId(`onetwothree|scissors|${bet}|${userId}`)
            .setEmoji("<a:scissor:1437444788612890684>")
            .setLabel("Scissors")
            .setStyle(1);

        const hammerButton = new ButtonBuilder()
            .setCustomId(`onetwothree|hammer|${bet}|${userId}`)
            .setEmoji("<a:hammer:1437444063635706037>")
            .setLabel("Hammer")
            .setStyle(1);

        const paperButton = new ButtonBuilder()
            .setCustomId(`onetwothree|paper|${bet}|${userId}`)
            .setEmoji("<a:paper:1433099319711629393>")
            .setLabel("Paper")
            .setStyle(1);

        const row = new ActionRowBuilder().addComponents(
            scissorsButton,
            hammerButton,
            paperButton
        );

        // await msg.reply({
        //     content: `Bạn đã cược **${bet}** coin!\nHãy chọn:`,
        //     components: [row]
        // });
        const embed = new EmbedBuilder()
            .setTitle(t("oneTwoThree.title", lang))
            .setDescription(`🎲 ${t("oneTwoThree.description", lang)}${wolfCoin(bet)} ${t("oneTwoThree.choose", lang)}`)
            .setImage("https://i.pinimg.com/originals/6b/ed/1f/6bed1f3f4f8f4e3f4f4e4f4f4e4f4f4f.gif");
        return { embeds: [embed], components: [row] };
    }


    static async handle123Result(interaction, lang) {
        try {
            await interaction.deferUpdate();

            const loadingEmoji = "<a:load:1410394844324429886>";
            const choiceEmojis = {
                scissors: "<a:scissor:1437444788612890684>",
                hammer: "<a:hammer:1437444063635706037>",
                paper: "<a:paper:1433099319711629393>",
            };

            const parts = interaction.customId.split("|");
            const [_, playerChoice, bet, userId] = parts;

            // validate owner
            if (interaction.user.id !== userId) {
                return interaction.reply({ content: t("oneTwoThree.not_your_game", lang), ephemeral: true });
            }

            // Validate choice
            if (!["scissors", "hammer", "paper"].includes(playerChoice)) {
                console.warn("Invalid playerChoice:", playerChoice);
                return interaction.editReply({ content: "⚠️ Lựa chọn không hợp lệ.", components: [] });
            }

            // show loading embed first (optional)
            await interaction.editReply({
                content: `${t("oneTwoThree.your_choice", lang)} ${choiceEmojis[playerChoice]}\n${t("oneTwoThree.bot_choice", lang)} ${loadingEmoji}`,
                components: [],
            });

            const betAmount = parseInt(bet, 10) || 0;
            if (betAmount <= 0) {
                return interaction.editReply({ content: "⚠️ Số tiền cược không hợp lệ.", components: [] });
            }

            // lấy buff, đảm bảo là số
            let buff = await calculateLuckyBuff(userId, interaction.guildId);
            if (isNaN(buff)) buff = 0;
            buff = Math.max(0, Math.min(buff, 100)); // giới hạn 0–100

            // mapping thắng/thua/hòa
            let winChoice, loseChoice, drawChoice;
            switch (playerChoice) {
                case "scissors":
                    winChoice = "paper";   // kéo thắng giấy
                    loseChoice = "hammer"; // kéo thua búa
                    drawChoice = "scissors";
                    break;
                case "hammer":
                    winChoice = "scissors"; // búa thắng kéo
                    loseChoice = "paper";   // búa thua giấy
                    drawChoice = "hammer";
                    break;
                case "paper":
                    winChoice = "hammer";   // giấy thắng búa
                    loseChoice = "scissors";// giấy thua kéo
                    drawChoice = "paper";
                    break;
                default:
                    drawChoice = playerChoice;
                    winChoice = loseChoice = drawChoice;
                    break;
            }

            // Tính trọng số
            const winWeight = 1 + buff / 100; // buff càng cao càng dễ thắng
            const loseWeight = 1;
            const drawWeight = 1;

            // Random theo trọng số thật
            const total = winWeight + loseWeight + drawWeight;
            const rand = Math.random() * total;
            let botChoice;

            if (rand < winWeight) botChoice = winChoice;
            else if (rand < winWeight + loseWeight) botChoice = loseChoice;
            else botChoice = drawChoice;

            // DEBUG log (chỉ log server-side, không gửi Discord)
            // console.log(`[RPS] Player=${playerChoice}, Bot=${botChoice}, buff=${buff}, rand=${rand.toFixed(3)}, weights=(${winWeight.toFixed(2)}, ${loseWeight}, ${drawWeight})`);


            // xử lý kết quả
            let resultText;
            let coinChange = 0;

            if (playerChoice === botChoice) {
                // Hòa — explicit
                resultText = `🤝 ${t("oneTwoThree.tie", lang)}`;
                coinChange = 0;
            } else if (
                (playerChoice === "scissors" && botChoice === "paper") ||
                (playerChoice === "hammer" && botChoice === "scissors") ||
                (playerChoice === "paper" && botChoice === "hammer")
            ) {
                resultText = `🎉 ${t("oneTwoThree.win", lang)} **+${wolfCoin(betAmount)}**`;
                coinChange = betAmount;
            } else {
                resultText = `💀 ${t("oneTwoThree.lose", lang)} **-${wolfCoin(betAmount)}**`;
                coinChange = -betAmount;
            }

            // Lấy user & cập nhật coin
            const user = await UserService.findUserById(userId);
            if (!user) {
                return interaction.editReply({ content: "⚠️ Không tìm thấy người dùng.", components: [] });
            }

            user.coin = (user.coin || 0) + coinChange;
            if (user.coin < 0) user.coin = 0;
            await user.save();

            // Tạo embed đẹp
            const embed = new EmbedBuilder()
                .setTitle(t("oneTwoThree.result_title", lang) || "OneTwoThree - Kết quả")
                .addFields(
                    { name: t("oneTwoThree.your_choice", lang) || "Your choice", value: `${choiceEmojis[playerChoice]} \`${playerChoice}\``, inline: true },
                    { name: t("oneTwoThree.bot_choice", lang) || "Bot choice", value: `${choiceEmojis[botChoice]} \`${botChoice}\``, inline: true },
                    { name: t("oneTwoThree.result", lang) || "Result", value: resultText, inline: false },
                )
                .setFooter({ text: `${t("oneTwoThree.new_balance", lang) || "Balance"}: ${user.coin.toLocaleString("en-US")}` })
                .setTimestamp();

            // Color theo kết quả
            if (coinChange > 0) embed.setColor(0x57F287); // green
            else if (coinChange < 0) embed.setColor(0xED4245); // red
            else embed.setColor(0x95A5A6); // gray

            await interaction.editReply({
                content: null,
                embeds: [embed],
                components: [],
            });

        } catch (err) {
            console.error("handle123Result error:", err);
            try {
                await interaction.editReply({ content: "⚠️ Đã có lỗi xảy ra. Thử lại sau.", components: [] });
            } catch (e) { /* ignore */ }
        }
    }




    static async bauCua(userId, money) {
        const bet = parseInt(this.identifyMoney(money))
        const user = await UserService.findUserById(userId)
        if (user.coin < bet) return "🚫 Bạn không đủ coin để đặt cược!";

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
        return { embeds: [embed], components: [rows] }
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
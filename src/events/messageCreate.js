// handleMessageCreate.js
const GameController = require('../controllers/gameController');
const GameService = require('../services/gameService');
const { TEAMS, PHASES, ITEM_RARITY, ITEM_TYPE } = require('../config/constants');
const { EmbedBuilder } = require('discord.js');
const UserService = require('../services/userService');
const UserController = require('../controllers/userController');
const Item = require('../models/Item');
const ShopController = require('../controllers/shopController');
const SpiritController = require('../controllers/DauLaDaiLuc/spiritController');
const SpiritMaster = require('../models/DauLaDaiLuc/SpiritMaster');
const BattleController = require('../controllers/DauLaDaiLuc/battleController');
const HuntSpiritController = require('../controllers/DauLaDaiLuc/huntSpiritController');
const User = require('../models/User');
const Prefix = require('../models/Prefix');
const handleMessageCreate = async (client, msg) => {
    // try {
    if (msg.author.bot || !msg.guild) return;
    // if (!msg.content.startsWith("/")) {
    //     return;
    // } 
    console.log(msg.content)
    // Lấy prefix server từ DB
    let serverPrefixData = await Prefix.findOne({ guildId: msg.guild.id });
    let serverPrefix = serverPrefixData ? serverPrefixData.prefix : 'w';
    let prefixes = [];

    if (serverPrefix) {
        // Nếu có local prefix → chỉ dùng local thôi
        prefixes.push(serverPrefix.toLowerCase(), serverPrefix.toUpperCase());
    } else {
        // Nếu không có local prefix → dùng global
        prefixes.push("w", "W");
    }

    // Check message có bắt đầu bằng prefix nào không
    let usedPrefix = prefixes.find(p => msg.content.startsWith(p));
    if (!usedPrefix) return;

    // Cắt prefix ra khỏi message
    const args = msg.content.slice(usedPrefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    // const args = msg.content.slice(1).trim().split(/ +/);
    // const cmd = args.shift().toLowerCase();
    const user = await UserService.findUserById(msg.author.id)
    // if (cmd === "cspirit") {
    //     await SpiritController.addSpirit()
    //     // msg.reply(embed)
    // }
    console.log(cmd)
    if (cmd === "set") {
        if (!args[0])
            return msg.reply("Missing command")
        if (args[0] === "prefix") {
            if (!args[1]) return msg.reply("⚠️ Bạn cần nhập prefix mới!");
            if (!msg.member.permissions.has("Administrator") && !msg.member.permissions.has("ManageGuild")) {
                return msg.reply("❌ Bạn không có quyền đổi prefix server!");
            }
            const newPrefix = args[1];
            await Prefix.findOneAndUpdate(
                { guildId: msg.guild.id },
                { prefix: newPrefix },
                { upsert: true }
            );
            msg.reply(`✅ Prefix server đã đổi thành: \`${newPrefix}\``);
        }
    }
    if (cmd === "awake") {
        const userId = msg.author.id;
        console.log("Đang tiến hành thức tỉnh võ hồn cho user:", userId);

        try {
            // Debug: kiểm tra số spirit hiện có
            const currentCount = await SpiritMaster.countDocuments({ userId });
            console.log("Số spirit hiện tại:", currentCount);

            const embed = await SpiritController.awakenRandomSpirit(userId);
            console.log("Kết quả trả về:", typeof embed, embed);

            if (typeof embed === 'string') {
                msg.reply(embed);
            } else if (embed && embed.data) {
                msg.reply({ embeds: [embed] });
            } else {
                console.error("Embed không hợp lệ:", embed);
                msg.reply("❌ Đã xảy ra lỗi khi tạo embed!");
            }
        } catch (error) {
            console.error("Lỗi khi thức tỉnh:", error);
            msg.reply("❌ Đã xảy ra lỗi khi thức tỉnh vũ hồn!");
        }
    }

    // Lấy thông tin chi tiết (thử, nếu lỗi sẽ fallback)
    if (cmd === "spirits") {
        try {
            const result = await SpiritController.getSpiritInfo(msg.author.id);
            msg.reply(result);
        } catch (error) {
            // Fallback về simple info nếu bị lỗi
            const result = "Lỗi lấy dữ liệu"
            msg.reply(result);
        }
    }
    if (cmd === 'battle') {
        return await BattleController.handleBattleCommand(msg, args);
    }
    if (cmd === "spirit?") {
        try {
            // Lấy số trang từ message (ví dụ: "spirit 2")
            const args = msg.content.split(' ');
            const page = args.length > 1 ? parseInt(args[1]) || 1 : 1;

            const embed = await SpiritController.showAllSpirits(page);
            return msg.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi hiển thị Vũ Hồn:', error);

            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi')
                .setDescription('Đã xảy ra lỗi khi tải danh sách Vũ Hồn!')
                .setColor(0xFF0000);

            return msg.reply({ embeds: [errorEmbed] });
        }
    }
    if (cmd === "table") {
        try {
            // Lấy số trang từ message (ví dụ: "spirit 2")
            const args = msg.content.split(' ');
            const page = args.length > 1 ? parseInt(args[1]) || 1 : 1;

            const embed = await SpiritController.showAllSpiritsTable(page);
            return msg.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi hiển thị Vũ Hồn:', error);

            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi')
                .setDescription('Đã xảy ra lỗi khi tải danh sách Vũ Hồn!')
                .setColor(0xFF0000);

            return msg.reply({ embeds: [errorEmbed] });
        }
    }
    if (cmd === "hunt") {
        // const lastUser = await UserService.findUserById(msg.author.id);
        const embed = await HuntSpiritController.huntSpirits(msg.author.id);
        msg.reply(embed);
        const currentUser = await UserService.findUserById(msg.author.id);
        if (currentUser.spiritLvl > user.spiritLvl) {
            const lvlUpEmbed = new EmbedBuilder();
            lvlUpEmbed.setTitle("Spirit Level Up!")
                .setDescription(`Congratulations, <@${msg.author.id}> reached **level ${currentUser.spiritLvl}**!`)
                .setThumbnail("https://i.ibb.co/YBQPxrNy/Lam-Ngan-Thao.png")
            msg.reply({ embeds: [lvlUpEmbed] })
        }
    }
    if (cmd === "shop") {
        const embed = await ShopController.getShopEmbed()
        msg.reply(embed)
    }
    if (cmd === "buy") {
        const userId = msg.author.id;
        const itemRef = args[0];
        let quantity = parseInt(args[1]);
        // if (!itemRef)
        //     msg.reply("Don't have item Id")
        if (!quantity || quantity < 0)
            quantity = 1;
        const embed = await ShopController.buyItem(userId, itemRef, quantity)
        msg.reply(embed)
    }
    // if (cmd === 'cit') {
    //     if (msg.author.id != "387162192346218496")
    //         return
    //     let item = new Item({
    //         name: "Common Box",
    //         price: 1000,
    //         description: "You can open present box to receive items",
    //         icon: "<:presents:1407678424780247040>",
    //         rarity: ITEM_RARITY.C,
    //         maxPerDay: 5,
    //         type: ITEM_TYPE.PRESENT_BOX
    //     })
    //     await item.save();
    //     let item2 = new Item({
    //         name: "Legendary Box",
    //         price: 100000,
    //         description: "You can open present box to receive items",
    //         icon: "<:leg_presents:1407680271901266031>",
    //         rarity: ITEM_RARITY.L,
    //         maxPerDay: 2,
    //         type: ITEM_TYPE.PRESENT_BOX
    //     })
    //     await item2.save();
    //     let item3 = new Item({
    //         name: "Rare Box",
    //         price: 1500,
    //         description: "You can open present box to receive items",
    //         icon: "<:rare_presents:1407680107316772985>",
    //         rarity: ITEM_RARITY.L,
    //         maxPerDay: 4,
    //         type: ITEM_TYPE.PRESENT_BOX
    //     })
    //     await item3.save()
    //     // return savedItem
    //     return msg.reply("Tạo item thành công!")
    // }

    if (cmd === "daily") {
        const cooldown = 1000 * 60 * 60 * 24; // 24 giờ
        const reward = {
            coin: 100, // số coin nhận
            exp: 50    // số exp nhận
        };
        let userData = user;

        // Nếu chưa có user trong DB thì tạo mới
        // if (!userData) {
        //     userData = await UserService.createUser({
        //         userId: msg.author.id,
        //     });
        // }

        // Check cooldown
        if (userData.lastDaily && Date.now() - userData.lastDaily.getTime() < cooldown) {
            const timeLeft = cooldown - (Date.now() - userData.lastDaily.getTime());
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            return msg.reply(`⏳ Bạn đã nhận daily rồi! Quay lại sau ${hours}h ${minutes}m nữa.`);
        }

        // Cập nhật coin và exp
        userData.coin += reward.coin;
        userData.exp += reward.exp;

        // Check level up (ví dụ: cần exp = lvl * 100 để lên level)
        const expToLevel = userData.lvl * 100;
        if (userData.exp >= expToLevel) {
            userData.exp -= expToLevel;
            userData.lvl += 1;
            await userData.save();
            return msg.reply(`🎉 Bạn đã nhận **${reward.coin} coin** và **${reward.exp} exp**!\n🚀 Level up! Bây giờ bạn ở level **${userData.lvl}**.`);
        }

        userData.lastDaily = new Date();
        await userData.save();
        return msg.reply(`✅ Bạn đã nhận **${reward.coin} coin** và **${reward.exp} exp**!\n📊 Level hiện tại: ${userData.lvl} | Exp: ${userData.exp}/${expToLevel}`);
    }

    if (cmd === "baucua") {
        let bet = args[0];

        // Nếu người dùng nhập "all", đặt cược toàn bộ hoặc tối đa 300000
        if (bet === "all") {
            bet = Math.min(user.coin, 300000);
        } else {
            bet = parseInt(bet);

            // Nếu không phải số hợp lệ hoặc <=0, đặt mặc định 20
            if (isNaN(bet) || bet <= 0) bet = 20;

            // Giới hạn tối đa 300000
            if (bet > 300000) bet = 300000;
        }
        if (user.coin < bet) return msg.reply("🚫 Bạn không đủ coin để đặt cược!");

        const choices = {
            "🍐": "Bầu",
            "🦀": "Cua",
            "🐟": "Cá",
            "🐓": "Gà",
            "🦌": "Nai",
            "🦁": "Hổ"
        };

        // gửi tin nhắn mời chọn
        const msgGame = await msg.reply(
            `🎲 Bạn cược **${bet} coin**. Chọn 1 con bằng reaction trong **30s**:\n🍐 Bầu | 🦀 Cua | 🐟 Cá | 🐓 Gà | 🦌 Nai | 🦁 Hổ`
        );

        // thêm reactions
        for (const emoji of Object.keys(choices)) {
            await msgGame.react(emoji);
        }

        // filter chỉ nhận reaction từ người gọi lệnh
        const filter = (reaction, userReact) => {
            return Object.keys(choices).includes(reaction.emoji.name) && userReact.id === msg.author.id;
        };

        try {
            const collected = await msgGame.awaitReactions({ filter, max: 1, time: 50000, errors: ["time"] });
            const reaction = collected.first();
            const userChoice = choices[reaction.emoji.name];

            // roll kết quả
            const resultEmoji = Object.keys(choices)[Math.floor(Math.random() * Object.keys(choices).length)];
            const resultName = choices[resultEmoji];

            let win = -bet;
            if (userChoice === resultName) win = bet * 2; // thắng x2

            user.coin += win;
            await user.save();

            msg.reply(
                `🎲 Bạn chọn: ${reaction.emoji.name} **${userChoice}**\n` +
                `Kết quả: ${resultEmoji} **${resultName}**\n` +
                `${win > 0 ? `🎉 Bạn thắng +${win} coin` : `😢 Bạn thua ${Math.abs(win)} coin`}\n` +
                `💰 Coin hiện tại: **${user.coin}**`
            );

        } catch (err) {
            msg.reply("⌛ Hết thời gian chọn! Trò chơi bị hủy.");
        }
    }


    // ================= KÉO CO =================
    if (cmd === "keoco") {
        let bet = args[0];

        // Nếu người dùng nhập "all", đặt cược toàn bộ hoặc tối đa 300000
        if (bet === "all") {
            bet = Math.min(user.coin, 300000);
        } else {
            bet = parseInt(bet);

            // Nếu không phải số hợp lệ hoặc <=0, đặt mặc định 20
            if (isNaN(bet) || bet <= 0) bet = 20;

            // Giới hạn tối đa 300000
            if (bet > 300000) bet = 300000;
        }

        if (user.coin < bet) return msg.reply("🚫 Bạn không đủ coin để đặt cược!");

        const power = Math.floor(Math.random() * 100);
        let delta = power > 50 ? bet : -bet;

        user.coin += delta;
        await user.save();

        msg.reply(
            `💪 ${msg.author} kéo với sức **${power}**!\n` +
            `${delta > 0 ? `🎉 Thắng +${delta}` : `😢 Thua ${Math.abs(delta)}`} | Coin: **${user.coin}**`
        );
    }

    // ================= JACKPOT =================
    if (cmd === "jackpot") {
        let bet = args[0];

        // Nếu người dùng nhập "all", đặt cược toàn bộ hoặc tối đa 300000
        if (bet === "all") {
            bet = Math.min(user.coin, 300000);
        } else {
            bet = parseInt(bet);

            // Nếu không phải số hợp lệ hoặc <=0, đặt mặc định 20
            if (isNaN(bet) || bet <= 0) bet = 20;

            // Giới hạn tối đa 300000
            if (bet > 300000) bet = 300000;
        }
        if (user.coin < bet) return msg.reply("🚫 Bạn không đủ coin để đặt cược!");

        const slots = ["🍒", "🍋", "🍊", "⭐", "💎"];
        let roll = ["❓", "❓", "❓"];
        let pulls = 0;

        const gameMsg = await msg.reply(
            `🎰 ${msg.author} cược **${bet}** coin!\n` +
            `Kết quả: [${roll.join(" ")}]\n` +
            `Nhấn 🎲 🪙 💎 để rút icon (mỗi reaction 1 lần, 3 lượt)`
        );

        // thêm 3 reaction cho người chơi chọn
        const reactions = ["🎲", "🪙", "💎"];
        for (const r of reactions) await gameMsg.react(r);

        const filter = (reaction, userReact) => reactions.includes(reaction.emoji.name) && userReact.id === msg.author.id;
        const collector = gameMsg.createReactionCollector({ filter, time: 30000 });

        collector.on("collect", async (reaction) => {
            if (pulls >= 3) return;

            // xác định vị trí cần điền icon
            const pos = pulls;
            pulls++;

            // random icon cho vị trí đó
            roll[pos] = slots[Math.floor(Math.random() * slots.length)];

            await gameMsg.edit(
                `🎰 ${msg.author} cược **${bet}** coin!\n` +
                `Lượt rút ${pulls}/3: [${roll.join(" ")}]\n` +
                `${pulls < 3 ? "Tiếp tục nhấn 🎲 🪙 💎 để rút..." : ""}`
            );

            if (pulls === 3) {
                collector.stop();

                // tính kết quả
                let delta = -bet;
                if (roll[0] === roll[1] && roll[1] === roll[2]) delta = bet * 5;
                else if (roll[0] === roll[1] || roll[1] === roll[2] || roll[0] === roll[2]) delta = bet * 2;

                user.coin += delta;
                await user.save();

                await gameMsg.edit(
                    `🎰 ${msg.author} cược **${bet}** coin!\n` +
                    `Kết quả cuối: [${roll.join(" ")}]\n` +
                    `${delta > 0 ? `🎉 ${msg.author} thắng +${delta}` : `😢 ${msg.author} thua ${Math.abs(delta)}`} | Coin: **${user.coin}**`
                );
            }
        });
    }




    // ================= KÉO BÚA BAO =================
    if (cmd === "keobuabao") {
        let bet = args[0];

        // Nếu người dùng nhập "all", đặt cược toàn bộ hoặc tối đa 300000
        if (bet === "all") {
            bet = Math.min(user.coin, 300000);
        } else {
            bet = parseInt(bet);

            // Nếu không phải số hợp lệ hoặc <=0, đặt mặc định 20
            if (isNaN(bet) || bet <= 0) bet = 20;

            // Giới hạn tối đa 300000
            if (bet > 300000) bet = 300000;
        }
        if (user.coin < bet) return msg.reply("🚫 Bạn không đủ coin để đặt cược!");

        const rps = ["✊", "✋", "✌️"]; // keo, bua, bao
        const prompt = await msg.reply(
            `⚔️ ${msg.author} cược **${bet}** coin!\n` +
            `Chọn trong 30s bằng reaction:\n✊ = Kéo | ✋ = Búa | ✌️ = Bao`
        );

        await prompt.react("✊");
        await prompt.react("✋");
        await prompt.react("✌️");

        const filter = (reaction, userReact) => rps.includes(reaction.emoji.name) && userReact.id === msg.author.id;
        const collected = await prompt.awaitReactions({ filter, max: 1, time: 30000 });

        if (!collected.size) return msg.reply("⏳ Hết thời gian chọn!");

        const userPick = collected.first().emoji.name;
        const botPick = rps[Math.floor(Math.random() * rps.length)];

        let result = "";
        let delta = 0;

        if (
            (userPick === "✊" && botPick === "✌️") ||
            (userPick === "✋" && botPick === "✊") ||
            (userPick === "✌️" && botPick === "✋")
        ) {
            result = `🎉 ${msg.author} thắng!`;
            delta = bet;
        } else if (
            (userPick === "✊" && botPick === "✋") ||
            (userPick === "✋" && botPick === "✌️") ||
            (userPick === "✌️" && botPick === "✊")
        ) {
            result = `😢 ${msg.author} thua!`;
            delta = -bet;
        } else {
            result = "🤝 Hòa!";
            delta = 0;
        }

        user.coin += delta;
        await user.save();

        msg.reply(
            `🤖 Bot chọn: ${botPick}\n` +
            `👤 Bạn chọn: ${userPick}\n` +
            `${result}\n` +
            `Kết toán: ${delta > 0 ? `+${delta}` : delta} | Coin: **${user.coin}**`
        );
    }
    if (cmd === "baicao") {
        let bet = args[0];

        // Nếu người dùng nhập "all", đặt cược toàn bộ hoặc tối đa 300000
        if (bet === "all") {
            bet = Math.min(user.coin, 300000);
        } else {
            bet = parseInt(bet);

            // Nếu không phải số hợp lệ hoặc <=0, đặt mặc định 20
            if (isNaN(bet) || bet <= 0) bet = 20;

            // Giới hạn tối đa 300000
            if (bet > 300000) bet = 300000;
        }
        await user.save();

        const cards = [
            { emoji: "🂡", value: 1 }, { emoji: "🂢", value: 2 }, { emoji: "🂣", value: 3 },
            { emoji: "🂤", value: 4 }, { emoji: "🂥", value: 5 }, { emoji: "🂦", value: 6 },
            { emoji: "🂧", value: 7 }, { emoji: "🂨", value: 8 }, { emoji: "🂩", value: 9 },
            { emoji: "🂪", value: 10 }, { emoji: "🂫", value: 10 }, { emoji: "🂭", value: 10 },
            { emoji: "🂮", value: 10 }
        ];

        let playerHand = [null, null, null];
        let botHand = [cards[Math.floor(Math.random() * cards.length)],
        cards[Math.floor(Math.random() * cards.length)],
        cards[Math.floor(Math.random() * cards.length)]];

        const drawMsg = await msg.reply(`${msg.author}, chọn lần rút: 1️⃣, 2️⃣, 3️⃣`);
        const drawReactions = ["1️⃣", "2️⃣", "3️⃣"];
        for (const r of drawReactions) await drawMsg.react(r);

        const filter = (reaction, userReact) => drawReactions.includes(reaction.emoji.name) && userReact.id === msg.author.id;
        const collector = drawMsg.createReactionCollector({ filter, time: 30000 });

        collector.on("collect", async (reaction) => {
            const idx = drawReactions.indexOf(reaction.emoji.name);
            if (playerHand[idx]) return; // đã rút lần này

            playerHand[idx] = cards[Math.floor(Math.random() * cards.length)];

            // build hiển thị: lá rút vs ?
            const displayPlayer = playerHand.map(c => c ? c.emoji : "?").join(" ");
            const displayBot = botHand.map((c, i) => i <= idx ? c.emoji : "?").join(" ");

            await drawMsg.edit(
                `Lần rút ${idx + 1}:\n🃏 Bài của bạn: [${displayPlayer}]\n🤖 Bài của bot: [${displayBot}]`
            );

            // nếu đã rút xong 3 lá, tính điểm
            if (playerHand.filter(Boolean).length === 3) {
                const calcPoint = (hand) => hand.reduce((sum, c) => sum + c.value, 0) % 10;
                const playerPoint = calcPoint(playerHand);
                const botPoint = calcPoint(botHand);

                let result = "";
                let delta = -bet;
                if (playerPoint > botPoint) {
                    result = `🎉 ${msg.author} thắng!`;
                    delta = bet * 2;
                } else if (playerPoint < botPoint) {
                    result = `😢 ${msg.author} thua!`;
                    delta = 0;
                } else {
                    result = "🤝 Hòa!";
                    delta = bet;
                }

                user.coin += delta;
                await user.save();

                drawMsg.edit(
                    `🃏 Bài của bạn: [${playerHand.map(c => c.emoji).join(" ")}] → Nút ${playerPoint}\n` +
                    `🤖 Bài của bot: [${botHand.map(c => c.emoji).join(" ")}] → Nút ${botPoint}\n` +
                    `${result} | Coin: ${user.coin}`
                );
                collector.stop();
            }
        });

        collector.on("end", collected => {
            if (playerHand.filter(Boolean).length < 3) drawMsg.edit("⏳ Bạn đã hết thời gian rút bài!");
        });
    }
    // } 
    // catch (error) {
    //     console.error("⚠️ Lỗi interactionCreate:", error);

    //     // Gửi báo cáo bug tới dev
    //     const devUser = await client.users.fetch(process.env.DEVELOPER_ID);
    //     if (devUser) {
    //         await devUser.send({
    //             content: `🐞 **Báo cáo lỗi interaction**\n` +
    //                 `**User:** ${interaction.user.tag} (${interaction.user.id})\n` +
    //                 `**Interaction Type:** ${interaction.type}\n` +
    //                 `**Error:**\n\`\`\`${error.stack}\`\`\``
    //         });
    //     }
    // }



    // if(message.author.id!="387162192346218496")
    //     return;
    // // Handle commands
    // const args = message.content.slice(1).trim().split(/ +/);
    // const command = args.shift().toLowerCase();
    // console.log(`Received command: ${command} in channel: ${message.channel.id}`);
    // // const game = GameService.getGameByChannel(message.channel.id);
    // const user = await UserService.findUserById(message.author.id);
    // if (!user)
    //     await UserService.createNewUser(message.author.id);
    // switch (command) {
    //     case 'create':
    //         return GameController.handleCreateRoom(message);
    //     case 'join':
    //     case 'cj':
    //         return GameController.handleJoinCommand(message);
    //     case 'new':
    //         return GameController.handleCreateNewRoom(message);
    //     case 'wallet':
    //         return UserController.handleBalance(message);
    //     case 'wgive':
    //         {
    //             const args = message.content.trim().split(/\s+/);
    //             const balance = args[2];
    //             const mentionUser = message.mentions.users.first();
    //              if (!mentionUser) {
    //                         embed.setTitle("❌Transfer Error!")
    //                             .setDescription(`You must mention receiver first!`)
    //                             .setColor('Red');
    //                         return message.reply({ embeds: [embed] });
    //                     }

    //                     if (mentionUser.id == message.author.id) {
    //                         embed.setTitle("❌Transfer Error!")
    //                             .setDescription(`You can't send money to yourself!`)
    //                             .setColor('Red');
    //                         return message.reply({ embeds: [embed] });
    //                     }
    //             return UserController.giveMoneyTo(message,mentionUser, balance);
    //         }
    //     case 'start':
    //         return GameController.handleStartGame(message);
    //     case 'increse-exp':
    //         {
    //             if (message.author.id != "387162192346218496")
    //                 return message.reply("You don't have permission to do this action!")
    //             return UserController.addExperience("387162192346218496", 500, message)
    //         }
    //     case 'donate':
    //         {
    //             return message.reply({ content: "🔗 Momo: 0827626203 \n Name: Huỳnh Trung Kiên", ephemeral: true });
    //         }
    //     default:
    //         return message.reply("⚠️ Lệnh không hợp lệ.");
    // }
}
module.exports = { handleMessageCreate };
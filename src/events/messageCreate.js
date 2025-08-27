// handleMessageCreate.js
const GameController = require('../controllers/gameController');
const GameService = require('../services/gameService');
const { TEAMS, PHASES, ITEM_RARITY, ITEM_TYPE, DEFAULT_EXP_LVL1, STEP_EXP } = require('../config/constants');
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
const SpiritRingController = require('../controllers/DauLaDaiLuc/spiritRingController');
const { wolfCoin } = require('../utils/wolfCoin');
const MiniGameController = require('../controllers/miniGameController');
const handleMessageCreate = async (client, msg) => {
    // try {
    if (msg.author.bot || !msg.guild) return;
    console.log(msg.author.globalName + ": " + msg.content + " " + msg.guild.name)
    // if (!msg.content.startsWith("/")) {
    //     return;
    // } 
    // console.log(msg.content)
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
    else if (cmd === "awake") {
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
    // else if (cmd === "spirits") {
    //     try {
    //         const result = await SpiritController.getSpiritInfo(msg.author.id);
    //         msg.reply(result);
    //     } catch (error) {
    //         // Fallback về simple info nếu bị lỗi
    //         const result = "Lỗi lấy dữ liệu"
    //         msg.reply(result);
    //     }
    // }
    else if (cmd === 'battle') {
        return await BattleController.handleBattleCommand(msg, args);
    }
    else if (cmd === "spirit" || cmd === "spi") {
        const args = msg.content.split(' ');
        console.log(args)
        if (args.length <= 0)
            return msg.reply({ content: "Bạn cần ít nhất 1 tham số" })
        if (args[1] === "list" || args[1] === "l") {
            try {
                // Lấy số trang từ message (ví dụ: "spirit 2")

                const page = args.length > 2 ? parseInt(args[2]) || 1 : 1;

                const embed = await SpiritController.showAllSpirits(page);
                return msg.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Lỗi khi hiển thị Vũ Hồn:', error);

                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Lỗi')
                    .setDescription('Đã xảy ra lỗi khi tải danh sách Vũ Hồn!')
                    .setColor(0xFF0000);

                return await msg.reply({ embeds: [errorEmbed] });
            }
        } else if (args[1] === "information" || args[1] === "i")
            try {
                const result = await SpiritController.getSpiritInfo(msg.author.id);
                msg.reply(result);
            } catch (error) {
                // Fallback về simple info nếu bị lỗi
                const result = "Lỗi lấy dữ liệu"
                msg.reply(result);
            }
        else if (args[1] === "attach" || args[1] === "a") {
            console.log(args)
            const spiritRef = args[2];
            const ringRef = args[3]
            if (!spiritRef)
                return await msg.reply({ content: "Thiếu spiritRef" })
            if (!ringRef)
                return await msg.reply({ content: "Thiếu ringId" })
            const embed = await SpiritController.attachRing(msg.author.id, spiritRef, ringRef)
            return await msg.reply(embed)
        }
        else if (args[1] === "ring" || args[1] == "r") {
            const userId = msg.author.id;
            const { embeds, components } = await SpiritRingController.getSpiritRingsEmbed(userId);

            await msg.reply({ embeds, components });
        }
    }
    else if (cmd === "profile" || cmd === "p") {
        const userId = msg.author.id;
        const avatarUrl = msg.author.displayAvatarURL()
        const username = msg.author.globalName || msg.author.username
        const embed = await UserController.createProfileEmbed(userId, avatarUrl, username)
        // Gửi embed
        return await msg.reply({ embeds: [embed] });
    }
    else if (cmd === "table") {
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
    else if (cmd === "hunt") {
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
    else if (cmd === "join" || cmd === "j") {
        await GameController.handleJoinCommand(msg);
        return;
    }
    else if (cmd === "new" || cmd === "n") {
        const embed = await GameController.handleCreateNewRoom(msg.channel.id);
        await msg.reply({ embeds: [embed] });
        return;
    }
    // else if (cmd === "create" || cmd === "c") {
    //     await GameController.handleCreateRoom(msg);
    //     return;
    // }
    else if (cmd === "start" || cmd === "s") {
        await GameController.handleStartGame(msg);
        return;
    }
    else if (cmd === "shop") {
        const embed = await ShopController.getShopEmbed()
        msg.reply(embed)
    }
    else if (cmd === "wallet" || cmd == "w") {
        await UserController.handleBalance(msg);
        return;
    }
    else if (cmd === "give" || cmd === "g") {
        const args = msg.content.trim().split(/\s+/);
        const balance = args[2];
        const mentionUser = msg.mentions.users.first();
        if (!mentionUser) {
            embed.setTitle("❌Transfer Error!")
                .setDescription(`You must mention receiver first!`)
                .setColor('Red');
            return msg.reply({ embeds: [embed] });
        }

        if (mentionUser.id == msg.author.id) {
            embed.setTitle("❌Transfer Error!")
                .setDescription(`You can't send money to yourself!`)
                .setColor('Red');
            return msg.reply({ embeds: [embed] });
        }
        return UserController.giveMoneyTo(msg, mentionUser, balance);
    }
    else if (cmd === "buy") {
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
    else if (cmd === "help") {
        // const { EmbedBuilder } = require('discord.js');

        const commandGroups = {
            werewolf: {
                name: "Werewolf",
                description: "Các lệnh chơi Ma Sói",
                emoji: "🐺",
                color: "#8B4513",
                commands: [
                    { name: "wnew / wn", desc: "Tạo phòng mới" },
                    { name: "wjoin / wj", desc: "Tham gia phòng" },
                    { name: "wstart / ws", desc: "Bắt đầu game" },
                ]
            },
            soulland: {
                name: "Soul Land",
                description: "Các lệnh Đấu La Đại Lục",
                emoji: "🌌",
                color: "#9370DB",
                commands: [
                    { name: "/awake", desc: "Thức tỉnh Vũ Hồn" },
                    { name: "/spirit list <page>", desc: "Xem danh sách Vũ Hồn" },
                    { name: "/spirit information", desc: "Xem chi tiết Vũ Hồn" },
                    { name: "wspirit attach <spiritRef> <ringId>", desc: "Khảm Hồn Hoàn" },
                    { name: "whunt", desc: "Săn Hồn Thú (có thể nhận Hồn Hoàn)" },
                    { name: "wbattle <@user> hoặc /battle <@user>", desc: "Khiêu chiến người khác" },
                ]
            },
            economy: {
                name: "Kinh tế",
                description: "Các lệnh liên quan đến tiền tệ",
                emoji: "💰",
                color: "#FFD700",
                commands: [
                    { name: "/wallet", desc: "Xem ví tiền" },
                    { name: "/give <@user> <amount>", desc: "Chuyển coin cho người khác" },
                    { name: "/donate", desc: "Ủng hộ tác giả ☕" },
                    { name: "wdaily", desc: "Nhận thưởng hằng ngày" },
                ]
            },
            shop: {
                name: "Shop",
                description: "Mua bán vật phẩm",
                emoji: "🛒",
                color: "#00CED1",
                commands: [
                    { name: "wshop", desc: "Xem cửa hàng" },
                    { name: "wbuy <itemId> <số lượng>", desc: "Mua vật phẩm" },
                ]
            },
            minigame: {
                name: "Minigames",
                description: "Các trò chơi nhỏ",
                emoji: "🎮",
                color: "#FF69B4",
                commands: [
                    { name: "wbaucua <bet>", desc: "Chơi Bầu Cua" },
                    { name: "wkeoco <bet>", desc: "Chơi Kéo Cưa" },
                    { name: "wjackpot <bet>", desc: "Jackpot (xèng máy)" },
                    { name: "wkeobuabao <bet>", desc: "Kéo Búa Bao" },
                    { name: "wbaicao <bet>", desc: "Bài Cào" },
                ]
            },
            system: {
                name: "Cấu hình & Hệ thống",
                description: "Các lệnh quản lý bot",
                emoji: "⚙️",
                color: "#808080",
                commands: [
                    { name: "/set prefix <value>", desc: "Đặt prefix mới (Admin)" },
                    { name: "/about", desc: "Giới thiệu bot" },
                    { name: "/help", desc: "Xem hướng dẫn" },
                ]
            }
        };

        const groupArg = args[0]; // Lấy tham số đầu tiên

        if (!groupArg) {
            // Hiển thị tất cả nhóm lệnh
            const embed = new EmbedBuilder()
                .setTitle("📖 Hướng Dẫn Sử Dụng Bot")
                .setDescription("Dưới đây là danh sách các nhóm lệnh có sẵn. Sử dụng `whelp [tên nhóm]` để xem chi tiết từng nhóm.")
                .setColor("#0099FF")
                .setThumbnail(msg.client.user.displayAvatarURL())
                .setFooter({ text: `Yêu cầu bởi ${msg.author.tag}`, iconURL: msg.author.displayAvatarURL() })
                .setTimestamp();

            for (const key in commandGroups) {
                const group = commandGroups[key];
                embed.addFields({
                    name: `${group.emoji} ${group.name}`,
                    value: `${group.description}\n\`whelp ${key}\``,
                    inline: true
                });
            }
            embed.addFields({
                name: `Join Our Support Server`,
                value: `👉 [Click here](https://discord.com/oauth2/authorize?client_id=123&scope=bot) to join!"`,
                inline: false
            })
            return msg.reply({ embeds: [embed] });
        }

        const groupKey = {
            ww: "werewolf",
            sl: "soulland",
            eco: "economy",
            shop: "shop",
            mini: "minigame",
            sys: "system"
        }[groupArg.toLowerCase()] || groupArg.toLowerCase();

        const group = commandGroups[groupKey];
        if (!group) {
            return msg.reply({
                content: "❌ Nhóm lệnh không tồn tại! Sử dụng `whelp` để xem danh sách nhóm lệnh."
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`${group.emoji} Nhóm lệnh: ${group.name}`)
            .setDescription(group.description)
            .setColor(group.color)
            .setFooter({ text: `<> = bắt buộc, [] = tuỳ chọn • Yêu cầu bởi ${msg.author.tag}`, iconURL: msg.author.displayAvatarURL() })
            .setTimestamp();

        group.commands.forEach(cmd => {
            embed.addFields({
                name: `\`${cmd.name}\``,
                value: cmd.desc,
                inline: false
            });
        });
        embed.addFields([
            {
                name: "Join Our Support Server",
                value: "👉 [Click here](https://discord.gg/kDkydXrtua)",
                inline: false
            }
        ]);

        return msg.reply({ embeds: [embed] });


    }
    else if (cmd === "daily") {
        const cooldown = 1000 * 60 * 60 * 24;
        const reward = {
            coin: 100 + Math.floor(Math.random() * 50),
            exp: 50 + Math.floor(Math.random() * 30),
            bonus: Math.random() < 0.2
        };

        let userData = user;

        // Check cooldown
        if (userData.lastDaily && Date.now() - userData.lastDaily.getTime() < cooldown) {
            const timeLeft = cooldown - (Date.now() - userData.lastDaily.getTime());
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

            const cooldownEmbed = new EmbedBuilder()
                .setColor('#FF5555')
                .setTitle('⏰ Đã nhận Daily rồi!')
                .setDescription(`Bạn cần chờ thêm **${hours}h ${minutes}m** nữa để nhận daily tiếp theo.`)
                .addFields(
                    { name: '⏰ Lần cuối nhận', value: `<t:${Math.floor(userData.lastDaily.getTime() / 1000)}:R>`, inline: true },
                    { name: '🕒 Còn lại', value: `${hours}h ${minutes}m`, inline: true }
                )
                .setFooter({ text: 'Daily reset mỗi 24 giờ' });

            return msg.reply({ embeds: [cooldownEmbed] });
        }

        // Tính toán reward
        let totalCoin = reward.coin;
        let totalExp = reward.exp;
        let bonusText = '';

        if (reward.bonus) {
            const bonusCoin = Math.floor(totalCoin * 0.5);
            const bonusExp = Math.floor(totalExp * 0.5);
            totalCoin += bonusCoin;
            totalExp += bonusExp;
            bonusText = `🎁 **Bonus:** +${bonusCoin} coin +${bonusExp} exp`;
        }

        // Cập nhật dữ liệu
        userData.coin += totalCoin;
        userData.exp += totalExp;

        // Check level up
        let levelUpText = '';
        let levelsGained = 0;
        const originalLevel = userData.lvl;

        while (userData.exp >= userData.lvl * 100) {
            const expNeeded = userData.lvl * DEFAULT_EXP_LVL1;
            userData.exp -= expNeeded;
            userData.lvl += 1;
            levelsGained++;
        }

        if (levelsGained > 0) {
            if (levelsGained === 1) {
                levelUpText = `🚀 **Level Up!** Level ${originalLevel} → **${userData.lvl}**`;
            } else {
                levelUpText = `🚀 **Level Up!** +${levelsGained} levels (${originalLevel} → **${userData.lvl}**)`;
            }
        }
        const expToLevel = Number(user.lvl) * Number(DEFAULT_EXP_LVL1) * Number(STEP_EXP);

        userData.lastDaily = new Date();
        await userData.save();

        // Tạo embed thành công
        const successEmbed = new EmbedBuilder()
            .setColor('#55FF55')
            .setTitle('🎉 Daily Reward')
            .setDescription('Bạn đã nhận daily thành công!')
            .addFields(
                { name: '💰 Coin nhận được', value: `**${wolfCoin(totalCoin)}** coin`, inline: true },
                { name: '⭐ EXP nhận được', value: `**${totalExp.toLocaleString("en-US")}** exp`, inline: true },
                { name: '📊 Level hiện tại', value: `**${userData.lvl.toLocaleString("en-US")}**`, inline: true },
                { name: '🎯 EXP hiện tại', value: `**${userData.exp.toLocaleString("en-US")}/${expToLevel.toLocaleString("en-US")}**`, inline: true },
                { name: '🏦 Tổng coin', value: `**${wolfCoin(userData.coin)}**`, inline: true }
            )
            .setFooter({ text: `Daily tiếp theo:${new Date(Date.now() + cooldown).toLocaleTimeString()} ngày ${new Date(Date.now() + cooldown).toLocaleDateString()}` });

        // Thêm bonus field nếu có
        if (bonusText) {
            successEmbed.addFields({ name: '🎁 May mắn', value: bonusText, inline: false });
        }

        // Thêm level up field nếu có
        if (levelUpText) {
            successEmbed.addFields({ name: '✨ Thành tựu', value: levelUpText, inline: false });
        }

        return msg.reply({ embeds: [successEmbed] });
    }
    else if (cmd === "baucua") {
        let bet = args[0];
        MiniGameController.bauCua(msg.author.id, msg, bet)
    }
    // else if (cmd === "baucua") {
    //     let bet = args[0];

    //     // Nếu người dùng nhập "all", đặt cược toàn bộ hoặc tối đa 300000
    //     if (bet === "all") {
    //         bet = Math.min(user.coin, 300000);
    //     } else {
    //         bet = parseInt(bet);

    //         // Nếu không phải số hợp lệ hoặc <=0, đặt mặc định 20
    //         if (isNaN(bet) || bet <= 0) bet = 20;

    //         // Giới hạn tối đa 300000
    //         if (bet > 300000) bet = 300000;
    //     }
    //     if (user.coin < bet) return msg.reply("🚫 Bạn không đủ coin để đặt cược!");

    //     const choices = {
    //         "🍐": "Bầu",
    //         "🦀": "Cua",
    //         "🐟": "Cá",
    //         "🐓": "Gà",
    //         "🦌": "Nai",
    //         "🦁": "Hổ"
    //     };

    //     // gửi tin nhắn mời chọn
    //     const msgGame = await msg.reply(
    //         `🎲 Bạn cược **${bet} coin**. Chọn 1 con bằng reaction trong **30s**:\n🍐 Bầu | 🦀 Cua | 🐟 Cá | 🐓 Gà | 🦌 Nai | 🦁 Hổ`
    //     );

    //     // thêm reactions
    //     for (const emoji of Object.keys(choices)) {
    //         await msgGame.react(emoji);
    //     }

    //     // filter chỉ nhận reaction từ người gọi lệnh
    //     const filter = (reaction, userReact) => {
    //         return Object.keys(choices).includes(reaction.emoji.name) && userReact.id === msg.author.id;
    //     };

    //     try {
    //         const collected = await msgGame.awaitReactions({ filter, max: 1, time: 50000, errors: ["time"] });
    //         const reaction = collected.first();
    //         const userChoice = choices[reaction.emoji.name];

    //         // roll kết quả
    //         const resultEmoji = Object.keys(choices)[Math.floor(Math.random() * Object.keys(choices).length)];
    //         const resultName = choices[resultEmoji];

    //         let win = -bet;
    //         if (userChoice === resultName) win = bet * 2; // thắng x2

    //         user.coin += win;
    //         await user.save();

    //         msg.reply(
    //             `🎲 Bạn chọn: ${reaction.emoji.name} **${userChoice}**\n` +
    //             `Kết quả: ${resultEmoji} **${resultName}**\n` +
    //             `${win > 0 ? `🎉 Bạn thắng +${win} coin` : `😢 Bạn thua ${Math.abs(win)} coin`}\n` +
    //             `💰 Coin hiện tại: **${user.coin}**`
    //         );

    //     } catch (err) {
    //         msg.reply("⌛ Hết thời gian chọn! Trò chơi bị hủy.");
    //     }
    // }


    // ================= KÉO CO =================
    else if (cmd === "keoco") {
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
    else if (cmd === "jackpot") {
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
    else if (cmd === "keobuabao") {
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
    else if (cmd === "baicao") {
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
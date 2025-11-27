// handleMessageCreate.js
const GameController = require('../controllers/gameController');
const GameService = require('../services/gameService');
const { TEAMS, PHASES, ITEM_RARITY, ITEM_TYPE, DEFAULT_EXP_LVL1, STEP_EXP } = require('../config/constants');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
const { wolfCoin, wolfIcon } = require('../utils/wolfCoin');
const MiniGameController = require('../controllers/miniGameController');
const LanguageController = require("../controllers/languageController")
const { t } = require('../i18n');
const PetService = require('../services/petService');
const PetController = require('../controllers/petController');
const { calculateLuckyBuff } = require('../utils/calculateLuckyBuff');
const Notification = require('../models/Notification');
const TopController = require('../controllers/topController');
const ServerController = require('../controllers/serverController');
// const GiveawayHandlers = require('./giveAwayHandlers');
const TicketController = require('../controllers/ticketController');
const MineController = require('../controllers/mineController');
const MarryController = require('../controllers/marryController');
const CommonController = require('../controllers/commonController');
const StreakController = require('../controllers/streakController');
const InventoryController = require('../controllers/inventoryController');
const CraftController = require('../controllers/craftController');
const ToolUseController = require('../controllers/toolUseController');
const ChopController = require('../controllers/chopController');
const SellController = require('../controllers/sellIController');
const FriendActionController = require('../controllers/friendActionController');
// Thêm vào phần imports
const handleMessageCreate = async (client, msg) => {
    // try {
    // deleteSpam = await ServerController.deleteSpamMessages(msg);

    if (msg.author.bot || !msg.guild) return;
    // Lấy prefix server từ DB
    let serverPrefixData = await Prefix.findOne({ guildId: msg.guild.id });
    let serverPrefix = serverPrefixData ? serverPrefixData.prefix : 'k';
    let prefixes = [];

    if (serverPrefix) {
        prefixes.push(serverPrefix.toLowerCase(), serverPrefix.toUpperCase());
    } else {
        prefixes.push("k", "K");
    }

    // Check message có bắt đầu bằng prefix nào không
    let usedPrefix = prefixes.find(p => msg.content.startsWith(p));
    if (!usedPrefix) return;

    // Cắt prefix ra khỏi message
    const args = msg.content.slice(usedPrefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const user = await UserService.findUserById(msg.author.id)

    let lang = await LanguageController.getLang(msg.guild.id)

    const perms = msg.channel.permissionsFor(msg.client.user);
    if (!perms.has("SendMessages")) {
        console.log("❌ Bot không có quyền SendMessages trong channel này");
        return await msg.channel.send("Bot không có quyền SendMessages trong channel");
    }
    if (!perms.has("EmbedLinks")) {
        console.log("⚠️ Bot không có quyền EmbedLinks, sẽ gửi plain text");
        return await msg.channel.send("Bot không có quyền EmbedLinks");
    }
    if (cmd === "clear" || cmd === "purge") {
        if (!msg.member.permissions.has("ManageMessages")) {
            return msg.reply(`❌ ${t('e.permission', lang)}`);
        }
        const deleteCount = parseInt(args[0], 10);
        if (!deleteCount || deleteCount < 1 || deleteCount > 1000) {
            return msg.reply(`⚠️ ${t('w.del_limit', lang)}`);
        }
        await ServerController.deleteMessages(msg.channel, deleteCount);
        return;
    }
    else if (cmd === "giveaway" || cmd === "gaw") {
        return await GiveawayHandlers.handleGiveawayCommand(msg, args, serverPrefix, lang);
    }
    if (cmd === "use") {
        const type = args[0]
        console.log("Use")
        if (!type)
            throw new Error("Missing type")
        if (type === "tool") {
            const toolRef = args[1]
            if (!toolRef)
                return msg.reply("Missing itemRef")
            console.log("Tool")

            const data = await ToolUseController.usedTool(msg.author.id, toolRef)
            console.log(data)
            return msg.reply(data.message)
        }

    }
    if (cmd === "invite") {
        if (!args[0]) {
            const inv = await UserController.createInviteCode(msg.author.id)
            return msg.reply(`${wolfCoin(10000)}${t('inv.ad_succ', lang)} ${inv.code} ${t('inv.ad_succ2', lang)} ${inv.code}**`)
        }
        const code = args[0]
        const embed = await UserController.fillInviteCode(msg.author.id, code)
        return msg.reply(embed)
    }
    else if (cmd === "divorce") {
        console.log("Hi!")

        const result = await MarryController.divorceRequest(msg.author.id, client)
        return await msg.reply(result.message)

    }
    if (cmd === "marry") {
        console.log("Hi!")
        const target = msg.mentions.users.first()
        // console.log(targetId)
        if (!target) {
            const response = await MarryController.marryStatus(msg.author.id)
            console.log(response.messsage)
            return await msg.reply(response.message)

        } else {
            const ringRef = args[1]
            console.log(ringRef)

            if (!ringRef)
                return await msg.reply("Câu hôn mà không mang nhẫn hả cha? Thêm Ring Ref vào!")
            console.log("Hi!")

            const result = await MarryController.marry(msg.author.id, target.id, ringRef, client)
            console.log(result)
            return await msg.reply(result.message)
        }

    }
    if (cmd === "mine") {
        let areaIndex = parseInt(args[0])
        if (!areaIndex)
            areaIndex = 0
        const result = await MineController.mine(msg.author.id, areaIndex)
        return msg.reply(result.message)
    }
    if (cmd === "chop") {
        let areaIndex = parseInt(args[0])
        if (!areaIndex)
            areaIndex = 0
        const result = await ChopController.chop(msg.author.id, areaIndex)
        return msg.reply(result.message)
    }
    if (cmd === "gaveaway" || cmd === "gaw") {
        // console.log(`Giveaway command by ${userId} in guild ${guildId}: ${subCommand}`);
        // return await handleGiveawayCommand(msg, args, serverPrefix, lang);

    }

    if (cmd === "top") {
        return await TopController.handleTopCommand(msg, args, false, client);
    }
    if (cmd === "streak") {
        const data = await StreakController.getUserStreakInfo(client, msg.author.id, msg.guild.id, 1);
        return msg.reply(data);
    }
    if (cmd === "status") {
        const devUser = await client.users.fetch(process.env.DEVELOPER_ID);
        console.log(devUser)
        if (msg.author.id = process.env.DEVELOPER_ID)
            // return;

            if (devUser) {
                console.log("Send server!")
                let guildList = "";
                client.guilds.cache.forEach(guild => {
                    guildList += `📌 ${guild.name} (ID: ${guild.id}) | 👥 ${guild.memberCount} thành viên\n`;
                });

                const embed = new EmbedBuilder()
                    .setTitle("📊 Danh sách server bot đã join")
                    .setDescription(guildList || "Bot chưa tham gia server nào.")
                    .setColor("Blue")
                    .setFooter({ text: `Total Server: ${client.guilds.cache.size}` })
                devUser.send({ embeds: [embed] }).catch(err => {
                    console.error("Không thể gửi DM tới developer:", err);
                });
            }
    }
    if (cmd === "ticket") {
        const cateType = args[0] || 'general'

        const result = await TicketController.createTicket(client, cateType, msg.author.id, msg.guild.id)
        return msg.reply(result.message)
    }
    if (cmd === "ticket_close_all") {
        const result = await TicketController.closeAllTicket(client, msg.author.id, msg.guild.id)
        return msg.reply(result.message)
    }

    if (cmd === 'ticket_tool') {
        if (!msg.member.permissions.has("Administrator") && !msg.member.permissions.has("ManageGuild")) {
            return msg.reply(`❌ ${t('e.permission', lang)}`);
        }
        return msg.reply(TicketController.sendTool(msg.guild.id))
    }

    if (cmd === "ticket_setting") {
        const act = args[0]
        const cateType = args[1]

        if (!act || !cateType)
            return msg.reply("❌ Thiếu tham số. Sử dụng: `kticket_setting <required/notify/delete_required/delete_notify> <cateType> <mentions>`")

        // Kiểm tra quyền
        if (!msg.member.permissions.has("Administrator") && !msg.member.permissions.has("ManageGuild")) {
            return msg.reply(`❌ ${t('e.permission', lang)}`);
        }

        if (act === 'required') {
            // Lấy tất cả mention role
            const mentionedRoles = msg.mentions.roles.map(role => role.id);

            if (mentionedRoles.length === 0) {
                return msg.reply("❌ Vui lòng mention ít nhất một role để thêm vào required roles");
            }

            // Gọi hàm gắn mention role vào required
            const result = await TicketController.addRolesRequired(client, msg.guild.id, cateType, mentionedRoles);

            if (result.success) {
                return msg.reply(`✅ Đã thêm ${mentionedRoles.length} role vào required roles cho category "${cateType}"`);
            } else {
                return msg.reply(`❌ Lỗi: ${result.message}`);
            }
        }
        else if (act === 'notify') {
            // Lấy tất cả mention user và role
            const mentionedUsers = msg.mentions.users.map(user => user.id);
            const mentionedRoles = msg.mentions.roles.map(role => role.id);

            if (mentionedUsers.length === 0 && mentionedRoles.length === 0) {
                return msg.reply("❌ Vui lòng mention ít nhất một user hoặc role để thêm vào notify");
            }

            // Gọi hàm gắn role và user
            const result = await TicketController.addRolesAndUsersToCategory(
                client,
                msg.guild.id,
                cateType,
                mentionedUsers,
                mentionedRoles
            );

            if (result.success) {
                let response = `✅ Đã cập nhật notify cho category "${cateType}"\n`;
                if (mentionedUsers.length > 0) response += `👥 Users: ${mentionedUsers.length}\n`;
                if (mentionedRoles.length > 0) response += `🎭 Roles: ${mentionedRoles.length}`;
                return msg.reply(response);
            } else {
                return msg.reply(`❌ Lỗi: ${result.message}`);
            }
        }
        else if (act === 'delete_required') {
            // Lấy tất cả mention role
            const mentionedRoles = msg.mentions.roles.map(role => role.id);

            if (mentionedRoles.length === 0) {
                return msg.reply("❌ Vui lòng mention ít nhất một role để xóa khỏi required roles");
            }

            // Gọi hàm xóa role khỏi required
            const result = await TicketController.removeRolesRequired(client, msg.guild.id, cateType, mentionedRoles);

            if (result.success) {
                return msg.reply(`✅ Đã xóa ${mentionedRoles.length} role khỏi required roles cho category "${cateType}"`);
            } else {
                return msg.reply(`❌ Lỗi: ${result.message}`);
            }
        }
        else if (act === 'delete_notify') {
            // Lấy tất cả mention user và role
            const mentionedUsers = msg.mentions.users.map(user => user.id);
            const mentionedRoles = msg.mentions.roles.map(role => role.id);

            if (mentionedUsers.length === 0 && mentionedRoles.length === 0) {
                return msg.reply("❌ Vui lòng mention ít nhất một user hoặc role để xóa khỏi notify");
            }

            // Gọi hàm xóa role và user
            const result = await TicketController.removeRolesAndUsersFromCategory(
                client,
                msg.guild.id,
                cateType,
                mentionedUsers,
                mentionedRoles
            );

            if (result.success) {
                let response = `✅ Đã xóa notify cho category "${cateType}"\n`;
                if (mentionedUsers.length > 0) response += `👥 Users: ${mentionedUsers.length}\n`;
                if (mentionedRoles.length > 0) response += `🎭 Roles: ${mentionedRoles.length}`;
                return msg.reply(response);
            } else {
                return msg.reply(`❌ Lỗi: ${result.message}`);
            }
        }
        else {
            return msg.reply("❌ Hành động không hợp lệ. Sử dụng: `required`, `notify`, `delete_required` hoặc `delete_notify`");
        }
    }
    if (cmd === "ticket_status") {
        // Kiểm tra quyền
        if (!msg.member.permissions.has("Administrator") && !msg.member.permissions.has("ManageGuild")) {
            return msg.reply(`❌ ${t('e.permission', lang)}`);
        }

        try {
            const result = await TicketController.getTicketStatus(client, msg.guild.id);

            if (result.success) {
                return msg.reply({ embeds: [result.embed] });
            } else {
                return msg.reply(`❌ Lỗi: ${result.message}`);
            }
        } catch (error) {
            console.error('Lỗi khi lấy ticket status:', error);
            return msg.reply('❌ Có lỗi xảy ra khi lấy thông tin ticket status');
        }
    }
    if (cmd === 'unlockpet') {
        // try {
        const embed = await PetController.unlockServerPet(msg.guild.id);
        msg.reply({ embeds: [embed] });
        // } catch (error) {
        //     msg.reply('❌ Có lỗi xảy ra khi mở khóa pet!');
        // }
    }
    if (cmd === 'serverpet' || cmd === 'spet') {
        const embed = await PetController.getServerPet(msg.guild.id);
        msg.reply({ embeds: [embed] });
    }
    if (cmd === 'serverfeed' || cmd === 'sfeed') {
        // const args = msg.content.split(' ');
        const itemRef = args[0];
        console.log(itemRef)
        if (!itemRef)
            return await msg.reply("The correct command is `wsfeed`. Please try again!")
        const guildId = msg.guild.id;
        if (!guildId)
            return await msg.reply("I can't find guild. Please try again!")
        const userId = msg.author.id;
        if (!userId)
            return await msg.reply("Hey, I can't found you. Try again!")
        const embed = await PetController.feedPetCommand(guildId, itemRef, userId)
        return msg.reply({ embeds: [embed] })
    }
    if (cmd === 'createpet') {
        try {
            // Kiểm tra quyền admin
            if (!msg.member.permissions.has('ADMINISTRATOR')) {
                return msg.reply('❌ Bạn cần quyền ADMIN để sử dụng lệnh này!');
            }

            const petType = args[0] || 'random'; // Lấy type từ argument hoặc mặc định random

            const createdPet = await PetService.createPet(petType);

            msg.reply({
                embeds: [{
                    title: '🐾 Pet Đã Được Tạo!',
                    description: `Pet **${createdPet.type}** đã được tạo thành công!`,
                    color: 0x00FF00,
                    fields: [
                        { name: 'ID', value: createdPet._id.toString(), inline: true },
                        { name: 'Loại', value: createdPet.type, inline: true },
                        { name: 'Lucky Boost', value: `${createdPet.luckyBoost}%`, inline: true },
                        { name: 'Giá', value: `${createdPet.price} ${wolfIcon()}`, inline: true },
                        { name: 'Yêu cầu Level', value: createdPet.lvlRequirement.toString(), inline: true }
                    ],
                    thumbnail: { url: createdPet.image },
                    timestamp: new Date()
                }]
            });

        } catch (error) {
            console.error(error);
            msg.reply('❌ Có lỗi xảy ra khi tạo pet!');
        }
    }
    if (cmd === "luckybuff" || cmd === "lb") {
        // chỉ cần buff số
        const { totalBuff, userBuff, itemBuffValue, petBuff } = await calculateLuckyBuff(msg.author.id, msg.guild.id);
        // return embed
        const embed = new EmbedBuilder()
            .setTitle("🍀 Thông Tin Lucky Buff")
            .addFields(
                { name: "User Buff", value: `${userBuff}`, inline: true },
                { name: "Item Buff", value: `${itemBuffValue}`, inline: true },
                { name: "Pet Buff", value: `${petBuff}`, inline: true },
                { name: "Total Buff", value: `**${totalBuff}**`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Nếu vượt quá 100 sẽ bị giới hạn ở 100' });

        msg.reply({ embeds: [embed] });
    }
    if (cmd === "check") {
        if (!args[0])
            return msg.reply(t('e.miss_cmd', lang))
        if (args[0] === "lang")
            return msg.reply(`✅ ${t('s.cur_la', lang)}`);
        if (args[0] === "prefix") {
            return msg.reply(`✅ ${t('s.cur_pr', lang)} \`${serverPrefix}\``);
        }
    }
    if (cmd === "set") {
        if (!args[0])
            return msg.reply(t('e.miss_cmd', lang))
        if (!msg.member.permissions.has("Administrator") && !msg.member.permissions.has("ManageGuild")) {
            return msg.reply(`❌ ${t('e.permission', lang)}`);
        }
        if (args[0] === "prefix") {
            if (!args[1]) return msg.reply(`⚠️ ${t('w.newPrefix', lang)}`);
            const newPrefix = args[1];
            const embed = await CommonController.setPrefix(msg.guild.id, newPrefix, lang);
            return msg.reply(embed);
        }
        if (args[0] === "lang" || args[0] == "l") {
            if (!args[1]) return msg.reply(`⚠️ ${t('s.miss_cmd', lang)}`);
            const newLang = args[1];
            const embed = await CommonController.setLanguage(msg.guild.id, newLang);
            return msg.reply(embed);
        }
        if (args[0] === "streak" || args[0] == "s") {
            if (!args[1]) return msg.reply(`⚠️ ${t('e.miss_cmd', lang)}`);
            const newS = args[1];
            const embed = await CommonController.setStreak(msg.guild.id, newS, lang);
            return msg.reply(embed);
        }
        if (args[0] === "voice" || args[0] == "v") {
            if (!args[1]) return msg.reply(`⚠️ ${t('e.miss_cmd', lang)}`);
            const newVC = args[1];
            const embed = await CommonController.setVoiceAnnouce(msg.guild.id, newVC, lang);
            return msg.reply(embed);
        }
        if (args[0] === "embed" || args[0] == "e") {
            if (!args[1]) return msg.reply(`⚠️ ${t('e.miss_cmd', lang)}`);
            const newE = args[1];
            const embed = await CommonController.setEmbedAnounce(msg.guild.id, newE, lang);
            return msg.reply(embed);
        }
    }
    // else if (cmd === "awake") {
    //     const userId = msg.author.id;
    //     // console.log("Đang tiến hành thức tỉnh võ hồn cho user:", userId);

    //     try {
    //         // Debug: kiểm tra số spirit hiện có
    //         // const currentCount = await sSpiritMaster.countDocuments({ userId });
    //         // console.log("Số spirit hiện tại:", currentCount);

    //         const embed = await SpiritController.awakenRandomSpirit(userId);
    //         // console.log("Kết quả trả về:", typeof embed, embed);

    //         if (typeof embed === 'string') {
    //             msg.reply(embed);
    //         } else if (embed && embed.data) {
    //             msg.reply({ embeds: [embed] });
    //         } else {
    //             // console.error("Embed không hợp lệ:", embed);
    //             msg.reply(`❌ ${t('e.embed', lang)}`);
    //         }
    //     } catch (error) {
    //         // console.error("Lỗi khi thức tỉnh:", error);
    //         msg.reply(`❌ ${t('e.d', lang)}`);
    //     }
    // }
    // else if (cmd === 'battle') {
    //     return await BattleController.handleBattleCommand(msg, args);
    // }
    // else if (cmd === "spirit" || cmd === "spi") {
    //     const args = msg.content.split(' ');
    //     console.log(args)
    //     if (args.length <= 0)
    //         return await msg.reply({ content: t('s.miss_cmd', lang) })
    //     if (args[1] === "sell") {
    //         if (!args[2] && !args[3])
    //             return await msg.reply({ content: t('s.miss_cmd', lang) })

    //         const amout = parseInt(args[2])
    //         const yearsLimit = parseInt(args[3])
    //         const result = await SpiritRingController.sellRings(msg.author.id, amout, yearsLimit)
    //         return msg.reply(result);
    //     }
    //     if (args[1] === "list" || args[1] === "l") {
    //         try {
    //             // Lấy số trang từ message (ví dụ: "spirit 2")

    //             const page = args.length > 2 ? parseInt(args[2]) || 1 : 1;

    //             const embed = await SpiritController.showAllSpirits(page);
    //             return msg.reply({ embeds: [embed] });
    //         } catch (error) {
    //             console.error('Lỗi khi hiển thị Vũ Hồn:', error);

    //             const errorEmbed = new EmbedBuilder()
    //                 .setTitle('❌ Error')
    //                 .setDescription(t('e.d', lang))
    //                 .setColor(0xFF0000);

    //             return await msg.reply({ embeds: [errorEmbed] });
    //         }
    //     } else if (args[1] === "information" || args[1] === "i")
    //         try {
    //             const result = await SpiritController.getSpiritInfo(msg.author.id);
    //             msg.reply(result);
    //         } catch (error) {
    //             // Fallback về simple info nếu bị lỗi
    //             const result = t('e.d', lang)
    //             msg.reply(result);
    //         }
    //     else if (args[1] === "attach" || args[1] === "a") {
    //         console.log(args)
    //         const spiritRef = args[2];
    //         const ringRef = args[3]
    //         if (!spiritRef)
    //             return await msg.reply({ content: `${t('s.miss_cmd', lang)}: spiritRef` })
    //         if (!ringRef)
    //             return await msg.reply({ content: `${t('s.miss_cmd', lang)}: ringId` })
    //         const embed = await SpiritController.attachRing(msg.author.id, spiritRef, ringRef)
    //         return await msg.reply(embed)
    //     }
    //     else if (args[1] === "retirer" || args[1] === "re") {
    //         console.log(args)
    //         const spiritRef = args[2];
    //         const ringRef = args[3]
    //         if (!spiritRef)
    //             return await msg.reply({ content: `${t('s.miss_cmd', lang)}: spiritRef` })
    //         if (!ringRef)
    //             return await msg.reply({ content: `${t('s.miss_cmd', lang)}: ringId` })
    //         const embed = await SpiritController.removeRing(msg.author.id, spiritRef, ringRef)
    //         return await msg.reply(embed)
    //     }
    //     else if (args[1] === "ring" || args[1] == "r") {
    //         const userId = msg.author.id;
    //         const { embeds, components } = await SpiritRingController.getSpiritRingsEmbed(userId);

    //         await msg.reply({ embeds, components });
    //     }
    // }
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
                .setTitle('❌ Error')
                .setDescription(t('e.d', lang))
                .setColor(0xFF0000);

            return msg.reply({ embeds: [errorEmbed] });
        }
    }
    // else if (cmd === "hunt") {
    //     try {
    //         const embed = await HuntSpiritController.huntSpirits(msg.author.id);

    //         // check quyền trước khi gửi
    //         const perms = msg.channel.permissionsFor(msg.client.user);
    //         if (!perms.has("SendMessages")) {
    //             console.log("❌ Bot không có quyền SendMessages trong channel này");
    //             return;
    //         }
    //         if (!perms.has("EmbedLinks")) {
    //             console.log("⚠️ Bot không có quyền EmbedLinks, sẽ gửi plain text");
    //             await msg.channel.send("Bạn vừa hunt spirit thành công!");
    //         } else {
    //             await msg.reply(embed);
    //         }

    //         const currentUser = await UserService.findUserById(msg.author.id);
    //         const user = await UserService.findUserById(msg.author.id); // cái này mày quên khai báo `user`

    //         if (currentUser.spiritLvl > user.spiritLvl) {
    //             const lvlUpEmbed = new EmbedBuilder()
    //                 .setTitle("Spirit Level Up!")
    //                 .setDescription(`Congratulations, <@${msg.author.id}> reached **level ${currentUser.spiritLvl}**!`)
    //                 .setThumbnail("https://i.ibb.co/YBQPxrNy/Lam-Ngan-Thao.png");

    //             await msg.channel.send({ embeds: [lvlUpEmbed] });
    //         }
    //     } catch (err) {
    //         console.error("❌ Lỗi khi xử lý lệnh hunt:", err);
    //     }
    // }

    else if (cmd === "join" || cmd === "j") {
        // await GameController.handleJoinCommand(msg);
        // return;
        const result = await GameController.handleJoinCommand(msg.channel.id, msg.author.id, lang);
        await msg.reply(result);
        return;
    }
    else if (cmd === "new" || cmd === "n") {
        const embed = await GameController.handleCreateNewRoom(msg.channel.id, lang);
        await msg.reply({ embeds: [embed] });
        return;
    }
    // else if (cmd === "create" || cmd === "c") {
    //     await GameController.handleCreateRoom(msg);
    //     return;
    // }
    else if (cmd === "start" || cmd === "s") {
        await GameController.handleStartGame(msg, lang);
        return;
    }
    else if (cmd === "sell") {
        // // Auto sell
        // const embed = await SellController.sellAuto(interaction.user.id);
        // interaction.reply({ embeds: [embed] });

        // // Sell one item
        // const embed = await SellController.sellOne(interaction.user.id, "WOOD1", 5);
        // interaction.reply({ embeds: [embed] });
        const itemRef = args[0]
        const quantity = Math.max(1, Number(args[1]) || 1);

        if (!itemRef) {
            const embed = new EmbedBuilder()
                .setTitle("❌ Không tìm thấy itemRef")
                .setColor("Red");
            return msg.reply({ embeds: [embed] })
        }
        const result = await SellController.sellOne(msg.author.id, itemRef, quantity)
        return msg.reply({ embeds: [result] })
    }
    else if (cmd === "shop") {
        const embed = await ShopController.getShopEmbed()
        msg.reply(embed)
    }
    else if (cmd === "wallet" || cmd == "w" || cmd === "cash" || cmd === "money") {
        await UserController.handleBalance(msg);
        return;
    }
    else if (cmd === "inventory" || cmd === "inv") {
        const userId = msg.author.id;
        const result = await InventoryController.showInventoryEmbed(userId);
        await msg.reply(result);
        return;
    }
    else if (cmd === "craft") {
        const itemRef = args[0];
        let quantity = parseInt(args[1]);
        if (!quantity || quantity < 0)
            quantity = 1;
        if (!itemRef)
            return msg.reply("Don't have item ref")

        const embed = await CraftController.craftItem(msg.author.id, itemRef, quantity)
        msg.reply(embed)
    }
    else if (cmd === "give" || cmd === "g") {
        console.log("Processing give command");
        const embed = new EmbedBuilder();
        const args = msg.content.trim().split(/\s+/);
        const balance = args[2];
        const mentionUser = msg.mentions.users.first();
        if (!mentionUser) {
            embed.setTitle("<a:deny:1433805273595904070> Transfer Error!")
                .setDescription(`You must mention receiver first!`)
                .setColor('Red');
            return msg.reply({ embeds: [embed] });
        }

        if (mentionUser.id == msg.author.id) {
            embed.setTitle("<a:deny:1433805273595904070> Transfer Error!")
                .setDescription(`You can't send money to yourself!`)
                .setColor('Red');
            return msg.reply({ embeds: [embed] });
        }
        const result = await UserController.giveMoneyTo(msg.author.id, mentionUser, balance);
        const data = await msg.reply(result)
        setTimeout(async () => {
            await data.edit({ components: [] });
            // data.delete().catch(err => console.log("Failed to delete message:", err));
        },
            // 1 phút
            60000
        ); // Xóa message sau 5 giây
        return;

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
            // soulland: {
            //     name: "Soul Land",
            //     description: "Các lệnh Đấu La Đại Lục",
            //     emoji: "🌌",
            //     color: "#9370DB",
            //     commands: [
            //         { name: "/awake", desc: "Thức tỉnh Vũ Hồn" },
            //         { name: "/spirit list <page>", desc: "Xem danh sách Vũ Hồn" },
            //         { name: "/spirit information", desc: "Xem chi tiết Vũ Hồn" },
            //         { name: "wspirit attach <spiritRef> <ringId>", desc: "Khảm Hồn Hoàn" },
            //         { name: "whunt", desc: "Săn Hồn Thú (có thể nhận Hồn Hoàn)" },
            //         { name: "wbattle <@user> hoặc /battle <@user>", desc: "Khiêu chiến người khác" },
            //     ]
            // },
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
                value: `👉 [Click here](https://discord.gg/kDkydXrtua) to join!`,
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
        const result = await CommonController.dailyReward(msg.author.id);
        return msg.reply(result);
    }
    else if (cmd === "send") {
        const targetMember = msg.mentions.members.first();
        const itemRef = args[1]
        console.log(args)
        if (!itemRef)
            return msg.reply("Can't find itemRef!")
        let quan = Number(args[2]);
        if (!quan)
            quan = 1
        // if (isNaN(quan) || quan < 1)
        // return msg.reply("Quantity must be a positive number!");
        if (quan < 0)
            quan = -quan
        if (quan > 10)
            quan = 10;

        const result = await FriendActionController.sendGift(msg.author.id, targetMember.id, itemRef, quan)
        return msg.reply(result.message)
    }
    else if (cmd === "friend") {
        const targetMember = msg.mentions.members.first();
        
        const result = await FriendActionController.getFriendInfoEmbed(msg.author.id,targetMember.id)
        return msg.reply(result)
    }
    else if (cmd === "baucua") {
        let bet = args[0];
        const result = await MiniGameController.bauCua(msg.author.id, bet);
        return msg.reply(result);
    }


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



    else if (cmd === "donate") {
        const result = await CommonController.donate();
        return msg.reply(result);
    }
    // ================= KÉO BÚA BAO =================
    else if (cmd === "keobuabao" || cmd === "kbb") {
        let bet = args[0];
        const result = await MiniGameController.oneTwoThree(msg.author.id, bet);
        return msg.reply(result);
        // return await MiniGameController.oneTwoThree(msg.author.id, msg, bet)
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
}
module.exports = { handleMessageCreate };
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require("discord.js");
const { client } = require("..");
const GameController = require("../controllers/gameController");
const LanguageController = require("../controllers/languageController");
const { handle123Result } = require("../controllers/miniGameController");
const TicketController = require("../controllers/ticketController");
const GameService = require("../services/gameService");
const toggleComponents = require("../utils/toggleComponents");
const UserController = require("../controllers/userController");
const StreakController = require("../controllers/streakController");
const InventoryController = require("../controllers/inventoryController");
const MarryController = require("../controllers/marryController");
const ItemService = require("../services/itemService");
const Marry = require("../models/Marry");

module.exports = async (interaction, client) => {

    const { customId, message } = interaction;
    const [actionType, refId] = customId.split('|');
    const args = customId.split('|')
    let lang = await LanguageController.getLang(message.guild.id)
    if (actionType === 'streak') {
        const userId = args[1];
        const guildId = args[2];
        const page = parseInt(args[3]) || 1;
        const data = await StreakController.getUserStreakInfo(client, userId, guildId, page);
        return interaction.update(data);
    }
    else if (actionType === "divorce") {
        await interaction.deferReply({ ephemeral: true })
        try {
            const type = args[1]
            const userId = args[2]
            if (type === "cancel") {
                if (userId != interaction.user.id)
                    return await interaction.editReply({ content: "Bạn không có quyền!" })
                const embed = new EmbedBuilder()
                    .setTitle("Bạn... Không muốn ly hôn!")
                    .setDescription(`Sau thời gian suy nghĩ thì <@${userId}> đã rút đơn ly hôn. Cả nhà êm ấm`)
                    .setFooter({ text: "Marry | Keldo" })
                await interaction.editReply({ content: "Ơn giời! Bạn đã suy nghĩ lại rồi!" })
                return await interaction.message.edit({ embeds: [embed], components: [] })
            }
            else if (type === "deny") {
                const marry = await Marry.findOne({
                    $or: [
                        { senderId: userId },
                        { receiverId: userId }
                    ]
                })
                // .populate({
                //     path: "rings.ring",  // populate vào field ring bên trong array rings
                //     model: "Item"
                // });
                const otherId = marry.senderId === userId
                    ? marry.receiverId
                    : marry.senderId;

                // Chỉ người còn lại mới được quyền
                if (interaction.user.id !== otherId) {
                    return await interaction.editReply({
                        content: `Chỉ có <@${otherId}>  mới được thực hiện hành động này.`,
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle("Bạn... Không muốn ly hôn!")
                    .setDescription(`<@${otherId}> đã quyết định không ly hôn. Cuộc sống có vẻ êm ấm về sau`)
                    .setFooter({ text: "Marry | Keldo" })

                await interaction.editReply({ content: "Ơn giời! Bạn đã suy nghĩ lại rồi!" })
                return await interaction.message.edit({ embeds: [embed], components: [] })
            }
            else if (type === "accept") {
                const marry = await Marry.findOne({
                    $or: [
                        { senderId: userId },
                        { receiverId: userId }
                    ]
                })
                // .populate({
                //     path: "rings.ring",  // populate vào field ring bên trong array rings
                //     model: "Item"
                // });
                const otherId = marry.senderId === userId
                    ? marry.receiverId
                    : marry.senderId;

                // Chỉ người còn lại mới được quyền
                if (interaction.user.id !== otherId) {
                    return await interaction.editReply({
                        content: `Chỉ có <@${otherId}>  mới được thực hiện hành động này.`,
                    });
                }

                // const embed = new EmbedBuilder()
                //     .setTitle("Bạn... Không muốn ly hôn!")
                //     .setDescription(`<@${otherId}> đã quyết định không ly hôn. Cuộc sống có vẻ êm ấm về sau`)
                //     .setFooter({ text: "Marry | Keldo" })
                const request = await MarryController.divorceAccept(otherId, client)
                console.log(request)
                const embed = request.message;

                await interaction.editReply({ content: "Ôi không, bạn sẽ hối hận!" })
                await interaction.message.edit({ components: [] })
                return await interaction.message.edit(embed)
            }
            return;
        }
        catch (e) {
            // return {
            //     success: false,
            //     message: e.message
            // }
            console.log(e)
            return interaction.editReply({ content: "Đã có lỗi xảy ra!" })
        }
    }
    else if (actionType === "blessing") {
        await interaction.deferReply()
        try {
            const id = args[1]
            const response = await MarryController.blessing(interaction.user.id, id)
            await interaction.editReply(response.message)
        }
        catch (e) {
            // return {
            //     success: false,
            //     message: e.message
            // }
            console.log(e)
            return interaction.editReply({ content: "Đã có lỗi xảy ra!" })
        }
    }
    else if (actionType === "marry") {
        await interaction.deferReply({ ephemeral: true });
        try {
            console.log(args);

            const type = args[1];
            const userId = args[2];
            const targetId = args[3];
            const ringId = args[4];

            if (interaction.user.id !== targetId) {
                return interaction.editReply({
                    content: `Bạn không có quyền!`
                });
            }
            try {
                await interaction.message.edit({ components: [] });
            } catch (err) {
                console.error("Không thể xóa button:", err);
            }

            // Kiểm tra thời gian gửi tin nhắn
            const messageTimestamp = interaction.message.createdTimestamp; // thời gian tin nhắn gốc
            const now = Date.now();
            const sixtyMinutes = 60 * 60 * 1000; // 60 phút = 3600000 ms
            console.log(messageTimestamp)
            if (now - messageTimestamp > sixtyMinutes) {
                return interaction.editReply({
                    content: "Xin lỗi, thời gian để đồng ý đã hết hạn (hơn 60 phút)."
                });
            }


            if (type == "accept") {
                const result = await MarryController.acceptMarry(userId, targetId, ringId, client)
                await interaction.editReply({
                    content: `Bạn đã đồng ý kết hôn với <@${userId}>.`
                });
                return await interaction.message.edit(result);
            }

            const item = await ItemService.getItemById(ringId);
            await interaction.editReply({
                content: `Bạn đã từ chối <@${userId}>. Ắt hẳn cậu ấy sẽ buồn lắm!`
            });
            return await interaction.followUp({
                content: `<@${userId}> đã bị <@${targetId}> từ chối trong sự ngỡ ngàng.\n${userId} bị mất **2 chiếc nhẫn ${item.icon ? item.icon : ""} ${item.name ? item.name : ""}**!`
            });
        } catch (e) {
            return interaction.editReply({ content: `Error: ${e.message}` })
        }
    }

    else if (actionType === 'inventory') {
        const userId = args[1];
        const page = parseInt(args[2]) || 1;
        const data = await InventoryController.showInventoryEmbed(userId, page);
        return interaction.update(data);
    }
    else if (actionType === 'ticket_create') {
        interaction.deferReply({ ephemeral: true })
        const cateType = args[1];
        await TicketController.createTicket(client, cateType, interaction.user.id, interaction.guild.id);
        await interaction.editReply({ content: "✅ Ticket created successfully!", ephemeral: true });
        // xóa tin nhắn
        setI
    }
    else if (actionType === 'ticket_setup') {
        const act = args[1];
        if (!act) return interaction.editReply({ content: "❌ Not found action" });

        if (act === 'general') {
            await interaction.deferReply({ ephemeral: true });

            const result = await TicketController.createCategory(
                client,
                interaction.guild.id,
                '🎟️ General Ticket',
                'general',
                interaction.user.id,
                'Welcome to general ticket!'
            );

            if (result.success) {
                await interaction.editReply({ content: `✅ ${result.message}` });
            } else {
                await interaction.editReply({ content: `❌ ${result.message}` });
            }
        }
        else if (act === 'delete') {
            const modal = new ModalBuilder()
                .setCustomId('ticket_delete_modal')
                .setTitle('Delete Ticket Category');
            const cateType = new TextInputBuilder()
                .setCustomId('cateType')
                .setLabel('Ticket Type')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Nhập loại ticket cần xóa. Vd: bug, general,...')
                .setRequired(true);

            // Thêm vào rows (modal chỉ nhận tối đa 5 row)
            const row1 = new ActionRowBuilder().addComponents(cateType);

            modal.addComponents(row1);

            // Hiển thị modal
            await interaction.showModal(modal);
        }
        else if (act === 'custom') {
            // Tạo modal
            const modal = new ModalBuilder()
                .setCustomId('ticket_custom_modal')
                .setTitle('Create Custom Ticket');

            // Input tên category
            const nameInput = new TextInputBuilder()
                .setCustomId('custom_name')
                .setLabel("Tên Category")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Nhập tên category")
                .setRequired(true);

            // Input message/description
            const messageInput = new TextInputBuilder()
                .setCustomId('custom_message')
                .setLabel("Message")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder("Nhập message hiển thị")
                .setRequired(true);

            // Input cateType
            const typeInput = new TextInputBuilder()
                .setCustomId('custom_cateType')
                .setLabel("CateType")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Ví dụ: vip, general, etc")
                .setRequired(true);

            // Thêm vào rows (modal chỉ nhận tối đa 5 row)
            const row1 = new ActionRowBuilder().addComponents(nameInput);
            const row2 = new ActionRowBuilder().addComponents(messageInput);
            const row3 = new ActionRowBuilder().addComponents(typeInput);

            modal.addComponents(row1, row2, row3);

            // Hiển thị modal
            await interaction.showModal(modal);
        }
    }
    else if (actionType === 'transfer') {
        const act = args[1];
        const fromUserId = args[2];
        const toUserId = args[3];
        const amount = args[4];
        await interaction.deferReply({ ephemeral: true });
        if (act === 'confirm') {
            const result = await UserController.confirmTransferFunds(interaction.guild.id, fromUserId, toUserId, amount);
            if (result.success) {
                // xóa button của message gốc
                try {
                    await interaction.message.edit({ components: [] });
                } catch (err) {
                    console.error("Không thể xóa button:", err);
                }
                return interaction.editReply(result.data);
            } else {
                return interaction.editReply({ content: `❌ Error: ${result.error}` });
            }

        }
        else if (act === 'cancel') {
            const result = await UserController.cancelTransferFunds(interaction.guild.id, fromUserId, toUserId, amount);
            if (result.success) {
                // xóa button của message gốc
                try {
                    await interaction.message.edit({ components: [] });
                } catch (err) {
                    console.error("Không thể xóa button:", err);
                }
                return interaction.editReply(result.data);
            }
            else {
                return interaction.editReply({ content: `❌ Error: ${result.error}` });
            }
        }
    }

    else if (actionType === 'ticket') {

        await interaction.deferReply({ ephemeral: true });
        console.log('Xử lý ticket')
        const act = args[1]
        if (!act) {
            return interaction.editReply("Not found action");
        }
        // const channelId =
        let reply = "";
        if (act == "close") {
            reply = await TicketController.deleteTicket(interaction.channel.id, interaction.guild.id, interaction.user.id, client)
            if (interaction.isButton() && reply?.includes("Ticket")) {
                try {
                    await interaction.message.edit({ components: [] });
                } catch (err) {
                    console.error("Không thể xóa button:", err);
                }
            }
        }
        else if (act == "storage") {
            reply = await TicketController.storageTicket(interaction.channel.id, interaction.guild.id, interaction.user.id, client)

            if (interaction.isButton() && reply?.includes("Ticket")) {
                try {
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`ticket|close|${interaction.channel.id}`)
                                .setLabel('Đóng Ticket')
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji('<a:trash:1433806006915432538>'))
                    await interaction.message.edit({ components: [row] });
                } catch (err) {
                    console.error("Không thể xóa button:", err);
                }
            }
        }

        return interaction.editReply(reply || "Ticket processed.");
    }
    else if (actionType === 'view_role') {
        console.log("view role");
        const embed = await GameController.handleGetRole(interaction.channel.id, interaction.user.id, lang);
        await interaction.editReply(embed);
        return;
    }
    else if (actionType === 'day_action_skip') {
        let currentGame = await GameService.getGameByChannel(interaction.channel.id);
        const user = currentGame.player.find((p) => p.userId === interaction.user.id)
        if (!user.isAlive || !user)
            return await interaction.reply({ content: "You're death or not in game!" }, ephemeral = true)
        await GameController.daySkipAction(currentGame, interaction);
        currentGame = await GameService.getGameByChannel(interaction.channel.id);
        const isEndDay = await GameController.checkDayPhaseEnd(currentGame, interaction);
        if (isEndDay) {
            await interaction.message.edit({ components: [] });

            await GameController.endDayPhase(currentGame, interaction);
        }
        return;
    }
    else if (actionType === 'night_action_skip') {
        let currentGame = await GameService.getGameByChannel(refId);
        console.log(currentGame)
        const user = currentGame.player.find((p) => p.userId === interaction.user.id)
        console.log(user)
        if (!user.isAlive || !user)
            return await interaction.reply({ content: "You're death or not in game!" }, ephemeral = true)
        await GameController.skip_Night_Action(currentGame, interaction.user.id, interaction);
        const isEndNight = await GameController.checkNightPhaseEnd(currentGame);
        if (isEndNight) {
            await interaction.message.edit({ components: [] });

            currentGame = await GameService.getGameByChannel(refId);
            await GameController.identifyTheDeath(currentGame, interaction);
            currentGame = await GameService.getGameByChannel(refId);
            const team = await GameController.checkWinCondition(currentGame, interaction);
            if (!team) {
                currentGame = await GameService.getGameByChannel(refId);
                return GameController.handleStartDayPhase(currentGame, interaction);
            }
        }
        return;
    }
    else if (actionType === "onetwothree") {
        return await handle123Result(interaction, lang)
    }
    // } catch (err) {
    //     console.error("❌ Lỗi handleButtonInteraction:", err);
    // } finally {
    //     // ✅ Enable lại (nếu game chưa end)
    //     try {
    //         await message.edit({
    //             components: toggleComponents(message.components, false)
    //         });
    //     } catch (e) {
    //         console.error("❌ Lỗi khi bật lại components:", e);
    //     }
    // }
};

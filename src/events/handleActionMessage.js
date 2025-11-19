const { EmbedBuilder } = require("discord.js");
const Action = require("../models/Action");
const actionService = require("../services/actionService");
const storageService = require("../services/storageService");

const removeDiacritics = require("diacritics").remove;

const handleActionMessage = async (client, msg) => {
    if (msg.author.bot || !msg.guild) return;

    const rawContent = msg.content.toLowerCase();
    const content = removeDiacritics(rawContent);

    try {
        const actions = await Action.find({
            $or: [
                { guildId: msg.guild.id },
                { isSystemDefault: true }
            ]
        });

        if (!actions || actions.length === 0) return;

        // Chuẩn hóa danh sách action
        const normalizedActions = actions.map(a => ({
            ...a._doc,
            normalizedAction: removeDiacritics(a.action.toLowerCase())
        }));

        // Lọc ra những action MATCH với nội dung
        let matchedList = normalizedActions.filter(a =>
            content.includes(a.normalizedAction)
        );

        if (matchedList.length === 0) return;

        // 1. Ưu tiên action của server
        const serverActions = matchedList.filter(a => a.guildId === msg.guild.id);
        const finalList = serverActions.length > 0 ? serverActions : matchedList;

        // 2. Ưu tiên action match dài nhất
        const matchedAction = finalList.sort((a, b) =>
            b.normalizedAction.length - a.normalizedAction.length
        )[0];

        if (!matchedAction) return;

        // Validate URL trước khi gửi
        if (!matchedAction.imgUrl || !storageService.validateImageUrl(matchedAction.imgUrl)) {
            console.error(`Invalid image URL for action ${matchedAction.action}: ${matchedAction.imgUrl}`);
            await msg.reply('❌ Action image is not available. Please contact admin.');
            return;
        }

        const targetUser = msg.mentions.users.first();
        const finalMessage = matchedAction.message
            .replace(/{user}/g, msg.author.toString())
            .replace(/{target}/g, targetUser ? targetUser.toString() : '')
            .replace(/\s+/g, ' ')
            .trim();

        const embed = new EmbedBuilder()
            .setTitle("Action")
            .setDescription(finalMessage)
            .setImage(matchedAction.imgUrl)
            .setColor('#0099ff')
            .setFooter({
                text: 'Use /add-action | First 10 actions free | 3 tokens each after'
            });

        await msg.reply({ embeds: [embed] });

    } catch (error) {
        console.error("Error handling action message:", error);
    }
};


module.exports = { handleActionMessage };
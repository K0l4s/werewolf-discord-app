const Action = require("../models/Action");
const actionService = require("../services/actionService");
const storageService = require("../services/storageService");

const handleActionMessage = async (client, msg) => {
    if (msg.author.bot || !msg.guild) return;

    const content = msg.content.toLowerCase();
    // if (!content.startsWith('wa ')) return;

    try {
        const actions = await Action.find({
            $or: [
                { guildId:msg.guild.id },
                { isSystemDefault: true }
            ]
        });

        // const actions = await Action
        if (!actions || actions.length === 0) return;
        console.log(content)
        // const actionContent = content.substring(3).trim();
        const matchedAction = actions.find(action =>
            content.includes(action.action.toLowerCase())
        );

        if (!matchedAction) return;

        // Validate URL ảnh trước khi gửi
        if (!matchedAction.imgUrl || !storageService.validateImageUrl(matchedAction.imgUrl)) {
            console.error(`Invalid image URL for action ${matchedAction.action}: ${matchedAction.imgUrl}`);
            await msg.reply('❌ Action image is not available. Please contact admin.');
            return;
        }

        const targetUser = msg.mentions.users.first();

        let finalMessage = matchedAction.message
            .replace(/{user}/g, msg.author.toString())
            .replace(/{target}/g, targetUser ? targetUser.toString() : '')
            .replace(/\s+/g, ' ')
            .trim();

        await msg.reply({
            content: finalMessage,
            files: [matchedAction.imgUrl]
        });


    } catch (error) {
        console.error('Error handling action message:', error);
        // Không gửi message lỗi để tránh spam
    }
};

module.exports = { handleActionMessage };
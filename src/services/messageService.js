const { EmbedBuilder } = require("@discordjs/builders");

class MessageService {
    static async sendMessageToUser(message, userId, title, description, thumbnail, color) {
        const member = await message.guild.members.fetch(userId).catch(() => null);
        if (member) {
            const dm = await member.createDM().catch(() => null);
            if (dm) {
                // const embed = {
                //     title: title,
                //     description: description,
                //     color: color ? color : 'gray',
                //     thumbnail: thumbnail ? thumbnail : null
                // }
                const embed = new EmbedBuilder();
                embed.setTitle(title).setDescription(description).setThumbnail(thumbnail).setColor(color)

                await dm.send({ embeds: [embed] }).catch(console.error);
            }
        }
    }
    static async sendMessageToUser(message, title, description, thumbnail, color) {
        //  const member = await message.guild.members.fetch(userId).catch(() => null);
        // if (member) {
        //     const dm = await member.createDM().catch(() => null);
        //     if (dm) {
        //         const embed = {
        //             title: title,
        //             description: description,
        //             color: color ? color : 'gray',
        //             thumbnail: thumbnail ? thumbnail : null
        //         }
        //         await dm.send({ embeds: [embed] }).catch(console.error);
        //     }
        // }
        const embed = new EmbedBuilder()
        embed.setTitle(title).setDescription(description).setThumbnail(thumbnail).setColor(color)

        return message.guild.send({embeds:[embed]})
    }
}

module.exports = MessageService
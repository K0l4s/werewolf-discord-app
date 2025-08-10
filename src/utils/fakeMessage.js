export function interactionToMessage(interaction) {
    return {
        author: interaction.user,
        channel: interaction.channel,
        guild: interaction.guild,
        reply: (data) => interaction.reply(data)
    };
}

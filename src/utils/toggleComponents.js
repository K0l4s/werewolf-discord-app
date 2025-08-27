// utils/toggleComponents.js
const { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } = require("discord.js");

function toggleComponents(components, disabled) {
    if (!components) return [];

    return components.map(row => {
        const newRow = new ActionRowBuilder();

        row.components.forEach(c => {
            let newComponent;

            // Button
            if (c.type === 2) {
                newComponent = ButtonBuilder.from(c.toJSON()).setDisabled(disabled);
            }
            // Select menu
            else if (c.type === 3) {
                newComponent = StringSelectMenuBuilder.from(c.toJSON()).setDisabled(disabled);
            }

            if (newComponent) newRow.addComponents(newComponent);
        });

        return newRow;
    });
}

module.exports = toggleComponents;

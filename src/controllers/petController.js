const { EmbedBuilder } = require("discord.js");
const ServerPet = require("../models/ServerPet");
const PetService = require("../services/petService");

class PetController {
    // create serverPet
    static async unlockServerPet(guildId) {
        try {
            const serverPet = await PetService.createServerPet(guildId);

            const embed = new EmbedBuilder()
                .setTitle('🎉 Server Pet Đã Được Mở Khóa!')
                .setDescription(`**${serverPet.name}** đã gia nhập server! Hãy chăm sóc pet thật tốt nhé!`)
                .setColor(0x9C27B0)
                .setThumbnail(serverPet.pet.image)
                .addFields(
                    { name: '🐶 Tên Pet', value: serverPet.name, inline: true },
                    { name: '📦 Loại', value: serverPet.pet.type, inline: true },
                    { name: '⭐ Level', value: `Level ${serverPet.lvl}`, inline: true },
                    { name: '🍀 Lucky Boost', value: `+${serverPet.pet.luckyBoost}%`, inline: true },
                    { name: '🍖 Độ đói', value: `${serverPet.hunger}%`, inline: true },
                    { name: '🎯 Độ vui vẻ', value: `${serverPet.happiness}%`, inline: true },
                    { name: '📊 EXP', value: `${serverPet.exp} EXP`, inline: true },
                    { name: '⚡ Chỉ số đói', value: `${serverPet.pet.hungerStats}/ngày`, inline: true },
                    { name: '❤️ Chỉ số hạnh phúc', value: `${serverPet.pet.happinessStats}/ngày`, inline: true }
                )
                .setImage(serverPet.pet.image)
                .setFooter({
                    text: `Yêu cầu Level: ${serverPet.pet.lvlRequirement} | ID: ${serverPet._id}`
                })
                .setTimestamp();

            return embed;

        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi Mở Khóa Pet')
                .setDescription(error.message)
                .setColor(0xFF5252)
                .setFooter({ text: 'Vui lòng thử lại sau' })
                .setTimestamp();

            return errorEmbed;
        }
    }
}

module.exports = PetController;
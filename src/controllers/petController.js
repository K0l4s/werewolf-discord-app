const { EmbedBuilder } = require("discord.js");
const ServerPet = require("../models/ServerPet");
const PetService = require("../services/petService");

class PetController {
    static progressBar(current, total, size = 20) {
        if (total === 0) return 'N/A';
        if (current > total) current = total;
        if (current < 0) current = 0;
        if (size <= 0) size = 20;
        if (size > 50) size = 50; // Giới hạn kích thước thanh tiến trình tối đa
        const progress = Math.round((current / total) * size);
        const emptyProgress = size - progress;
        const progressText = '█'.repeat(progress);
        const emptyProgressText = '░'.repeat(emptyProgress);
        return `${progressText}${emptyProgressText} ${current}/${total}`;
    }
    static async getServerPet(guildId) {
        try {
            const serverPet = await PetService.getServerPet(guildId); // Hàm này đã được cập nhật ở trên
            if (!serverPet) {
                throw new Error("Chưa có server pet nào. Hãy mở khóa pet cho server! (dùng lệnh wunlockpet)");
            }

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
                    { name: '🍖 Độ đói', value: `${this.progressBar(serverPet.hunger, serverPet.pet.hungerStats)}`, inline: true },
                    { name: '🎯 Độ vui vẻ', value: `${this.progressBar(serverPet.happiness, serverPet.pet.happinessStats)}`, inline: true },
                    { name: '📊 EXP', value: `${this.progressBar(serverPet.exp, serverPet.pet.expStats * serverPet.lvl)}`, inline: true },
                )
                .setImage(serverPet.pet.image)
                .setFooter({
                    text: `Yêu cầu Level: ${serverPet.pet.lvlRequirement} | ID: ${serverPet._id}`
                })
                .setTimestamp();
            return embed;
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi Lấy Pet')
                .setDescription(error.message)
                .setColor(0xFF5252)
                .setFooter({ text: 'Vui lòng thử lại sau' })
                .setTimestamp();
            return errorEmbed;
        }
    }
    static async feedPetCommand(guildId, itemId, userId) {
        const result = await PetService.feedPet(guildId, itemId, userId);

        if (!result.success) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi Cho Pet Ăn')
                .setDescription(result.error)
                .setColor(0xFF5252)
                .setTimestamp();
            return errorEmbed;
        }

        const { pet, foodBuff, levelUp, oldLevel, newLevel, itemUsed } = result;

        const embed = new EmbedBuilder()
            .setTitle(`🍖 Đã Cho ${pet.name} Ăn ${itemUsed.icon} ${itemUsed.name}!`)
            .setColor(0x4CAF50)
            .setThumbnail(pet.pet.image)
            .addFields(
                { name: '🐶 Tên Pet', value: pet.name, inline: true },
                { name: '🍖 Độ đói', value: `${this.progressBar(pet.hunger, pet.pet.hungerStats)}`, inline: true },
                { name: '🎯 Độ vui vẻ', value: `${this.progressBar(pet.happiness, pet.pet.happinessStats)}`, inline: true },
                { name: '📊 EXP', value: `${this.progressBar(pet.exp, pet.pet.expStats * pet.lvl)}`, inline: true },
                { name: '⭐ Level', value: `Level ${pet.lvl}`, inline: true },
                { name: '✨ Hiệu ứng', value: `+${foodBuff.hungerBuff} đói\n+${foodBuff.happinessBuff} vui vẻ\n+${foodBuff.petExpEarn || 0} EXP`, inline: true }
            )
            .setFooter({ text: `Sử dụng: ${itemUsed.name}` })
            // .set
            .setTimestamp();

        if (levelUp) {
            embed.setDescription(`**🎉 Chúc mừng! ${pet.name} đã lên level ${newLevel}!**`);
            embed.setColor(0xFFD700); // Màu vàng cho level up
        }

        return embed;
    }
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
                    { name: '🍖 Độ đói', value: `${this.progressBar(serverPet.hunger, serverPet.pet.hungerStats)}`, inline: true },
                    { name: '🎯 Độ vui vẻ', value: `${this.progressBar(serverPet.happiness, serverPet.pet.happinessStats)}`, inline: true },
                    { name: '📊 EXP', value: `${this.progressBar(serverPet.exp, serverPet.pet.expStats)}`, inline: true },
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
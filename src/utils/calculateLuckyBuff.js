
// import { EmbedBuilder } from "discord.js";
import { EmbedBuilder } from "discord.js";
import BuffActivate from "../models/BuffActivate.js";
import ServerPet from "../models/ServerPet.js";
import User from "../models/User.js";
import UserService from "../services/userService.js";

export async function calculateLuckyBuff(userId, guildId) {
    let totalBuff = 0;

    const itemBuff = await BuffActivate.findOne({ userId });
    const serverPetBuff = await ServerPet.findOne({ guildId }).populate("pet");
    const user = await UserService.findUserById(userId);

    let userBuff = 0;
    let itemBuffValue = 0;
    let petBuff = 0;

    // buff từ user
    if (user) {
        userBuff = user.luckyBoost || 0;
        totalBuff += userBuff;
    }

    // buff từ item (nếu chưa hết hạn)
    if (itemBuff && !itemBuff.isExpired) {
        itemBuffValue = itemBuff.luckyBuff || 0;
        totalBuff += itemBuffValue;
    }

    // buff từ server pet
    if (serverPetBuff && serverPetBuff.pet) {
        petBuff = serverPetBuff.pet.luckyBoost || 0;
        totalBuff += petBuff;
    }

    if (totalBuff > 100) totalBuff = 100;
    return { totalBuff, userBuff, itemBuffValue, petBuff };
    // if (returnEmbed) {
    //     const embed = new EmbedBuilder()
    //         .setTitle("🍀 Lucky Buff Information")
    //         .setColor(0x00ffcc)
    //         .addFields(
    //             { name: "User Buff", value: `${userBuff}%`, inline: true },
    //             { name: "Item Buff", value: `${itemBuffValue}%`, inline: true },
    //             { name: "Pet Buff", value: `${petBuff}%`, inline: true },
    //             { name: "Total Buff", value: `**${buff}%**`, inline: false }
    //         )
    //         .setTimestamp();

    //     return { buff, embed };
    // }

    // return buff;
}

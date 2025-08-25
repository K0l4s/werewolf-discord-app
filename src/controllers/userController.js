const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const UserService = require("../services/userService");
const { DEFAULT_EXP_LVL1, STEP_EXP } = require("../config/constants");

class UserController {
    static async handleBalance(message) {
        const user = await UserService.findUserById(message.author.id);
        const embed = new EmbedBuilder();
        const globalName = message.author.globalName || message.author.username;
        const coin = user.coin.toLocaleString("en-US");

        embed.setTitle(`${globalName}'s Wallet`)
            .setDescription(`<@${message.author.id}> have ${coin} ${"<:wolf_coin:1400508720160702617>"}`)
            .setColor('Yellow')
        return message.reply({ embeds: [embed] });
    }
    static async addExperience(userId, exp, interaction) {
        const user = await UserService.findUserById(userId);
        const maxExp = Number(user.lvl) * Number(DEFAULT_EXP_LVL1) * Number(STEP_EXP);
        const newExp = Number(user.exp) + Number(exp)
        console.log(newExp, " ", maxExp);
        if (newExp >= maxExp) {
            user.lvl = Number(user.lvl) + 1;
            user.exp = Number(newExp) - Number(maxExp); // Correct residual exp
            const nexMaxExp = Number(user.lvl) * Number(DEFAULT_EXP_LVL1) * Number(STEP_EXP);
            const nextLvl = Number(user.lvl) + 1;
            const path = require('path');
            const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
            const imgPath = path.join(__dirname, '../../assets/image/star.gif');
            const attachment = new AttachmentBuilder(imgPath);
            const embed = new EmbedBuilder()
                .setTitle(`${globalName} Level up!`)
                .setDescription(`Congratulations, <@${userId}> reached **level ${user.lvl}** and you need **${nexMaxExp} exp** to reach **level ${nextLvl}**!`)
                .setThumbnail('attachment://star.gif');

            await interaction.channel.send({ embeds: [embed], files: [attachment] }).catch(console.error);
        }
        else {
            user.exp = newExp;
        }
        await user.save();

        user.save();
    }
    static async addExperienceSpirit(userId, exp) {
        const user = await UserService.findUserById(userId);

        const maxExp = Number(user.spiritLvl) * Number(DEFAULT_EXP_LVL1) * Number(STEP_EXP);
        const newExp = Number(user.spiritExp) + Number(exp);

        if (newExp >= maxExp) {
            user.spiritLvl = parseInt(user.spiritLvl) + 1;
            user.spiritExp = newExp - maxExp; // giữ lại exp dư
        } else {
            user.spiritExp = newExp; // ✅ sửa từ user.exp thành user.spiritExp
        }

        await user.save();
    }

    static async addCoin(userId, coin) {
        const user = await UserService.findUserById(userId);

        const newCoin = parseInt(coin);
        user.coin += newCoin; // ép chắc về số

        await user.save();
    }



    static async giveMoneyTo(message, mentionUser, balance) {
        const embed = new EmbedBuilder();
        const userId = message.isInteraction ? message.user.id : message.author.id;

        const amount = Number(balance);
        console.log(amount)
        if (isNaN(amount) || amount <= 0) {
            embed.setTitle("❌ Transfer Error!")
                .setDescription(`Invalid amount!`)
                .setColor('Red');
            return message.reply({ embeds: [embed], ephemeral: message.isInteraction });
        }
        console.log(mentionUser.id, " ", userId)
        const userUser = await UserService.findUserById(userId);
        let targetUser = await UserService.findUserById(mentionUser.id);
        if (!targetUser || targetUser === undefined) {
            targetUser = await UserService.createNewUser(mentionUser.id);
        }

        if (userUser.coin < amount) {
            embed.setTitle("❌ Transfer Error!")
                .setDescription(`<@${userId}>, you don't have enough wolf coin. \nYour coin is ${userUser.coin.toLocaleString("en-US")} <:wolf_coin:1400508720160702617>`)
                .setColor('Red');
            return message.reply({ embeds: [embed], ephemeral: message.isInteraction });
        }

        // Embed xác nhận
        const confirmEmbed = new EmbedBuilder()
            .setTitle("🔄 Confirm Transfer")
            .setDescription(`<@${userId}>, do you want to send ${amount.toLocaleString("en-US")} <:wolf_coin:1400508720160702617> to <@${mentionUser.id}>?`)
            .setColor("Yellow");

        // Nút bấm
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_transfer')
                .setLabel('✅ Confirm')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('cancel_transfer')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger)
        );

        const confirmMessage = await message.reply({
            embeds: [confirmEmbed],
            components: [row],
            fetchReply: true // luôn fetch để collector hoạt động
        });

        // Collector cho nút
        const collector = confirmMessage.createMessageComponentCollector({
            filter: i => i.user.id === userId,
            time: 15000,
            max: 1
        });

        collector.on("collect", async (btnInteraction) => {
            if (btnInteraction.customId === "confirm_transfer") {
                userUser.coin -= amount;
                console.log(targetUser)
                // if(!targetUser) {
                //     targetUser = await UserService.createNewUser(mentionUser.id);
                // }
                // console.log(targetUser)
                // if(!targetUser.coin) {
                //     targetUser.coin = 0;
                // }
                targetUser.coin = Number(targetUser.coin) + Number(amount);
                await userUser.save();
                await targetUser.save();

                const successEmbed = new EmbedBuilder()
                    .setTitle("✅ Transfer Success!")
                    .setDescription(`<@${userId}> transferred ${amount.toLocaleString("en-US")} <:wolf_coin:1400508720160702617> to <@${mentionUser.id}>`)
                    .setColor("Green");

                await btnInteraction.update({ embeds: [successEmbed], components: [] });
            } else {
                const cancelEmbed = new EmbedBuilder()
                    .setTitle("❌ Transfer Cancelled")
                    .setDescription(`Transfer has been cancelled by <@${userId}>.`)
                    .setColor("Red");

                await btnInteraction.update({ embeds: [cancelEmbed], components: [] });
            }
        });

        collector.on("end", async (collected) => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle("⌛ Transfer Timed Out")
                    .setDescription(`<@${userId}>, you didn't confirm in time.`)
                    .setColor("Red");
                await confirmMessage.edit({ embeds: [timeoutEmbed], components: [] });
            }
        });
    }

}

module.exports = UserController;
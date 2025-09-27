const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const UserService = require("../services/userService");
const { DEFAULT_EXP_LVL1, STEP_EXP } = require("../config/constants");
const { wolfCoin } = require("../utils/wolfCoin");
const SpiritController = require("./DauLaDaiLuc/spiritController");
const InviteCode = require("../models/InviteCode");
const User = require("../models/User");
const { t } = require("../i18n/index")
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
    static async fillInviteCode(userId, code, lang = "en") {
        const inputUser = await UserService.findUserById(userId)
        if (inputUser.inviteCode)
            return t('inv.int', lang)
        const codeInf = await InviteCode.findOne({
            code
        })
        if (!code)
            return t('inv.404', lang)
        // console.log(userId,codeInf.userId)
        // const codeUser = await UserService.findUserById(code.userId)
        if (userId == codeInf.userId)
            return t('inv.yours', lang)
        // if()
        await this.addCoin(codeInf.userId, 10000)
        await this.addCoin(userId, 5000)
        const embed = new EmbedBuilder();
        embed.setTitle(t('inv.suc', lang))
            .setDescription(`<@${userId}> + **${wolfCoin(10000)}**.\n
        <@${codeInf.userId}> + **${wolfCoin(5000)}**.`)
        await User.updateOne(
            { userId: userId },
            { $set: { inviteCode: code } }
        );
        return { embeds: [embed] }
    }
    static async createInviteCode(userId) {
        let result = await InviteCode.findOne({
            userId
        })
        if (!result) {
            const newInv = new InviteCode({
                userId
            })
            result = await newInv.save()
        }
        return result;
    }
    static async createProfileEmbed(userId, avatarURL, username) {
        const user = await UserService.findUserById(userId);
        // Tính toán exp cần thiết
        const maxExp = Math.floor(user.lvl * DEFAULT_EXP_LVL1 * STEP_EXP);
        const spiritMaxExp = Math.floor(user.spiritLvl * DEFAULT_EXP_LVL1 * STEP_EXP);

        // Tính phần trăm exp hiện tại
        const expPercentage = (user.exp / maxExp) * 100;
        const spiritExpPercentage = (user.spiritExp / spiritMaxExp) * 100;

        // Tạo thanh exp progress bar
        const expBar = this.createProgressBar(expPercentage, 15);
        const spiritExpBar = this.createProgressBar(spiritExpPercentage, 15);

        // Xác định thông tin user từ cả message và interaction
        // let userObject, username, avatarURL;



        // Tạo embed
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📊 Hồ Sơ Của ${username}`)
            .setThumbnail(avatarURL)
            .addFields(
                {
                    name: '💰 Tiền',
                    value: `**${wolfCoin(user.coin)}**`,
                    inline: true
                },
                {
                    name: '🎯 Level',
                    value: `\`Level ${user.lvl.toLocaleString("en-US")}\``,
                    inline: true
                },
                {
                    name: '📈 EXP Thường',
                    value: `${expBar}\n\`${user.exp.toLocaleString("en-US")}/${maxExp.toLocaleString("en-US")} EXP (${Math.floor(expPercentage)}%)\``,
                    inline: false
                },
                {
                    name: '✨ Spirit Level',
                    value: `\`Level ${user.spiritLvl.toLocaleString("en-US")}\``,
                    inline: true
                },
                {
                    name: '✨ Spirit Title',
                    value: `\`${SpiritController.getLvlTitle(user.spiritLvl.toLocaleString("en-US"))}\``,
                    inline: true
                },
                {
                    name: '🌟 EXP Spirit',
                    value: `${spiritExpBar}\n\`${user.spiritExp.toLocaleString("en-US")}/${spiritMaxExp.toLocaleString("en-US")} EXP (${Math.floor(spiritExpPercentage)}%)\``,
                    inline: false
                },
                {
                    name: '⏰ Daily Cuối',
                    value: user.lastDaily ?
                        `Đã nhận daily\nCòn **${this.getTimeUntilNextDaily(user.lastDaily)}** để tiếp tục.` :
                        'Chưa nhận daily',
                }
            )
            .setTimestamp()
            .setFooter({
                text: `User ID: ${user.userId}`,
                iconURL: avatarURL
            });

        return embed;
    }
    static getTimeUntilNextDaily(lastDaily) {
        const now = new Date();
        const nextDaily = new Date(lastDaily);
        nextDaily.setHours(nextDaily.getHours() + 24);

        const diff = nextDaily - now;
        if (diff <= 0) return '0h 0m 0s (Sẵn sàng)';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return `${hours}h ${minutes}m ${seconds}s`;
    }
    // Hàm tạo progress bar
    static createProgressBar(percentage, length) {
        const filledSquares = Math.floor((percentage / 100) * length);
        const emptySquares = length - filledSquares;

        const bar = '█'.repeat(filledSquares) + '░'.repeat(emptySquares);
        return `[${bar}]`;
    }

    static async addExperience(userId, exp, interaction) {
        const user = await UserService.findUserById(userId);
        const maxExp = Number(user.lvl) * Number(DEFAULT_EXP_LVL1) * Number(STEP_EXP);
        const newExp = Number(user.exp) + Number(exp);

        console.log(newExp, " ", maxExp);

        // Xử lý level up nhiều lần nếu exp nhận được rất lớn
        let currentExp = newExp;
        let levelUps = 0;
        let currentLevel = Number(user.lvl);

        while (currentExp >= maxExp) {
            currentExp -= maxExp;
            currentLevel++;
            levelUps++;

            // Tính maxExp cho level mới
            const newMaxExp = currentLevel * Number(DEFAULT_EXP_LVL1) * Number(STEP_EXP);

            // Nếu exp còn lại vẫn đủ để lên level tiếp, tiếp tục vòng lặp
            if (currentExp < newMaxExp) {
                break;
            }
        }

        if (levelUps > 0) {
            user.lvl = currentLevel;
            user.exp = currentExp;

            const nextMaxExp = currentLevel * Number(DEFAULT_EXP_LVL1) * Number(STEP_EXP);
            const nextLvl = currentLevel + 1;

            const path = require('path');
            const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
            const imgPath = path.join(__dirname, '../../assets/image/star.gif');
            const attachment = new AttachmentBuilder(imgPath);

            const embed = new EmbedBuilder()
                .setTitle(`${globalName} Level up!`)
                .setDescription(`Congratulations, <@${userId}> reached **level ${user.lvl}** and you need **${nextMaxExp} exp** to reach **level ${nextLvl}**!`)
                .setThumbnail('attachment://star.gif');

            await interaction.channel.send({ embeds: [embed], files: [attachment] }).catch(console.error);
        } else {
            user.exp = currentExp;
        }

        await user.save();
    }
    static async addExperienceSpirit(userId, exp) {
        const user = await UserService.findUserById(userId);

        let currentLevel = Number(user.spiritLvl);
        let currentExp = Number(user.spiritExp) + Number(exp);

        // Xử lý level up nhiều lần nếu exp nhận được rất lớn
        let levelUps = 0;

        while (true) {
            const maxExp = currentLevel * Number(DEFAULT_EXP_LVL1) * Number(STEP_EXP);

            if (currentExp >= maxExp) {
                currentExp -= maxExp;
                currentLevel++;
                levelUps++;
            } else {
                break;
            }
        }

        if (levelUps > 0) {
            user.spiritLvl = currentLevel;
            user.spiritExp = currentExp;

            // Có thể thêm thông báo level up ở đây nếu cần
            console.log(`User ${userId} leveled up ${levelUps} times to level ${currentLevel}`);
        } else {
            user.spiritExp = currentExp;
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
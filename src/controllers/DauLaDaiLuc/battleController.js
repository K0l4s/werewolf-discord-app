const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const SpiritService = require('../../services/DauLaDaiLuc/spiritService');
const Battle = require('../../models/DauLaDaiLuc/Battle');
const UserService = require('../../services/userService');
const UserController = require('../userController');
const { wolfCoin } = require('../../utils/wolfCoin');

class BattleController {
    // Khởi tạo trận đấu (hỗ trợ cả message và interaction)
    static async initiateBattle(initiatorId, targetId, context) {
        try {
            // Kiểm tra cả 2 người chơi đều có vũ hồn
            const initiatorSpirits = await SpiritService.getSpiritsByUserId(initiatorId);
            const targetSpirits = await SpiritService.getSpiritsByUserId(targetId);

            if (initiatorSpirits.length === 0) {
                return { content: '❌ Bạn chưa có vũ hồn để chiến đấu!', ephemeral: true };
            }
            if (targetSpirits.length === 0) {
                return { content: '❌ Đối thủ chưa có vũ hồn để chiến đấu!', ephemeral: true };
            }

            // Kiểm tra nếu người chơi đã có trận đấu đang chờ
            const existingBattle = await Battle.findOne({
                $or: [
                    { initiatorId, status: 'pending' },
                    { targetId, status: 'pending' }
                ]
            });

            if (existingBattle) {
                return { content: '❌ Bạn hoặc đối thủ đã có một trận đấu đang chờ!', ephemeral: true };
            }

            const battleId = `${initiatorId}-${targetId}-${Date.now()}`;

            const challengeEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('⚔️ Thách Đấu Vũ Hồn ⚔️')
                .setDescription(`<@${initiatorId}> đã thách đấu <@${targetId}>!`)
                .addFields(
                    { name: 'Người thách đấu', value: `<@${initiatorId}>`, inline: true },
                    { name: 'Người được thách đấu', value: `<@${targetId}>`, inline: true },
                    { name: 'Trạng thái', value: '⏳ Đang chờ phản hồi...', inline: false }
                )
                .setFooter({ text: 'Trận đấu sẽ tự động hủy sau 1 phút' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`accept_battle_${battleId}`)
                        .setLabel('✅ Chấp nhận')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`reject_battle_${battleId}`)
                        .setLabel('❌ Từ chối')
                        .setStyle(ButtonStyle.Danger)
                );

            let challengeMsg;
            if (context.replied || context.deferred) {
                challengeMsg = await context.followUp({
                    embeds: [challengeEmbed],
                    components: [row],
                    fetchReply: true
                });
            } else if (context.isButton?.()) {  // chỉ gọi nếu tồn tại
                challengeMsg = await context.reply({
                    embeds: [challengeEmbed],
                    components: [row],
                    fetchReply: true
                });
            } else {
                challengeMsg = await context.reply({
                    embeds: [challengeEmbed],
                    components: [row],
                    fetchReply: true
                });
            }


            // Lưu thông tin trận đấu vào database
            const battleData = {
                battleId,
                initiatorId,
                targetId,
                messageId: challengeMsg.id,
                channelId: challengeMsg.channel.id,
                status: 'pending',
                initiatorSpirit: initiatorSpirits[0],
                initiatorSpirit2: initiatorSpirits[1] || null,
                targetSpirit: targetSpirits[0],
                targetSpirit2: targetSpirits[1] || null
            };

            await Battle.create(battleData);

            const collector = challengeMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000
            });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== targetId) {
                    await interaction.reply({
                        content: '❌ Chỉ người được thách đấu mới có thể phản hồi!',
                        ephemeral: true
                    });
                    return;
                }

                if (interaction.customId === `accept_battle_${battleId}`) {
                    await this.acceptBattle(battleId, interaction);
                } else if (interaction.customId === `reject_battle_${battleId}`) {
                    await this.rejectBattle(battleId, interaction);
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    const battle = await Battle.findOne({ battleId, status: 'pending' });
                    if (battle) {
                        await this.timeoutBattle(battleId);
                    }
                }
            });

            return null;

        } catch (error) {
            console.error('Lỗi khi khởi tạo battle:', error);
            return { content: '❌ Đã xảy ra lỗi khi khởi tạo trận đấu!', ephemeral: true };
        }
    }

    // Chấp nhận trận đấu
    static async acceptBattle(battleId, interaction) {
        try {
            const battle = await Battle.findOne({ battleId });
            if (!battle || battle.status !== 'pending') {
                await interaction.reply({ content: '❌ Trận đấu không tồn tại hoặc đã kết thúc!', ephemeral: true });
                return;
            }

            // Cập nhật trạng thái trận đấu
            battle.status = 'active';
            await battle.save();

            // Lấy thông tin chi tiết spirit chính
            const initiatorSpiritDetail = await SpiritService.getSpiritById(battle.initiatorSpirit.spirit._id);
            const targetSpiritDetail = await SpiritService.getSpiritById(battle.targetSpirit.spirit._id);

            // Kiểm tra và lấy vũ hồn thứ 2 nếu có
            let initiatorSpiritDetail2 = null;
            let targetSpiritDetail2 = null;

            if (battle.initiatorSpirit2) {
                initiatorSpiritDetail2 = await SpiritService.getSpiritById(battle.initiatorSpirit2.spirit._id);
            }
            if (battle.targetSpirit2) {
                targetSpiritDetail2 = await SpiritService.getSpiritById(battle.targetSpirit2.spirit._id);
            }

            // Khởi tạo HP cho trận đấu
            battle.initiatorHP = initiatorSpiritDetail.hp || 100;
            battle.targetHP = targetSpiritDetail.hp || 100;

            // Nếu có vũ hồn thứ 2, cộng thêm HP
            if (initiatorSpiritDetail2) {
                battle.initiatorHP += initiatorSpiritDetail2.hp || 0;
                battle.initiatorHP2 = initiatorSpiritDetail2.hp || 100;
                battle.initiatorCurrentSpirit = 0;
            } else {
                battle.initiatorHP2 = null;
                battle.initiatorCurrentSpirit = 0;
            }

            if (targetSpiritDetail2) {
                battle.targetHP += targetSpiritDetail2.hp || 0;
                battle.targetHP2 = targetSpiritDetail2.hp || 100;
                battle.targetCurrentSpirit = 0;
            } else {
                battle.targetHP2 = null;
                battle.targetCurrentSpirit = 0;
            }

            // Lưu thông tin chi tiết vào battle
            battle.initiatorSpiritDetail = initiatorSpiritDetail;
            battle.targetSpiritDetail = targetSpiritDetail;
            battle.initiatorSpiritDetail2 = initiatorSpiritDetail2;
            battle.targetSpiritDetail2 = targetSpiritDetail2;
            battle.round = 0;

            await battle.save();

            const updatedEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('⚔️ Trận Đấu Đã Được Chấp Nhận! ⚔️')
                .setDescription(`<@${battle.initiatorId}> vs <@${battle.targetId}>`)
                .addFields(
                    { name: 'Trạng thái', value: '🎬 Đang bắt đầu...', inline: false },
                    { name: 'Số vũ hồn', value: `${initiatorSpiritDetail2 ? '2' : '1'} vs ${targetSpiritDetail2 ? '2' : '1'}`, inline: false }
                )
                .setTimestamp();

            await interaction.update({
                embeds: [updatedEmbed],
                components: []
            });

            // Lấy message từ database
            const channel = interaction.client.channels.cache.get(battle.channelId);
            if (channel) {
                try {
                    const message = await channel.messages.fetch(battle.messageId);
                    await this.battleAnimationWithHP(battleId, message);
                } catch (error) {
                    console.error('Không thể lấy message:', error);
                }
            }

        } catch (error) {
            console.error('Lỗi khi chấp nhận battle:', error);
            await interaction.reply({ content: '❌ Đã xảy ra lỗi khi chấp nhận trận đấu!', ephemeral: true });
        }
    }

    // Animation chiến đấu với tính toán HP từng lượt
    static async battleAnimationWithHP(battleId, message) {
        try {
            let battle = await Battle.findOne({ battleId });
            if (!battle || battle.status !== 'active') return;

            let currentMessage = message;
            let round = 1;

            // Hiển thị thông tin ban đầu
            const startEmbed = new EmbedBuilder()
                .setColor(0xFFFF00)
                .setTitle('⚔️ BẮT ĐẦU TRẬN ĐẤU ⚔️')
                .setDescription('Hai vũ hồn chuẩn bị chiến đấu!')
                .addFields(
                    { name: `Người khiêu chiến`, value: `${battle.initiatorSpiritDetail.name}\n❤️ HP: ${battle.initiatorHP}`, inline: true },
                    { name: 'VS', value: '⚔️', inline: true },
                    { name: `Người được khiêu chiến`, value: `${battle.targetSpiritDetail.name}\n❤️ HP: ${battle.targetHP}`, inline: true },
                    { name: '⚔️ ATK', value: battle.initiatorSpiritDetail.atk.toString(), inline: true },
                    { name: '🛡️ DEF', value: battle.initiatorSpiritDetail.def.toString(), inline: true },
                    { name: '🌀 SPD', value: battle.initiatorSpiritDetail.sp.toString(), inline: true }
                )
                .setTimestamp();

            currentMessage = await currentMessage.edit({ embeds: [startEmbed] });
            await this.delay(250);

            // Chiến đấu cho đến khi một bên hết HP
            while (battle.initiatorHP > 0 && battle.targetHP > 0) {
                // Luôn reload battle từ database để có data mới nhất
                battle = await Battle.findOne({ battleId });

                // Kiểm tra nếu trận đấu bị kẹt
                if (this.isBattleStuck(battle)) {
                    console.warn(`Trận đấu ${battleId} bị kẹt, buộc kết thúc`);
                    battle.initiatorHP = 0;
                    battle.targetHP = 0;
                    await battle.save();
                    break;
                }

                // Kiểm tra nếu một bên đã thua
                if (battle.initiatorHP <= 0 || battle.targetHP <= 0) {
                    break;
                }

                // Xử lý một round chiến đấu
                const roundResult = await this.executeBattleRound(battleId, round);

                // Reload battle sau khi xử lý round
                battle = await Battle.findOne({ battleId });

                const roundEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle(`🔄 Lượt ${round} - Chiến Đấu`)
                    .setDescription(roundResult.description)
                    .addFields(
                        { name: `⚔️ Người khiêu chiến`, value: `❤️ HP: ${battle.initiatorHP}`, inline: true },
                        { name: 'VS', value: '⚔️', inline: true },
                        { name: `⚔️ Người được khiêu chiến`, value: `❤️ HP: ${battle.targetHP}`, inline: true }
                    )
                    .setFooter({ text: `Lượt ${round}` })
                    .setTimestamp();

                currentMessage = await currentMessage.edit({ embeds: [roundEmbed] });
                await this.delay(250);

                round++;
                battle.round = round;
                await battle.save();

                // Kiểm tra điều kiện an toàn
                if (round > 100) {
                    console.warn(`Trận đấu ${battleId} vượt quá 100 round, buộc dừng`);
                    battle.initiatorHP = 0;
                    battle.targetHP = 0;
                    await battle.save();
                    break;
                }
            }

            // Hiển thị kết quả cuối cùng
            await this.showBattleResultWithHP(battleId, currentMessage);

        } catch (error) {
            console.error('Lỗi trong battle animation:', error);

            // Đảm bảo trận đấu luôn được kết thúc
            try {
                const battle = await Battle.findOne({ battleId });
                if (battle && battle.status === 'active') {
                    battle.status = 'completed';
                    await battle.save();
                }
            } catch (saveError) {
                console.error('Lỗi khi cập nhật trạng thái trận đấu:', saveError);
            }
        }
    }

    static async executeBattleRound(battleId, round) {
        let battle = await Battle.findOne({ battleId });
        if (!battle) {
            return { description: 'Lỗi trận đấu', details: '' };
        }

        // Xác định spirit hiện tại đang chiến đấu
        const initiatorCurrentSpirit = (battle.initiatorCurrentSpirit === 0 || !battle.initiatorSpiritDetail2)
            ? battle.initiatorSpiritDetail
            : battle.initiatorSpiritDetail2;
        const targetCurrentSpirit = (battle.targetCurrentSpirit === 0 || !battle.targetSpiritDetail2)
            ? battle.targetSpiritDetail
            : battle.targetSpiritDetail2;

        let roundDescription = `**Round ${round}**\n`;
        let roundDetails = "";
        let totalDamage = 0;

        // Hiển thị thanh máu trước khi round bắt đầu
        const initiatorMaxHP = battle.initiatorCurrentSpirit === 0 ?
            battle.initiatorSpiritDetail.hp : battle.initiatorSpiritDetail2.hp;
        const targetMaxHP = battle.targetCurrentSpirit === 0 ?
            battle.targetSpiritDetail.hp : battle.targetSpiritDetail2.hp;

        const initiatorHealthBar = this.generateHealthBar(battle.initiatorHP, initiatorMaxHP);
        const targetHealthBar = this.generateHealthBar(battle.targetHP, targetMaxHP);

        roundDescription += `\n<@${battle.initiatorId}> ${initiatorHealthBar} ${battle.initiatorHP}/${initiatorMaxHP} HP\n`;
        roundDescription += `<@${battle.targetId}> ${targetHealthBar} ${battle.targetHP}/${targetMaxHP} HP\n\n`;

        // Xác định thứ tự tấn công dựa trên speed
        let firstAttacker, firstDefender, secondAttacker, secondDefender;
        let firstIsInitiator, secondIsInitiator;

        if (initiatorCurrentSpirit.sp > targetCurrentSpirit.sp) {
            firstAttacker = initiatorCurrentSpirit;
            firstDefender = targetCurrentSpirit;
            firstIsInitiator = true;
            secondAttacker = targetCurrentSpirit;
            secondDefender = initiatorCurrentSpirit;
            secondIsInitiator = false;
        } else if (targetCurrentSpirit.sp > initiatorCurrentSpirit.sp) {
            firstAttacker = targetCurrentSpirit;
            firstDefender = initiatorCurrentSpirit;
            firstIsInitiator = false;
            secondAttacker = initiatorCurrentSpirit;
            secondDefender = targetCurrentSpirit;
            secondIsInitiator = true;
        } else {
            firstIsInitiator = Math.random() > 0.5;
            firstAttacker = firstIsInitiator ? initiatorCurrentSpirit : targetCurrentSpirit;
            firstDefender = firstIsInitiator ? targetCurrentSpirit : initiatorCurrentSpirit;
            secondAttacker = firstIsInitiator ? targetCurrentSpirit : initiatorCurrentSpirit;
            secondDefender = firstIsInitiator ? initiatorCurrentSpirit : targetCurrentSpirit;
            secondIsInitiator = !firstIsInitiator;
        }

        // Tấn công của spirit thứ nhất
        const firstAttackResult = this.executeSingleAttack(battle, firstAttacker, firstDefender, firstIsInitiator);
        await battle.save();

        roundDescription += `• ${firstAttackResult.description}\n`;
        roundDetails += `• ${firstAttackResult.details}\n`;
        totalDamage += firstAttackResult.damage;

        // Reload battle sau tấn công thứ nhất
        battle = await Battle.findOne({ battleId });

        // Kiểm tra nếu một bên đã thua sau đòn tấn công đầu tiên
        if (battle.initiatorHP <= 0 || battle.targetHP <= 0) {
            // Hiển thị thanh máu sau khi round kết thúc
            const initiatorFinalHealthBar = this.generateHealthBar(battle.initiatorHP, initiatorMaxHP);
            const targetFinalHealthBar = this.generateHealthBar(battle.targetHP, targetMaxHP);

            roundDescription += `\n**Kết thúc round ${round}:**\n`;
            roundDescription += `<@${battle.initiatorId}> ${initiatorFinalHealthBar} ${battle.initiatorHP}/${initiatorMaxHP} HP\n`;
            roundDescription += `<@${battle.targetId}> ${targetFinalHealthBar} ${battle.targetHP}/${targetMaxHP} HP\n`;

            return {
                description: roundDescription,
                details: roundDetails,
                totalDamage: totalDamage
            };
        }

        // Tấn công của spirit thứ hai
        const secondAttackResult = this.executeSingleAttack(battle, secondAttacker, secondDefender, secondIsInitiator);
        await battle.save();

        roundDescription += `• ${secondAttackResult.description}\n`;
        roundDetails += `• ${secondAttackResult.details}\n`;
        totalDamage += secondAttackResult.damage;

        // Reload battle sau tấn công thứ hai
        battle = await Battle.findOne({ battleId });

        // Hiển thị thanh máu sau khi round kết thúc
        const initiatorFinalHealthBar = this.generateHealthBar(battle.initiatorHP, initiatorMaxHP);
        const targetFinalHealthBar = this.generateHealthBar(battle.targetHP, targetMaxHP);

        roundDescription += `\n**Kết thúc round ${round}:**\n`;
        roundDescription += `<@${battle.initiatorId}> ${initiatorFinalHealthBar} ${battle.initiatorHP}/${initiatorMaxHP} HP\n`;
        roundDescription += `<@${battle.targetId}> ${targetFinalHealthBar} ${battle.targetHP}/${targetMaxHP} HP\n`;

        // Hiển thị thông tin vũ hồn đang chiến đấu nếu có 2 vũ hồn
        if (battle.initiatorSpiritDetail2) {
            const currentSpirit = battle.initiatorCurrentSpirit === 0 ? battle.initiatorSpiritDetail : battle.initiatorSpiritDetail2;
            roundDescription += `🎯 <@${battle.initiatorId}> đang dùng: ${currentSpirit.icon}\n`;
        }
        if (battle.targetSpiritDetail2) {
            const currentSpirit = battle.targetCurrentSpirit === 0 ? battle.targetSpiritDetail : battle.targetSpiritDetail2;
            roundDescription += `🎯 <@${battle.targetId}> đang dùng: ${currentSpirit.icon}\n`;
        }

        return {
            description: roundDescription,
            details: roundDetails,
            totalDamage: totalDamage
        };
    }

    // Hàm tạo thanh máu
    static generateHealthBar(currentHP, maxHP) {
        const totalSegments = 8;
        const clampedHP = Math.max(0, Math.min(currentHP, maxHP));
        const filledSegments = Math.round((clampedHP / maxHP) * totalSegments);
        const emptySegments = Math.max(0, totalSegments - filledSegments);

        return '∎'.repeat(filledSegments) + '□'.repeat(emptySegments);
    }

    static executeSingleAttack(battle, attacker, defender, isInitiatorAttacking) {
        // Tính toán damage
        const baseDamage = Math.max(1, attacker.atk);
        const defenseReduction = defender.def * 0.3;
        const finalDamage = Math.max(1, Math.floor(baseDamage - defenseReduction));

        // Critical hit chance
        const isCritical = Math.random() < 0.1;
        let actualDamage = finalDamage;
        let criticalText = '';

        if (isCritical) {
            actualDamage = Math.floor(finalDamage * 1.5);
            criticalText = ' **💥 CRITICAL HIT!**';
        }

        // Áp dụng damage
        if (isInitiatorAttacking) {
            battle.targetHP = Math.max(0, battle.targetHP - actualDamage);

            // Kiểm tra chuyển đổi vũ hồn nếu cần
            if (battle.targetHP <= 0 && battle.targetSpiritDetail2 && battle.targetCurrentSpirit === 0) {
                battle.targetCurrentSpirit = 1;
                battle.targetHP = battle.targetHP2;
            }
        } else {
            battle.initiatorHP = Math.max(0, battle.initiatorHP - actualDamage);

            // Kiểm tra chuyển đổi vũ hồn nếu cần
            if (battle.initiatorHP <= 0 && battle.initiatorSpiritDetail2 && battle.initiatorCurrentSpirit === 0) {
                battle.initiatorCurrentSpirit = 1;
                battle.initiatorHP = battle.initiatorHP2;
            }
        }

        return {
            description: `${attacker.icon} tấn công ${defender.icon}!${criticalText}`,
            details: `${attacker.icon} Gây **${actualDamage}** damage (${isCritical ? 'Critical! ' : ''}ATK: ${attacker.atk} - DEF: ${defender.def})`,
            damage: actualDamage
        };
    }

    // Hiển thị kết quả với HP
    static async showBattleResultWithHP(battleId, message) {
        const battle = await Battle.findOne({ battleId });
        if (!battle) return;

        const { initiatorId, targetId, initiatorHP, targetHP, initiatorSpiritDetail, initiatorSpiritDetail2, targetSpiritDetail, targetSpiritDetail2 } = battle;

        let winnerId, loserId, winnerSpirit, winnerSpirit2, resultText;

        if (initiatorHP <= 0 && targetHP <= 0) {
            resultText = '🤝 CẢ HAI CÙNG NGÃ XUỐNG!';
            winnerId = null;
        } else if (initiatorHP <= 0) {
            winnerId = targetId;
            loserId = initiatorId;
            winnerSpirit = targetSpiritDetail;
            if (targetSpiritDetail2)
                winnerSpirit2 = targetSpiritDetail2;
            resultText = `🎉 <@${targetId}> CHIẾN THẮNG!`;
        } else {
            winnerId = initiatorId;
            loserId = targetId;
            winnerSpirit = initiatorSpiritDetail;
            if (initiatorSpiritDetail2)
                winnerSpirit2 = initiatorSpiritDetail2;
            resultText = `🎉 <@${initiatorId}> CHIẾN THẮNG!`;
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(winnerId ? 0x00FF00 : 0x808080)
            .setTitle('🏁 KẾT THÚC TRẬN ĐẤU 🏁')
            .setDescription(resultText)
            .addFields(
                { name: `Người khiêu chiến`, value: `❤️ HP cuối: ${initiatorHP}\n${initiatorSpiritDetail.name}`, inline: true },
                { name: 'VS', value: '⚔️', inline: true },
                { name: `Người được khiêu chiến`, value: `❤️ HP cuối: ${targetHP}\n${targetSpiritDetail.name}`, inline: true }
            );

        if (winnerId) {
            // const winnerUser = await UserService.findUserById(winnerId);
            // await UserController.addExperience(50);
            await UserController.addExperienceSpirit(winnerId,100)
            await UserController.addCoin(winnerId,120)
            
            await UserController.addExperienceSpirit(loserId,10)
            await UserController.addCoin(loserId,12)
            resultEmbed.addFields(
                { name: '🏆 Người chiến thắng', value: `<@${winnerId}>`, inline: false },
                { name: '⭐ Vũ hồn chiến thắng', value: `${winnerSpirit.icon}  ${winnerSpirit2 ? "và " + winnerSpirit2.icon : ""}`, inline: false },
                { name: '🎯 Phần thưởng', 
                    value: `**<@${winnerId}> nhận được**\n **+100** Spirit Exp \n +**${wolfCoin(120)}**
                    **<@${loserId}> nhận được** \n **+10** Spirit Exp \n +**${wolfCoin(12)}**`, inline: false }
            );
        } else {
            await UserController.addExperienceSpirit(initiatorId,50)
            await UserController.addCoin(initiatorId,60)
            
            await UserController.addExperienceSpirit(targetId,60)
            await UserController.addCoin(targetId,60)
            resultEmbed.addFields(
                { name: '🎯 Kết quả', value: 'Trận đấu hòa!', inline: false },
                { name: '🏆 Phần thưởng', value: `Mỗi người nhận +**50** Spirit Exp và +**${wolfCoin(60)}**`, inline: false }
            );
        }

        await message.edit({ embeds: [resultEmbed] });

        // Cập nhật trạng thái trận đấu
        battle.status = 'completed';
        await battle.save();
    }

    // Từ chối trận đấu
    static async rejectBattle(battleId, interaction) {
        try {
            const battle = await Battle.findOne({ battleId });
            if (!battle) {
                await interaction.reply({ content: '❌ Trận đấu không tồn tại!', ephemeral: true });
                return;
            }

            battle.status = 'rejected';
            await battle.save();

            const rejectEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Trận Đấu Đã Bị Từ Chối')
                .setDescription(`<@${battle.targetId}> đã từ chối thách đấu!`)
                .setTimestamp();

            await interaction.update({
                embeds: [rejectEmbed],
                components: []
            });

        } catch (error) {
            console.error('Lỗi khi từ chối battle:', error);
            await interaction.reply({ content: '❌ Đã xảy ra lỗi khi từ chối trận đấu!', ephemeral: true });
        }
    }

    // Timeout trận đấu
    static async timeoutBattle(battleId) {
        try {
            const battle = await Battle.findOne({ battleId });
            if (!battle) return;

            battle.status = 'timeout';
            await battle.save();

            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x808080)
                .setTitle('⏰ Trận Đấu Đã Hết Hạn')
                .setDescription('Đối thủ không phản hồi kịp thời!')
                .setTimestamp();

            const channel = global.client.channels.cache.get(battle.channelId);
            if (channel) {
                try {
                    const message = await channel.messages.fetch(battle.messageId);
                    await message.edit({
                        embeds: [timeoutEmbed],
                        components: []
                    });
                } catch (error) {
                    console.error('Không thể lấy message:', error);
                }
            }
        } catch (error) {
            console.error('Lỗi khi timeout battle:', error);
        }
    }

    // Hàm xử lý command battle (hỗ trợ cả prefix và slash command)
    static async handleBattleCommand(context, args = []) {
        let userId, targetId, targetMention;

        // Xác định loại command
        if (context instanceof Object && context.author) {
            // Prefix command
            userId = context.author.id;

            if (args.length < 1) {
                return context.reply('❌ Sai cú pháp! Sử dụng: `!battle @người_chơi`');
            }

            targetMention = args[0];
            targetId = targetMention.replace(/[<@!>]/g, '');
        } else if (context.isChatInputCommand) {
            // Slash command
            userId = context.user.id;
            targetId = context.options.getUser('user').id;
        } else if (context.isButton()) {
            // Button interaction
            userId = context.user.id;
            // Xử lý logic riêng cho button nếu cần
            return;
        }

        if (targetId === userId) {
            return this.replyToContext(context, '❌ Bạn không thể tự đấu với chính mình!');
        }

        const activeBattle = await Battle.findOne({
            $or: [
                { initiatorId: userId, status: { $in: ['pending', 'active'] } },
                { targetId: userId, status: { $in: ['pending', 'active'] } }
            ]
        });

        if (activeBattle) {
            return this.replyToContext(context, '❌ Bạn đang trong một trận đấu khác!');
        }

        const targetActiveBattle = await Battle.findOne({
            $or: [
                { initiatorId: targetId, status: { $in: ['pending', 'active'] } },
                { targetId: targetId, status: { $in: ['pending', 'active'] } }
            ]
        });

        if (targetActiveBattle) {
            return this.replyToContext(context, '❌ Đối thủ đang trong một trận đấu khác!');
        }

        const result = await this.initiateBattle(userId, targetId, context);
        if (result) {
            this.replyToContext(context, result);
        }
    }

    // Hàm trả lời phù hợp với loại context
    static async replyToContext(context, response) {
        if (context.replied || context.deferred) {
            return context.followUp(response);
        } else if (context.isButton?.() || context.isChatInputCommand?.()) {
            // interaction (slash command hoặc button)
            return context.reply(response);
        } else {
            // message command
            return context.reply(response);
        }
    }


    // Kiểm tra trận đấu có bị kẹt không
    static isBattleStuck(battle) {
        const initiatorCurrentSpirit = (battle.initiatorCurrentSpirit === 0 || !battle.initiatorSpiritDetail2)
            ? battle.initiatorSpiritDetail
            : battle.initiatorSpiritDetail2;
        const targetCurrentSpirit = (battle.targetCurrentSpirit === 0 || !battle.targetSpiritDetail2)
            ? battle.targetSpiritDetail
            : battle.targetSpiritDetail2;

        const initiatorDamage = Math.max(1, Math.floor(initiatorCurrentSpirit.atk - (targetCurrentSpirit.def * 0.3)));
        const targetDamage = Math.max(1, Math.floor(targetCurrentSpirit.atk - (initiatorCurrentSpirit.def * 0.3)));

        return initiatorDamage <= 1 && targetDamage <= 1 && battle.initiatorHP > 100 && battle.targetHP > 100;
    }

    // Delay function
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Khôi phục trận đấu khi bot khởi động lại
    static async restoreBattles(client) {
        try {
            const activeBattles = await Battle.find({
                status: { $in: ['pending', 'active'] }
            });

            for (const battle of activeBattles) {
                if (battle.status === 'pending' && Date.now() - battle.createdAt.getTime() > 60000) {
                    battle.status = 'timeout';
                    await battle.save();
                } else if (battle.status === 'active') {
                    battle.status = 'completed';
                    await battle.save();
                }
            }

            console.log(`Đã khôi phục ${activeBattles.length} trận đấu`);
        } catch (error) {
            console.error('Lỗi khi khôi phục trận đấu:', error);
        }
    }
}

module.exports = BattleController;
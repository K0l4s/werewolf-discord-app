// werewolf-discord-bot.js
require("dotenv").config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
const roles = require("./roles");
// const logic = require("./logic")
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions

    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User]
});

const games = new Map();

client.once("ready", () => {
    console.log(`✅ Bot đã đăng nhập với tên: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    const content = message.content.toLowerCase();
    const channelId = message.channel.id;

    if (!games.has(channelId)) {
        games.set(channelId, {
            players: [],
            gameStarted: false,
            roleMap: new Map(),
            phase: 'waiting',
            votes: new Map(),
            actions: new Set(),
            killed: null,
            timeout: null
        });
    }

    const game = games.get(channelId);

    if (content === "cj") {
        if (game.gameStarted) return message.reply("⛔ Trò chơi đã bắt đầu!");
        if (!game.players.find(p => p.id === message.author.id)) {
            game.players.push(message.author);
            message.reply(`✅ Bạn đã tham gia trò chơi. Tổng số người chơi hiện tại là ${game.players.length} người.`);
        } else {
            message.reply("⚠️ Bạn đã tham gia rồi.");
        }
    }

    if (content === "cstart") {
        if (game.gameStarted) return message.reply("⛔ Trò chơi đang chạy.");
        // if (game.players.length < 4) return message.reply("⚠️ Cần ít nhất 4 người để bắt đầu.");

        game.gameStarted = true;
        game.phase = 'night';
        message.channel.send("🎲 Trò chơi bắt đầu!");

        const assigned = roles.assignRoles(game.players);
        for (const [player, role] of assigned.entries()) {
            console.log(`Vai trò của ${player.username} là ${role.name}`)
            game.roleMap.set(player.id, role);
            try {
                const user = await client.users.fetch(player.id);
                const embed = new EmbedBuilder()
                    .setTitle(`🔐 Vai trò: ${role.name}`)
                    .setDescription(role.description)
                    .setColor(0xFFAA00);
                if (role.image) embed.setImage(role.image);
                await user.send({ embeds: [embed] });
            } catch {
                message.channel.send(`⚠️ Không thể gửi DM cho <@${player.id}>. Vui lòng bật tin nhắn riêng từ thành viên server.`);
            }
        }

        announcePlayers(channelId, message);
        startNightPhase(channelId, message);
    }

    if (content === "creset") {
        games.delete(channelId);
        message.channel.send("🔁 Đã reset trò chơi trong phòng.");
    }
});

function announcePlayers(channelId, message) {
    const game = games.get(channelId);
    const mentions = game.players.map(p => `<@${p.id}>`).join(" ");
    message.channel.send({
        embeds: [
            new EmbedBuilder()
                .setTitle("🌙 Đêm đầu tiên bắt đầu")
                .setDescription("Ai là sói? Ai là tiên tri?")
                .addFields({ name: "Người còn sống", value: mentions })
                .setColor(0x222244)
        ]
    });
}

function startNightPhase(channelId, message) {
    const game = games.get(channelId);

    game.phase = 'night';
    game.actions.clear();
    game.killed = null;
    message.channel.send("🌙 Đêm đã đến. Hành động sẽ được gửi qua tin nhắn riêng.");
    sendRoleActions(channelId, game);

    if (game.timeout) clearTimeout(game.timeout);
    game.timeout = setTimeout(() => {
        message.channel.send("⏰ Hết thời gian ban đêm! Những ai chưa hành động sẽ bị bỏ qua.");
        startDayPhase(channelId, message);
    }, 5 * 60 * 1000);
}

function checkNightPhaseProgress(channelId, messageOrNull) {
    const game = games.get(channelId);

    const required = game.players.filter(p => {
        const role = game.roleMap.get(p.id);
        return role.name === 'Sói' || role.name === 'Tiên tri';
    });
    if (game.actions.size >= required.length) {
        if (game.timeout) clearTimeout(game.timeout);
        const fallbackMessage = messageOrNull?.channel?.send ? messageOrNull : { channel: { send: () => { } } };
        startDayPhase(channelId, fallbackMessage);
    }
}

function startDayPhase(channelId, message) {
    const game = games.get(channelId);
    checkWinCondition(channelId, message); // ✅ Sửa đúng thứ tự tham số
    sendDayVoteDM(channelId);
    game.phase = 'day';
    game.votes.clear();

    if (game.killed) {
        message.channel.send(`☠️ ${game.killed.username} đã bị giết trong đêm!`);
        game.players = game.players.filter(p => p.id !== game.killed.id);
    } else {
        message.channel.send("✅ Không ai bị giết đêm qua.");
    }

    message.channel.send("☀️ Ban ngày bắt đầu! Hãy thảo luận và sử dụng `cvote` để bỏ phiếu.");

    if (game.timeout) clearTimeout(game.timeout);
    game.timeout = setTimeout(() => {
        message.channel.send("⏰ Hết thời gian ban ngày! Những ai không vote sẽ bị bỏ qua.");
        startNightPhase(channelId, message);
    }, 5 * 60 * 1000);
}

function checkWinCondition(channelId, message) {
    const game = games.get(channelId);

    if (!game || !game.players || !game.roleMap) return false;

    const alive = game.players;
    const wolves = alive.filter(p => game.roleMap.get(p.id)?.name === "Sói");
    const villagers = alive.filter(p => game.roleMap.get(p.id)?.name !== "Sói");

    if (wolves.length === 0) {
        message.channel.send("🎉 **Dân làng đã chiến thắng! Sói đã bị tiêu diệt.**");
        game.phase = 'ended';
        return true;
    }

    if (wolves.length >= villagers.length) {
        message.channel.send("🐺 **Sói đã chiến thắng! Chúng đã áp đảo dân làng.**");
        game.phase = 'ended';
        return true;
    }

    return false;
}

function checkDayPhaseProgress(channelId, message) {
    const game = games.get(channelId);
    const alive = game.players;
    if (game.votes.size >= alive.length) {
        if (game.timeout) clearTimeout(game.timeout);

        const voteCounts = game.voteCounts || new Map();
        let maxVotes = 0;
        let killedPlayer = null;

        for (const [targetId, count] of voteCounts.entries()) {
            if (count > maxVotes) {
                maxVotes = count;
                killedPlayer = game.players.find(p => p.id === targetId);
            } else if (count === maxVotes) {
                killedPlayer = null; // Hòa phiếu
            }
        }

        if (killedPlayer) {
            message.channel.send(`⚖️ ${killedPlayer.username} đã bị treo cổ!`);
            game.players = game.players.filter(p => p.id !== killedPlayer.id);
        } else {
            message.channel.send("⚖️ Hòa phiếu! Không ai bị xử tử.");
        }

        game.votes.clear();
        game.voteCounts = new Map();

        checkWinCondition(channelId, message);
        if (game.phase !== 'ended') startNightPhase(channelId, message);
    }
}

async function sendDayVoteDM(channelId) {
    const game = games.get(channelId);

    const emojis = [
        '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪',
        '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫'
    ];

    for (const voter of game.players) {
        const user = await client.users.fetch(voter.id);
        const emojiMap = new Map();
        const descLines = [];

        game.players.filter(p => p.id !== voter.id).forEach((target, index) => {
            const emoji = emojis[index];
            emojiMap.set(emoji, target);
            descLines.push(`${emoji} - ${target.username}`);
        });
        const skipEmoji = '❌';
        descLines.push(`${skipEmoji} - Không thực hiện hành động`);
        emojiMap.set(skipEmoji, null);

        const embed = new EmbedBuilder()
            .setTitle(`☀️ Bỏ phiếu xử tử`)
            .setDescription(`Hãy chọn 1 người bạn nghi là Sói:\n\n${descLines.join("\n")}`)
            .setColor(0xf1c40f);

        const msg = await user.send({ embeds: [embed] });
        for (const emoji of emojiMap.keys()) {
            await msg.react(emoji);
        }

        const collector = msg.createReactionCollector({
            filter: (reaction, usr) =>
                usr.id === voter.id && emojiMap.has(reaction.emoji.name),
            max: 1,
            time: 2 * 60 * 1000
        });

        collector.on("collect", (reaction) => {
            const target = emojiMap.get(reaction.emoji.name);
            if (!game.voteCounts) game.voteCounts = new Map();
            const count = game.voteCounts.get(target.id) || 0;
            game.voteCounts.set(target.id, count + 1);
            game.votes.set(voter.id, true);
            checkDayPhaseProgress(channelId, { channel: { send: () => { } } });
        });

        collector.on("end", collected => {
            if (collected.size === 0) {
                user.send("⏰ Bạn đã bỏ lỡ vote ban ngày.");
                game.votes.set(voter.id, true);
                checkDayPhaseProgress(channelId, { channel: { send: () => { } } });
            }
        });
    }
}

async function sendRoleActions(channelId) {
    const game = games.get(channelId);
    const emojis = [
        '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪',
        '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫'
    ];

    for (const player of game.players) {
        const role = game.roleMap.get(player.id);
        if (!["Sói", "Tiên tri", "Bảo vệ"].includes(role.name)) continue;

        try {
            const user = await client.users.fetch(player.id);
            const targets = game.players.filter(p => p.id !== player.id);
            const emojiMap = new Map();

            const descLines = targets.map((target, index) => {
                const emoji = emojis[index];
                emojiMap.set(emoji, target);
                return `${emoji} - ${target.username}`;
            });

            const skipEmoji = '❌';
            descLines.push(`${skipEmoji} - Không thực hiện hành động`);
            emojiMap.set(skipEmoji, null);

            const embed = new EmbedBuilder()
                .setTitle(`🌙 ${role.name} hành động`)
                .setDescription(`Chọn 1 người bằng cách bấm emoji:\n\n${descLines.join("\n")}`)
                .setColor(role.name === "Sói" ? 0x990000 : 0x0066cc);

            const msg = await user.send({ embeds: [embed] });
            for (const emoji of emojiMap.keys()) {
                await msg.react(emoji);
            }

            const collector = msg.createReactionCollector({
                filter: (reaction, usr) =>
                    usr.id === player.id && emojiMap.has(reaction.emoji.name),
                max: 1,
                time: 2 * 60 * 1000
            });

            collector.on("collect", (reaction) => {
                const selectedTarget = emojiMap.get(reaction.emoji.name);
                if (selectedTarget === null) {
                    user.send(`⏭️ Bạn đã chọn **bỏ qua** hành động đêm nay.`);
                } else if (role.name === "Sói") {
                    game.killed = selectedTarget;
                    user.send(`🐺 Bạn đã chọn giết ${selectedTarget.username}`);
                } else if (role.name === "Tiên tri") {
                    const seenRole = game.roleMap.get(selectedTarget.id);
                    user.send(`🔮 ${selectedTarget.username} là ${seenRole.name === "Sói" ? "**Sói**" : "người tốt!"}`);
                }

                game.actions.add(player.id);
                checkNightPhaseProgress(channelId, null);
            });

            collector.on("end", collected => {
                if (collected.size === 0) {
                    user.send("⏰ Hết thời gian, bạn đã bỏ lỡ lượt hành động đêm nay.");
                    game.actions.add(player.id);
                    checkNightPhaseProgress(channelId, null);
                }
            });
        } catch (err) {
            console.error(`❌ Không thể gửi hành động đến ${player.username}:`, err);
        }
    }
}
client.login(process.env.DISCORD_TOKEN);
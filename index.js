require("dotenv").config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
const roles = require("./roles");

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

// Constants
const PHASES = {
    WAITING: 'waiting',
    NIGHT: 'night',
    DAY: 'day',
    ENDED: 'ended'
};

const TEAMS = {
    WOLVES: 1,
    VILLAGERS: 2,
    LONERS: 3
};

const EMOJIS = [
    '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪',
    '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫'
];

const games = new Map();

client.once("ready", () => {
    console.log(`✅ Bot đã đăng nhập với tên: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    try{
    if (message.author.bot) return;
    const content = message.content.toLowerCase();
    const channelId = message.channel.id;

    // Initialize game if not exists
    if (!games.has(channelId)) {
        initNewGame(channelId);
    }

    const game = games.get(channelId);

    // Handle commands
    if (content === "cj") {
        handleJoinCommand(game, message);
    } else if (content === "cstart") {
        handleStartCommand(game, message);
    } else if (content === "creset") {
        handleResetCommand(channelId, message);
    }
    // Change night phase commands
    else if (content === "cnextnight") {
        if (game.phase !== PHASES.NIGHT) {
            return message.reply("⛔ Hiện tại không phải là ban đêm.");
        }
        startDayPhase(game, message);
    }
    else if (content === "chelp") {
        message.reply("📜 **Hướng dẫn sử dụng bot Werewolf:**\n" +
            "1. **cj** - Tham gia trò chơi.\n" +
            "2. **cstart** - Bắt đầu trò chơi khi đủ người.\n" +
            "3. **creset** - Reset trò chơi trong phòng.\n" +
            "4. **cnextnight** - Chuyển sang ban ngày nếu đang trong ban đêm.\n" +
            "5. **chelp** - Hiển thị hướng dẫn này.");
    } else if (content === "cstatus") {
        // if (!game.gameStarted) {
        //     return message.reply("⚠️ Trò chơi chưa bắt đầu.");
        // }
        // if (game.phase === PHASES.ENDED) {
        //     return message.reply("🎮 Trò chơi đã kết thúc. Hãy bắt đầu trò chơi mới.");
        // }
        const status = getGameStatus(game);
        
        message.reply(`🕹️ **Trạng thái trò chơi:**\n${status}`);
    }
    else if (content === "cplayers") {
        if (game.players.length === 0) {
            return message.reply("⚠️ Hiện tại không có người chơi nào trong trò chơi.");
        }
        const playerList = game.players.map(p => `<@${p.id}>`).join(", ");
        message.reply(`👥 **Người chơi hiện tại:**\n${playerList}`)
    }
    else if (content === "ccontact") {
        message.reply("📧 **Liên hệ:**\nNếu bạn cần hỗ trợ, hãy liên hệ với **Kiên Học Code** (email: trungkienhuynh.contact).");
    }
} catch (error) {
        console.error("❌ Lỗi khi xử lý lệnh:", error);
        message.reply("⚠️ Đã xảy ra lỗi khi xử lý lệnh. Vui lòng liên hệ với **Kiên Học Code** (email: trungkienhuynh.contact) để được hỗ trợ.");
        // mention the developer
        const developer = await client.users.fetch(process.env.DEVELOPER_ID);
        if (developer) {
            developer.send(`❗ Ngày ${new Date().toLocaleString()}\n Lỗi trong trò chơi Werewolf:\n${error.message}\nTrong phòng: ${message.channel.name} (${message.channel.id}) \n ---- Log \n${error.stack} \n ---- `);
        }

    }
});

// Helper Functions

function initNewGame(channelId) {
    games.set(channelId, {
        players: [],
        gameStarted: false,
        roleMap: new Map(),
        phase: PHASES.WAITING,
        votes: new Map(),
        actions: new Set(),
        killed: [],
        timeout: null,
        lovers: [], // For Cupid's lovers
        protected: null, // For Guardian's protection
        witch: {
            healPotion: true,
            killPotion: true
        }
    });
}

async function handleJoinCommand(game, message) {
    if (game.gameStarted) {
        return message.reply("⛔ Trò chơi đã bắt đầu!");
    }

    if (!game.players.find(p => p.id === message.author.id)) {
        game.players.push(message.author);
        message.reply(`✅ Bạn đã tham gia trò chơi. Tổng số người chơi hiện tại là ${game.players.length} người.`);
    } else {
        message.reply("⚠️ Bạn đã tham gia rồi.");
    }
}

async function handleStartCommand(game, message) {
    if (game.gameStarted) return message.reply("⛔ Trò chơi đang chạy.");
    if (game.players.length < 0) return message.reply("⚠️ Cần ít nhất 4 người để bắt đầu.");

    game.gameStarted = true;
    game.phase = PHASES.NIGHT;
    message.channel.send("🎲 Trò chơi bắt đầu!");

    // Assign roles
    const assigned = roles.assignRoles(game.players);
    for (const [player, role] of assigned.entries()) {
        game.roleMap.set(player.id, role);
        try {
            await sendRoleDM(player, role);
        } catch (err) {
            console.error(`Failed to send DM to ${player.username}:`, err);
            message.channel.send(`⚠️ Không thể gửi DM cho <@${player.id}>. Vui lòng bật tin nhắn riêng từ thành viên server.`);
        }
    }

    // Special role: Cupid (select lovers on first night)
    const cupid = game.players.find(p => game.roleMap.get(p.id)?.name === "Cupid");
    if (cupid) {
        await selectLovers(cupid, game, message);
    } else {
        announcePlayers(game, message);
        startNightPhase(game, message);
    }
}

async function sendRoleDM(player, role) {
    const user = await client.users.fetch(player.id);
    const embed = new EmbedBuilder()
        .setTitle(`🔐 Vai trò: ${role.name}`)
        .setDescription(role.description)
        .setColor(0xFFAA00);
    if (role.image) embed.setImage(role.image);
    await user.send({ embeds: [embed] });
}

async function selectLovers(cupid, game, message) {
    try {
        const user = await client.users.fetch(cupid.id);
        const emojiMap = new Map();
        const descLines = [];

        game.players.filter(p => p.id !== cupid.id).forEach((target, index) => {
            const emoji = EMOJIS[index];
            emojiMap.set(emoji, target);
            descLines.push(`${emoji} - ${target.username}`);
        });

        const embed = new EmbedBuilder()
            .setTitle("💘 Cupid - Chọn đôi tình nhân")
            .setDescription(`Chọn 2 người sẽ yêu nhau:\n\n${descLines.join("\n")}`)
            .setColor(0xFF69B4);

        const msg = await user.send({ embeds: [embed] });
        for (const emoji of emojiMap.keys()) {
            await msg.react(emoji);
        }

        const selected = [];
        const collector = msg.createReactionCollector({
            filter: (reaction, usr) => usr.id === cupid.id && emojiMap.has(reaction.emoji.name),
            max: 2,
            time: 2 * 60 * 1000
        });

        collector.on("collect", (reaction) => {
            const target = emojiMap.get(reaction.emoji.name);
            selected.push(target);
            if (selected.length === 2) {
                game.lovers = selected;
                user.send(`💝 Bạn đã kết đôi ${selected[0].username} và ${selected[1].username}!`);
                announcePlayers(game, message);
                startNightPhase(game, message);
            }
        });

        collector.on("end", collected => {
            if (collected.size < 2) {
                user.send("⏰ Hết thời gian chọn đôi tình nhân. Chọn ngẫu nhiên...");
                // Randomly select 2 lovers if Cupid didn't choose
                const shuffled = [...game.players].filter(p => p.id !== cupid.id).sort(() => 0.5 - Math.random());
                game.lovers = shuffled.slice(0, 2);
                user.send(`💝 Đôi tình nhân được chọn ngẫu nhiên: ${game.lovers[0].username} và ${game.lovers[1].username}`);
                announcePlayers(game, message);
                startNightPhase(game, message);
            }
        });
    } catch (err) {
        console.error("Cupid error:", err);
        // Fallback if Cupid fails
        announcePlayers(game, message);
        startNightPhase(game, message);
    }
}

function announcePlayers(game, message) {
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

function startNightPhase(game, message) {
    game.phase = PHASES.NIGHT;
    game.actions.clear();
    game.killed = [];
    game.protected = null;
    message.channel.send("🌙 Đêm đã đến. Hành động sẽ được gửi qua tin nhắn riêng.");

    sendRoleActions(game, message);

    if (game.timeout) clearTimeout(game.timeout);
    game.timeout = setTimeout(() => {
        message.channel.send("⏰ Hết thời gian ban đêm! Những ai chưa hành động sẽ bị bỏ qua.");
        startDayPhase(game, message);
    }, 5 * 60 * 1000);
}

async function sendRoleActions(game, message) {
    for (const player of game.players) {
        const role = game.roleMap.get(player.id);
        if (!role?.isAction) continue;

        try {
            const user = await client.users.fetch(player.id);
            const targets = game.players.filter(p => p.id !== player.id);
            const emojiMap = new Map();

            const descLines = targets.map((target, index) => {
                const emoji = EMOJIS[index];
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
                filter: (reaction, usr) => usr.id === player.id && emojiMap.has(reaction.emoji.name),
                max: 1,
                time: 2 * 60 * 1000
            });

            collector.on("collect", async (reaction) => {
                const selectedTarget = emojiMap.get(reaction.emoji.name);

                if (selectedTarget === null) {
                    await user.send(`⏭️ Bạn đã chọn bỏ qua hành động đêm nay.`);
                } else {
                    await handleNightAction(player, role, selectedTarget, game, user);
                }

                game.actions.add(player.id);
                checkNightPhaseProgress(game, message);
            });

            collector.on("end", collected => {
                if (collected.size === 0) {
                    user.send("⏰ Hết thời gian, bạn đã bỏ lỡ lượt hành động đêm nay.");
                    game.actions.add(player.id);
                    checkNightPhaseProgress(game, message);
                }
            });
        } catch (err) {
            console.error(`❌ Không thể gửi hành động đến ${player.username}:`, err);
            game.actions.add(player.id);
            checkNightPhaseProgress(game, message);
        }
    }
}

async function handleNightAction(player, role, target, game, user) {
    switch (role.name) {
        case "Sói":
            game.killed.push(target);
            await user.send(`🐺 Bạn đã chọn giết ${target.username}`);
            break;

        case "Tiên tri":
            const seenRole = game.roleMap.get(target.id);
            await user.send(`🔮 ${target.username} là ${seenRole.name === "Sói" ? "**Sói**" : "người tốt!"}`);
            break;

        case "Bảo vệ":
            game.protected = target;
            await user.send(`🛡️ Bạn đã bảo vệ ${target.username} đêm nay.`);
            break;

        case "Phù thủy":
            await handleWitchAction(player, target, game, user);
            break;

        case "Thợ săn":
            await user.send(`🏹 Bạn đã chọn bắn ${target.username}. Nếu bạn chết, họ sẽ chết theo.`);
            game.hunterTarget = target;
            break;

        default:
            await user.send(`✅ Hành động của bạn đã được ghi nhận.`);
    }
}

async function handleWitchAction(player, target, game, user) {
    const embed = new EmbedBuilder()
        .setTitle("🧪 Phù thủy - Chọn thuốc")
        .setDescription(`Bạn muốn dùng loại thuốc nào?\n\n🟢 - Thuốc cứu (${game.witch.healPotion ? "Còn" : "Hết"})\n🔴 - Thuốc độc (${game.witch.killPotion ? "Còn" : "Hết"})`)
        .setColor(0x800080);

    const msg = await user.send({ embeds: [embed] });
    await msg.react('🟢');
    await msg.react('🔴');
    await msg.react('❌');

    const collector = msg.createReactionCollector({
        filter: (reaction, usr) => usr.id === player.id && ['🟢', '🔴', '❌'].includes(reaction.emoji.name),
        max: 1,
        time: 2 * 60 * 1000
    });

    collector.on("collect", async (reaction) => {
        if (reaction.emoji.name === '🟢' && game.witch.healPotion) {
            game.witch.healPotion = false;
            game.witchHealTarget = target;
            await user.send(`💚 Bạn đã dùng thuốc cứu cho ${target.username}`);
        } else if (reaction.emoji.name === '🔴' && game.witch.killPotion) {
            game.witch.killPotion = false;
            game.killed.push(target);
            await user.send(`💀 Bạn đã dùng thuốc độc giết ${target.username}`);
        } else if (reaction.emoji.name === '❌') {
            await user.send(`⏭️ Bạn đã chọn không dùng thuốc.`);
        } else {
            await user.send(`⚠️ Loại thuốc đó không còn hoặc không hợp lệ.`);
        }
    });
}

function checkNightPhaseProgress(game, message) {
    const required = game.players.filter(p => {
        const role = game.roleMap.get(p.id);
        return role?.isAction;
    });

    if (game.actions.size >= required.length) {
        if (game.timeout) clearTimeout(game.timeout);
        startDayPhase(game, message);
    }
}

function startDayPhase(game, message) {
    game.phase = PHASES.DAY;
    game.votes.clear();
    game.voteCounts = new Map();

    // Process night kills
    processNightKills(game, message);

    // Check win condition before starting voting
    if (checkWinCondition(game, message)) {
        return;
    }

    // Start voting if game continues
    message.channel.send("☀️ Ban ngày bắt đầu! Hãy thảo luận và bỏ phiếu.");
    sendDayVoteDM(game, message);

    if (game.timeout) clearTimeout(game.timeout);
    game.timeout = setTimeout(() => {
        message.channel.send("⏰ Hết thời gian ban ngày! Những ai không vote sẽ bị bỏ qua.");
        processDayVotes(game, message);
    }, 5 * 60 * 1000);
}

function processNightKills(game, message) {
    // Apply protection first
    if (game.protected) {
        game.killed = game.killed.filter(victim => victim.id !== game.protected.id);
        message.channel.send(`🛡️ ${game.protected.username} đã được bảo vệ đêm qua!`);
    }

    // Apply witch heal
    if (game.witchHealTarget) {
        game.killed = game.killed.filter(victim => victim.id !== game.witchHealTarget.id);
        message.channel.send(`💚 ${game.witchHealTarget.username} đã được phù thủy cứu!`);
        game.witchHealTarget = null;
    }

    // Process actual kills
    if (game.killed.length > 0) {
        const voteCount = {};
        game.killed.forEach(victim => {
            voteCount[victim.id] = (voteCount[victim.id] || 0) + 1;
        });

        let mostVotedId = null;
        let maxVotes = 0;
        for (const [id, count] of Object.entries(voteCount)) {
            if (count > maxVotes) {
                mostVotedId = id;
                maxVotes = count;
            }
        }

        const victim = game.killed.find(p => p.id === mostVotedId);
        if (victim) {
            message.channel.send(`☠️ Đêm qua ${victim.username} đã bị giết!`);
            handlePlayerDeath(victim, game, message);
        }
    } else {
        message.channel.send("✅ Không ai bị giết đêm qua.");
    }
}

function handlePlayerDeath(player, game, message) {
    // Remove player
    game.players = game.players.filter(p => p.id !== player.id);

    // Check for lovers
    if (game.lovers.some(l => l.id === player.id)) {
        const otherLover = game.lovers.find(l => l.id !== player.id);
        if (otherLover && game.players.some(p => p.id === otherLover.id)) {
            message.channel.send(`💔 ${otherLover.username} đã chết vì đau khổ sau cái chết của người yêu!`);
            handlePlayerDeath(otherLover, game, message);
        }
    }

    // Check for hunter
    const role = game.roleMap.get(player.id);
    if (role?.name === "Thợ săn" && game.hunterTarget) {
        const target = game.hunterTarget;
        if (game.players.some(p => p.id === target.id)) {
            message.channel.send(`🏹 ${target.username} đã bị bắn bởi thợ săn trước khi chết!`);
            handlePlayerDeath(target, game, message);
        }
    }

    // Check for village elder
    if (role?.name === "Già làng") {
        message.channel.send(`⚰️ Già làng đã chết! Dân làng mất toàn bộ chức năng đặc biệt!`);
        // Disable all special villager roles except Hunter
        game.players.forEach(p => {
            const pRole = game.roleMap.get(p.id);
            if (pRole.team === TEAMS.VILLAGERS && pRole.name !== "Thợ săn") {
                pRole.isAction = false;
            }
        });
    }
}

async function sendDayVoteDM(game, message) {
    for (const voter of game.players) {
        try {
            const user = await client.users.fetch(voter.id);
            const emojiMap = new Map();
            const descLines = [];

            game.players.filter(p => p.id !== voter.id).forEach((target, index) => {
                const emoji = EMOJIS[index];
                emojiMap.set(emoji, target);
                descLines.push(`${emoji} - ${target.username}`);
            });

            const skipEmoji = '❌';
            descLines.push(`${skipEmoji} - Không bỏ phiếu`);
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
                filter: (reaction, usr) => usr.id === voter.id && emojiMap.has(reaction.emoji.name),
                max: 1,
                time: 2 * 60 * 1000
            });

            collector.on("collect", (reaction) => {
                const target = emojiMap.get(reaction.emoji.name);
                if (target) {
                    const count = game.voteCounts.get(target.id) || 0;
                    game.voteCounts.set(target.id, count + 1);
                    user.send(`✅ Bạn đã bỏ phiếu treo cổ ${target.username}`);
                } else {
                    user.send(`⏭️ Bạn đã chọn không bỏ phiếu.`);
                }
                game.votes.set(voter.id, true);
                checkDayPhaseProgress(game, message);
            });

            collector.on("end", collected => {
                if (collected.size === 0) {
                    user.send("⏰ Bạn đã bỏ lỡ vote ban ngày.");
                    game.votes.set(voter.id, true);
                    checkDayPhaseProgress(game, message);
                }
            });
        } catch (err) {
            console.error(`Failed to send vote DM to ${voter.username}:`, err);
            game.votes.set(voter.id, true);
            checkDayPhaseProgress(game, message);
        }
    }
}

function checkDayPhaseProgress(game, message) {
    if (game.votes.size >= game.players.length) {
        if (game.timeout) clearTimeout(game.timeout);
        processDayVotes(game, message);
    }
}

function processDayVotes(game, message) {
    if (!game.voteCounts || game.voteCounts.size === 0) {
        message.channel.send("⚖️ Không có ai bị bỏ phiếu hôm nay.");
        startNightPhase(game, message);
        return;
    }

    let maxVotes = 0;
    let killedPlayer = null;

    // Convert Map to array for easier processing
    const voteArray = Array.from(game.voteCounts.entries());

    // Find player with most votes
    for (const [targetId, count] of voteArray) {
        if (count > maxVotes) {
            maxVotes = count;
            killedPlayer = game.players.find(p => p.id === targetId);
        } else if (count === maxVotes) {
            killedPlayer = null; // Tie
        }
    }

    if (killedPlayer) {
        message.channel.send(`⚖️ ${killedPlayer.username} đã bị treo cổ với ${maxVotes} phiếu!`);
        handlePlayerDeath(killedPlayer, game, message);
    } else {
        message.channel.send("⚖️ Hòa phiếu! Không ai bị xử tử.");
    }

    // Check win condition
    if (!checkWinCondition(game, message)) {
        startNightPhase(game, message);
    }
}

function checkWinCondition(game, message) {
    if (!game.players || !game.roleMap) return false;

    const alive = game.players;
    const wolves = alive.filter(p => game.roleMap.get(p.id)?.team === TEAMS.WOLVES);
    const villagers = alive.filter(p => game.roleMap.get(p.id)?.team === TEAMS.VILLAGERS);
    const loners = alive.filter(p => game.roleMap.get(p.id)?.team === TEAMS.LONERS);

    // Loner win condition
    if (loners.length === 1 && villagers.length === 0 && wolves.length === 0) {
        const winner = loners[0];
        message.channel.send(`🎉 **${winner.username} (Kẻ điên) đã chiến thắng!** Chúc mừng!`);
        game.phase = PHASES.ENDED;
        return true;
    }

    // Werewolves win condition
    if (wolves.length >= villagers.length + loners.length) {
        const wolfNames = wolves.map(w => w.username).join(", ");
        message.channel.send(`🐺 **Sói đã chiến thắng! Chúc mừng: ${wolfNames}**`);
        game.phase = PHASES.ENDED;
        return true;
    }

    // Villagers win condition
    if (wolves.length === 0) {
        message.channel.send("🎉 **Dân làng đã chiến thắng! Sói đã bị tiêu diệt.**");
        game.phase = PHASES.ENDED;
        return true;
    }

    return false;
}

function handleResetCommand(channelId, message) {
    games.delete(channelId);
    message.channel.send("🔁 Đã reset trò chơi trong phòng.");
}

client.login(process.env.DISCORD_TOKEN);
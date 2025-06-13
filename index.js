// werewolf-discord-bot.js
require("dotenv").config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
const roles = require("./roles");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

const games = new Map(); // channelId -> gameState

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

    if (content === "!join") {
        if (game.gameStarted) return message.reply("⛔ Trò chơi đã bắt đầu!");
        if (!game.players.find(p => p.id === message.author.id)) {
            game.players.push(message.author);
            message.reply("✅ Bạn đã tham gia trò chơi.");
        } else {
            message.reply("⚠️ Bạn đã tham gia rồi.");
        }
    }

    if (content === "!start") {
        if (game.gameStarted) return message.reply("⛔ Trò chơi đang chạy.");
        if (game.players.length < 2) return message.reply("⚠️ Cần ít nhất 4 người để bắt đầu.");

        game.gameStarted = true;
        game.phase = 'night';
        message.channel.send("🎲 Trò chơi bắt đầu!");

        const assigned = roles.assignRoles(game.players);
        for (const [player, role] of assigned.entries()) {
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

        announcePlayers(message, game);
        startNightPhase(channelId, message);
    }

    if (content.startsWith("!kill ")) {
        if (game.phase !== 'night') return;
        const killer = message.author;
        const role = game.roleMap.get(killer.id);
        if (role?.name !== "Sói") return;
        const targetName = content.slice(6).trim().toLowerCase();
        const target = game.players.find(p => p.username.toLowerCase() === targetName);
        if (!target) return message.reply("❌ Không tìm thấy người chơi đó.");
        game.killed = target;
        message.reply(`🐺 Bạn đã chọn giết ${target.username}`);
        game.actions.add(killer.id);
        checkNightPhaseProgress(channelId, message);
    }

    if (content.startsWith("!see ")) {
        if (game.phase !== 'night') return;
        const seer = message.author;
        const role = game.roleMap.get(seer.id);
        if (role?.name !== "Tiên tri") return;
        const targetName = content.slice(5).trim().toLowerCase();
        const target = game.players.find(p => p.username.toLowerCase() === targetName);
        if (!target) return message.reply("❌ Không tìm thấy người chơi đó.");
        const targetRole = game.roleMap.get(target.id);
        message.reply(`🔮 Vai trò của ${target.username} là **${targetRole.name}**`);
        game.actions.add(seer.id);
        checkNightPhaseProgress(channelId, message);
    }

    if (content === "!vote") {
        if (game.phase !== 'day') return message.reply("🌙 Hiện tại đang là ban đêm.");
        game.votes.set(message.author.id, true);
        checkDayPhaseProgress(channelId, message);
    }

    if (content === "!done") {
        if (game.phase !== 'night') return message.reply("☀️ Hiện tại đang là ban ngày.");
        game.actions.add(message.author.id);
        checkNightPhaseProgress(channelId, message);
    }

    if (content === "!reset") {
        games.delete(channelId);
        message.channel.send("🔁 Đã reset trò chơi trong phòng.");
    }
});

function announcePlayers(message, game) {
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
    message.channel.send("🌙 Đêm đã đến. Sói hãy `!kill <username>`. Tiên tri hãy `!see <username>`.");
    sendRoleActions(channelId);

    if (game.timeout) clearTimeout(game.timeout);
    game.timeout = setTimeout(() => {
        message.channel.send("⏰ Hết thời gian ban đêm! Những ai chưa hành động sẽ bị bỏ qua.");
        startDayPhase(channelId, message);
    }, 5 * 60 * 1000);
}

function checkNightPhaseProgress(channelId, message) {
    const game = games.get(channelId);
    const required = game.players.filter(p => {
        const role = game.roleMap.get(p.id);
        return role.name === 'Sói' || role.name === 'Tiên tri';
    });
    if (game.actions.size >= required.length) {
        if (game.timeout) clearTimeout(game.timeout);
        startDayPhase(channelId, message);
    }
}

function startDayPhase(channelId, message) {
    const game = games.get(channelId);
    game.phase = 'day';
    game.votes.clear();

    if (game.killed) {
        message.channel.send(`☠️ ${game.killed.username} đã bị giết trong đêm!`);
        game.players = game.players.filter(p => p.id !== game.killed.id);
    } else {
        message.channel.send("✅ Không ai bị giết đêm qua.");
    }

    message.channel.send("☀️ Ban ngày bắt đầu! Hãy thảo luận và sử dụng `!vote` để bỏ phiếu.");

    if (game.timeout) clearTimeout(game.timeout);
    game.timeout = setTimeout(() => {
        message.channel.send("⏰ Hết thời gian ban ngày! Những ai không vote sẽ bị bỏ qua.");
        startNightPhase(channelId, message);
    }, 5 * 60 * 1000);
}

function checkDayPhaseProgress(channelId, message) {
    const game = games.get(channelId);
    const alive = game.players;
    if (game.votes.size >= alive.length) {
        if (game.timeout) clearTimeout(game.timeout);
        message.channel.send("📊 Tất cả đã vote. Chuyển sang ban đêm!");
        startNightPhase(channelId, message);
    }
}
async function sendRoleActions(channelId) {
    const game = games.get(channelId);
    const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

    for (const player of game.players) {
        const role = game.roleMap.get(player.id);
        if (!["Sói", "Tiên tri"].includes(role.name)) continue;

        try {
            const user = await client.users.fetch(player.id);
            const others = game.players.filter(p => p.id !== player.id);
            const desc = others.map((p, i) => `${emojiNumbers[i]} - ${p.username}`).join("\n");

            const embed = new EmbedBuilder()
                .setTitle(`🌙 ${role.name} hành động`)
                .setDescription(`Hãy chọn 1 người:\n\n${desc}`)
                .setColor(role.name === "Sói" ? 0x990000 : 0x0066cc);

            const msg = await user.send({ embeds: [embed] });

            for (let i = 0; i < others.length; i++) {
                await msg.react(emojiNumbers[i]);
            }

            const collector = msg.createReactionCollector({
                filter: (reaction, usr) => emojiNumbers.includes(reaction.emoji.name) && usr.id === player.id,
                max: 1,
                time: 2 * 60 * 1000
            });

            collector.on('collect', (reaction) => {
                const index = emojiNumbers.indexOf(reaction.emoji.name);
                const target = others[index];
                if (!target) return;

                if (role.name === "Sói") {
                    game.killed = target;
                    user.send(`🐺 Bạn đã chọn giết ${target.username}`);
                } else if (role.name === "Tiên tri") {
                    const seenRole = game.roleMap.get(target.id);
                    user.send(`🔮 Vai trò của ${target.username} là **${seenRole.name}**`);
                }

                game.actions.add(player.id);
                checkNightPhaseProgress(channelId, { channel: { send: () => { } } }); // dummy message
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    user.send("⏰ Hết thời gian, bạn đã bỏ lỡ lượt hành động đêm nay.");
                    game.actions.add(player.id);
                    checkNightPhaseProgress(channelId, { channel: { send: () => { } } }); // dummy message
                }
            });
        } catch (err) {
            console.error(`❌ Lỗi gửi hành động ban đêm cho ${player.username}:`, err);
        }
    }
}

client.login(process.env.DISCORD_TOKEN);

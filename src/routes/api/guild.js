const { default: axios } = require('axios');
const express = require('express');
const Token = require('../../models/Token');
const router = express.Router();


router.get("", async (req, res) => {
    try {
        console.log("guilds");
        const authHeader = req.headers["authorization"];
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "No token provided" });
        }
        const token = authHeader.split(" ")[1];

        // tìm token trong DB
        const tokenRow = await Token.findOne({ token });
        if (!tokenRow) {
            return res.status(400).json({ error: "Token not found" });
        }
        if (tokenRow.isExpired) {
            return res.status(400).json({ error: "Token is expired" });
        }

        const access_token = tokenRow.discordToken;

        // 1. Guilds của user
        const userGuildsResponse = await axios.get("https://discord.com/api/users/@me/guilds", {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        const userGuilds = userGuildsResponse.data;

        // 2. Guilds của bot
        const botGuildsResponse = await axios.get("https://discord.com/api/users/@me/guilds", {
            headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
        });
        const botGuilds = botGuildsResponse.data;

        const botGuildIds = new Set(botGuilds.map(g => g.id));

        // 3. Lọc và thêm field
        const result = userGuilds
            .map(guild => {
                const permissions = BigInt(guild.permissions); // permissions là string, convert sang BigInt
                const isAdmin = (permissions & 0x8n) === 0x8n; // ADMINISTRATOR
                const isManager = (permissions & 0x20n) === 0x20n; // MANAGE_GUILD

                return {
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon,
                    banner: guild.banner,
                    owner: guild.owner,
                    hasBot: botGuildIds.has(guild.id),
                    admin: guild.owner || isAdmin,
                    manager: isManager,
                };
            })
            .filter(g => g.hasBot || (!g.hasBot && (g.owner || g.manager || g.admin)))
            .sort((a, b) => {
                // Sắp xếp theo owner -> admin -> manager -> hasBot
                if (a.owner !== b.owner) return b.owner - a.owner;
                if (a.admin !== b.admin) return b.admin - a.admin;
                if (a.manager !== b.manager) return b.manager - a.manager;
                if (a.hasBot !== b.hasBot) return b.hasBot - a.hasBot;
                return 0;
            });
        res.json(result);
    } catch (err) {
        console.error(err?.response?.data || err.message || err);
        res.status(500).json({ error: "Failed to fetch user guilds" });
    }
});




module.exports = router;
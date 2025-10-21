// src/routes/api/health.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    // Lấy client từ app locals
    const client = req.app.get('discordClient');
    
    // Kiểm tra nếu client chưa được khởi tạo
    if (!client) {
        return res.json({
            status: 'ERROR',
            bot: 'Client not initialized',
            timestamp: new Date().toISOString()
        });
    }
    const topGuilds = client.guilds.cache
        .sort((a, b) => b.memberCount - a.memberCount)
        .first(6);
    res.json({
        status: 'OK',
        bot: client.isReady() ? 'Connected' : 'Disconnected',
        botUser: client.user?.tag || 'Not logged in',
        usersCount: client.users.cache.size,
        guildsCount: client.guilds.cache.size,
        topGuilds: topGuilds.map(g => ({
            id: g.id,
            name: g.name,
            memberCount: g.memberCount,
            guildIcon: g.iconURL({ dynamic: true, size: 64 })
        })),
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

router.get('/detailed', (req, res) => {
    const client = req.app.get('discordClient');
    const memoryUsage = process.memoryUsage();
    
    const botInfo = client ? {
        status: client.isReady() ? 'Connected' : 'Disconnected',
        user: client.user?.tag || 'Not logged in',
        guilds: client.guilds.cache.size,
        readyAt: client.readyAt || 'Not ready'
    } : {
        status: 'Client not initialized'
    };
    
    res.json({
        status: 'OK',
        bot: botInfo,
        system: {
            uptime: process.uptime(),
            memory: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB'
            },
            nodeVersion: process.version
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
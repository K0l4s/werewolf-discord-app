// src/routes/api/bot.js
const express = require('express');
const router = express.Router();

router.post('/send-message', async (req, res) => {
    try {
        const client = req.app.get('discordClient');
        const { channelId, message } = req.body;
        
        if (!client) {
            return res.status(503).json({
                success: false,
                error: 'Discord client chưa sẵn sàng'
            });
        }
        
        if (!channelId || !message) {
            return res.status(400).json({
                success: false,
                error: 'Thiếu channelId hoặc message'
            });
        }
        
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            return res.status(404).json({
                success: false,
                error: 'Channel không tồn tại'
            });
        }
        
        const sentMessage = await channel.send(message);
        
        res.json({
            success: true,
            message: 'Message sent successfully',
            data: {
                messageId: sentMessage.id,
                channelId: channelId,
                content: message,
                timestamp: sentMessage.createdTimestamp
            }
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/guilds', async (req, res) => {
    try {
        const client = req.app.get('discordClient');
        
        if (!client) {
            return res.status(503).json({
                success: false,
                error: 'Discord client chưa sẵn sàng'
            });
        }
        
        const guilds = client.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            memberCount: guild.memberCount,
            icon: guild.iconURL(),
            owner: guild.ownerId
        }));
        
        res.json({
            success: true,
            data: guilds,
            count: guilds.length
        });
    } catch (error) {
        console.error('Error fetching guilds:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/guilds/:guildId/channels', async (req, res) => {
    try {
        const client = req.app.get('discordClient');
        const { guildId } = req.params;
        
        if (!client) {
            return res.status(503).json({
                success: false,
                error: 'Discord client chưa sẵn sàng'
            });
        }
        
        const guild = await client.guilds.fetch(guildId);
        
        if (!guild) {
            return res.status(404).json({
                success: false,
                error: 'Guild không tồn tại'
            });
        }
        
        const channels = guild.channels.cache.map(channel => ({
            id: channel.id,
            name: channel.name,
            type: channel.type,
            position: channel.position
        }));
        
        res.json({
            success: true,
            data: channels
        });
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
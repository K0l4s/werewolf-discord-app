// src/middleware/discordClient.js
function getDiscordClient(req, res, next) {
    const client = req.app.get('discordClient');
    
    if (!client) {
        return res.status(503).json({
            success: false,
            error: 'Discord client không khả dụng'
        });
    }
    
    req.discordClient = client;
    next();
}

module.exports = getDiscordClient;
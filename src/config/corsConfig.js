const developmentOrigins = [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:5173',
    'https://wwolf.vercel.app',
    'https://keldo.vercel.app/',
    'http://127.0.0.1:3000',
    'http://192.168.1.*', // Local network
    'https://localhost:3000'
];

const productionOrigins = [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
    'https://api.yourdomain.com',
    'https://discord.com',
    'https://*.discord.com'
];

const getCorsConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
        origin: isProduction ? productionOrigins : developmentOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin',
            'X-API-Key',
            'X-Discord-Token'
        ],
        exposedHeaders: [
            'X-Total-Count',
            'X-API-Version',
            'X-RateLimit-Limit',
            'X-RateLimit-Remaining'
        ],
        maxAge: isProduction ? 86400 : 0, // Cache 24h in production
        preflightContinue: false,
        optionsSuccessStatus: 204
    };
};

module.exports = { getCorsConfig };
export default () => ({
    port: parseInt(process.env.PORT || '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    app: {
        url: process.env.APP_URL || 'http://localhost:3000',
    },

    database: {
        uri:
            process.env.MONGODB_URI ||
            'mongodb://localhost:27017/whatsapp_multi_tenant',
        username: process.env.MONGODB_USERNAME || '',
        password: process.env.MONGODB_PASSWORD || '',
        authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
    },

    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || '',
        db: parseInt(process.env.REDIS_DB || '0', 10),
    },

    jwt: {
        secret:
            process.env.JWT_SECRET ||
            'your-super-secret-jwt-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    whatsapp: {
        apiUrl: process.env.WAHA_API_URL || 'http://localhost:3001',
        apiKey: process.env.WAHA_API_KEY || 'your-waha-api-key',
    },

    throttle: {
        ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
    },

    logging: {
        level: process.env.LOG_LEVEL || 'debug',
    },
});

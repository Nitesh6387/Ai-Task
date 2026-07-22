const IORedis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let connection = null;

const getRedisConnection = () => {
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    connection.on('connect', () => {
      console.log('Redis connected:', REDIS_URL);
    });

    connection.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });
  }

  return connection;
};

module.exports = { getRedisConnection };
// Redis is not used in this MERN-only version.
// Task processing is done synchronously within the backend.

const connectRedis = () => {
  console.log('Redis disabled - tasks processed synchronously');
};

const getRedis = () => {
  throw new Error('Redis not available in MERN-only mode');
};

module.exports = { connectRedis, getRedis };
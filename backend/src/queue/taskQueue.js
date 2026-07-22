const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis');

const QUEUE_NAME = 'task-processing';

const taskQueue = new Queue(QUEUE_NAME, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

const addTaskJob = async (taskId) => {
  return taskQueue.add('process-task', { taskId }, { jobId: taskId });
};

module.exports = { taskQueue, addTaskJob, QUEUE_NAME };
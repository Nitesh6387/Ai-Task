require('dotenv').config();
const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { getRedisConnection } = require('./config/redis');
const { QUEUE_NAME } = require('./queue/taskQueue');
const Task = require('./models/Task');

const processTask = (task) => {
  let result;
  switch (task.operationType) {
    case 'uppercase':
      result = task.inputText.toUpperCase();
      break;
    case 'lowercase':
      result = task.inputText.toLowerCase();
      break;
    case 'reverse':
      result = task.inputText.split('').reverse().join('');
      break;
    case 'wordcount':
      result = task.inputText.trim().split(/\s+/).filter(Boolean).length;
      break;
    default:
      throw new Error(`Unknown operation: ${task.operationType}`);
  }
  return result;
};

const startWorker = async () => {
  await connectDB();

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { taskId } = job.data;
      const task = await Task.findById(taskId);

      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      task.status = 'running';
      task.startedAt = new Date();
      task.logs.push({ message: 'Task picked up by worker' });
      await task.save();

      try {
        const result = processTask(task);
        task.result = result;
        task.status = 'completed';
        task.completedAt = new Date();
        task.logs.push({ message: `Operation ${task.operationType} completed successfully` });
        await task.save();
      } catch (processError) {
        task.status = 'failed';
        task.errorMessage = processError.message;
        task.completedAt = new Date();
        task.logs.push({ message: `Failed: ${processError.message}` });
        await task.save();
        throw processError;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  console.log('Worker started, listening for jobs on queue:', QUEUE_NAME);

  const shutdown = async () => {
    console.log('Shutting down worker...');
    await worker.close();
    await mongoose.connection.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startWorker();
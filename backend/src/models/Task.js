const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    inputText: {
      type: String,
      required: [true, 'Input text is required'],
    },
    operationType: {
      type: String,
      required: true,
      enum: ['uppercase', 'lowercase', 'reverse', 'wordcount'],
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    logs: [
      {
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    errorMessage: {
      type: String,
      default: null,
    },
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

taskSchema.index({ status: 1, createdAt: -1 });
taskSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
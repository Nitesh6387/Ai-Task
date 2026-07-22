const Task = require('../models/Task');
const { addTaskJob } = require('../queue/taskQueue');

exports.createTask = async (req, res) => {
  try {
    const { title, inputText, operationType } = req.body;

    if (!['uppercase', 'lowercase', 'reverse', 'wordcount'].includes(operationType)) {
      return res.status(400).json({ message: 'Invalid operation type' });
    }

    const task = await Task.create({
      user: req.user._id,
      title,
      inputText,
      operationType,
      status: 'pending',
      logs: [{ message: 'Task created and queued for processing' }],
    });

    // Hand the job off to Redis/BullMQ. The worker process picks this up
    // and updates the task document when it's done.
    await addTaskJob(task._id.toString());

    res.status(201).json({ task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { user: req.user._id };

    if (status) {
      query.status = status;
    }

    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
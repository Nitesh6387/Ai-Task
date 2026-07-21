const express = require('express');
const router = express.Router();
const {
  createTask,
  getTasks,
  getTask,
  deleteTask,
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.use(protect);

router.route('/').post(asyncHandler(createTask)).get(asyncHandler(getTasks));
router.route('/:id').get(asyncHandler(getTask)).delete(asyncHandler(deleteTask));

module.exports = router;
const express = require('express');
const router = express.Router();
const {
  getStats,
  getAllUsers,
  toggleUserStatus,
  deleteUser,
  getAllCoursesAdmin,
  toggleCourseStatus
} = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.patch('/users/:uuid/toggle', toggleUserStatus);
router.delete('/users/:uuid', deleteUser);
router.get('/courses', getAllCoursesAdmin);
router.patch('/courses/:uuid/toggle', toggleCourseStatus);

module.exports = router;
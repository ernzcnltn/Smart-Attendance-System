const express = require('express');
const router = express.Router();
const {
  getAttendanceStats,
  sendLowAttendanceNotifications,
  getMyNotifications,
  markNotificationRead,
  deleteNotification,
  getMyAttendanceStats,
  getMySessionHistory
} = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/courses/:course_uuid/stats', authorize('instructor', 'admin'), getAttendanceStats);
router.post('/courses/:course_uuid/notify', authorize('instructor', 'admin'), sendLowAttendanceNotifications);
router.get('/notifications', getMyNotifications);
router.patch('/notifications/:id/read', markNotificationRead);
router.delete('/notifications/:id', deleteNotification);
router.get('/my-stats', getMyAttendanceStats);
router.get('/my-history/:course_uuid', authenticate, getMySessionHistory);

module.exports = router;
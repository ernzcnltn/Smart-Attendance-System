const express = require('express');
const router = express.Router();
const {
  createSession,
  generateQR,
  markAttendance,
  getSessionAttendance,
  getMyAttendance,
  deleteSession,
  getSessionsByCourse,
  getActiveSession,
  getActiveSessionForStudent,
  refreshQRToken
} = require('../controllers/sessionController');
const { authenticate, authorize } = require('../middleware/auth');
const { checkNetwork, checkLocation } = require('../middleware/networkCheck');

router.use(authenticate);

router.post('/', authorize('instructor', 'admin'), createSession);
router.post('/course/:course_uuid/qr', authorize('instructor', 'admin'), generateQR);
router.get('/course/:course_uuid', authorize('instructor', 'admin'), getSessionsByCourse);
router.post('/attend', markAttendance);
router.get('/my-attendance', getMyAttendance);
router.get('/:uuid/attendance', authorize('instructor', 'admin'), getSessionAttendance);
router.delete('/:uuid', authorize('instructor', 'admin'), deleteSession);
router.get('/course/:course_uuid/active', authorize('instructor', 'admin'), getActiveSession);
router.get('/course/:course_uuid/active-student', authorize('student'), getActiveSessionForStudent);
router.post('/refresh-qr/:session_uuid', authenticate, refreshQRToken);
module.exports = router;
const express = require('express');
const router = express.Router();
const {
  createSession,
  generateQR,
  markAttendance,
  getSessionAttendance,
  getMyAttendance,
  deleteSession,
  getSessionsByCourse
} = require('../controllers/sessionController');
const { authenticate, authorize } = require('../middleware/auth');
const { checkNetwork, checkLocation } = require('../middleware/networkCheck');

router.use(authenticate);

router.post('/', authorize('instructor', 'admin'), createSession);
router.post('/course/:course_uuid/qr', authorize('instructor', 'admin'), generateQR);
router.get('/course/:course_uuid', authorize('instructor', 'admin'), getSessionsByCourse);
router.post('/attend', checkNetwork, checkLocation, markAttendance);
router.get('/my-attendance', getMyAttendance);
router.get('/:uuid/attendance', authorize('instructor', 'admin'), getSessionAttendance);
router.delete('/:uuid', authorize('instructor', 'admin'), deleteSession);

module.exports = router;
const express = require('express');
const router = express.Router();
const {
  createSession,
  generateQR,
  markAttendance,
  getSessionAttendance,
  getMyAttendance
} = require('../controllers/sessionController');
const { authenticate, authorize } = require('../middleware/auth');
const { checkNetwork, checkLocation } = require('../middleware/networkCheck');

router.use(authenticate);

router.post('/', authorize('instructor', 'admin'), createSession);
router.post('/course/:course_uuid/qr', authorize('instructor', 'admin'), generateQR);
router.post('/attend', checkNetwork, checkLocation, markAttendance);
router.get('/:uuid/attendance', authorize('instructor', 'admin'), getSessionAttendance);
router.get('/my-attendance', getMyAttendance);

module.exports = router;
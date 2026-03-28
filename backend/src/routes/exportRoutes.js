const express = require('express');
const router = express.Router();
const {
  exportAttendanceExcel,
  exportAttendancePDF,
  exportSessionAttendanceExcel,
  exportSessionAttendancePDF
} = require('../controllers/exportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('instructor', 'admin'));

router.get('/courses/:course_uuid/excel', exportAttendanceExcel);
router.get('/courses/:course_uuid/pdf', exportAttendancePDF);
router.get('/sessions/:session_uuid/excel', exportSessionAttendanceExcel);
router.get('/sessions/:session_uuid/pdf', exportSessionAttendancePDF);

module.exports = router;
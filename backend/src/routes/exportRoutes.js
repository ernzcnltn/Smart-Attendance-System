const express = require('express');
const router = express.Router();
const { exportAttendanceExcel, exportAttendancePDF } = require('../controllers/exportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('instructor', 'admin'));

router.get('/courses/:course_uuid/excel', exportAttendanceExcel);
router.get('/courses/:course_uuid/pdf', exportAttendancePDF);

module.exports = router;
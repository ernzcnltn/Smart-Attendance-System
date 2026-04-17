const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { uploadTimetable, uploadStudentList, uploadCourseSchedule, getCourseSchedule } = require('../controllers/timetableController');
const { authenticate, authorize } = require('../middleware/auth');

const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `timetable_${Date.now()}${path.extname(file.originalname)}`)
});

const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `excel_${Date.now()}${path.extname(file.originalname)}`)
});

const csvUpload = multer({
  storage: csvStorage,
  fileFilter: (req, file, cb) => {
    if (
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls') ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed.'));
    }
  }
});

const excelUpload = multer({
  storage: excelStorage,
  fileFilter: (req, file, cb) => {
    if (
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls') ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed.'));
    }
  }
});

router.use(authenticate);

router.post('/upload', authorize('admin'), excelUpload.single('file'), uploadTimetable);
router.post('/students', authorize('instructor'), excelUpload.single('file'), uploadStudentList);
router.post('/schedule', authorize('instructor'), excelUpload.single('file'), uploadCourseSchedule);
router.get('/schedule/:course_uuid', getCourseSchedule);

module.exports = router;
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { uploadTimetable } = require('../controllers/timetableController');
const { authenticate, authorize } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `timetable_${Date.now()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed.'));
    }
  }
});

router.use(authenticate);
router.use(authorize('admin'));

router.post('/upload', upload.single('file'), uploadTimetable);

module.exports = router;
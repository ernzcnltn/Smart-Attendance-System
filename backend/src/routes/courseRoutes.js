const express = require('express');
const router = express.Router();
const {
  createCourse,
  getAllCourses,
  getMyCourses,
  getCourseByUUID,
  enrollStudent,
  getCourseStudents
} = require('../controllers/courseController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', getAllCourses);
router.get('/my', getMyCourses);
router.get('/:uuid', getCourseByUUID);
router.get('/:uuid/students', getCourseStudents);
router.post('/', authorize('instructor', 'admin'), createCourse);
router.post('/enroll', authorize('admin', 'instructor'), enrollStudent);

module.exports = router;
const pool = require('../config/db');
const { generateUUID, successResponse, errorResponse } = require('../utils/helpers');
const { getSettingByKey } = require('./settingsController');

const createCourse = async (req, res) => {
  const { course_code, course_name, semester, attendance_threshold, schedules, group_name } = req.body;

  if (!course_code || !course_name || !semester) {
    return errorResponse(res, 'Course code, name and semester are required.', 400);
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM courses WHERE course_code = ? AND instructor_id = ? AND (group_name = ? OR (group_name IS NULL AND ? IS NULL))',
      [course_code, req.user.id, group_name || null, group_name || null]
    );
    if (existing.length > 0) {
      return errorResponse(res, 'Course code already exists for this group.', 409);
    }

    const uuid = generateUUID();
    const defaultThreshold = await getSettingByKey('default_attendance_threshold');
    const finalThreshold = attendance_threshold || defaultThreshold || 70;

    const [result] = await pool.query(
      'INSERT INTO courses (uuid, course_code, course_name, instructor_id, semester, attendance_threshold, group_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid, course_code, course_name, req.user.id, semester, finalThreshold, group_name || null]
    );

    const courseId = result.insertId;

    if (schedules && schedules.length > 0) {
      for (const s of schedules) {
        if (s.day && s.start_time && s.end_time) {
          await pool.query(
            'INSERT INTO course_schedules (course_id, day, start_time, end_time) VALUES (?, ?, ?, ?)',
            [courseId, s.day, s.start_time, s.end_time]
          );
        }
      }
    }

    return successResponse(res, { uuid, course_code, course_name }, 'Course created successfully.', 201);
  } catch (error) {
    console.error('Create course error:', error.message);
    return errorResponse(res, 'Failed to create course.');
  }
};

const getAllCourses = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.uuid, c.course_code, c.course_name, c.semester, c.attendance_threshold, c.group_name,
             u.full_name AS instructor_name
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.is_active = true
      ORDER BY c.created_at DESC
    `);
    return successResponse(res, rows);
  } catch (error) {
    console.error('Get courses error:', error.message);
    return errorResponse(res, 'Failed to fetch courses.');
  }
};

const getMyCourses = async (req, res) => {
  try {
    let rows;

    if (req.user.role === 'instructor') {
      [rows] = await pool.query(`
        SELECT c.uuid, c.course_code, c.course_name, c.semester, c.attendance_threshold, c.group_name,
               COUNT(ce.student_id) as student_count
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
        WHERE c.instructor_id = ? AND c.is_active = true
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `, [req.user.id]);
    } else if (req.user.role === 'student') {
      [rows] = await pool.query(`
        SELECT c.uuid, c.course_code, c.course_name, c.semester, c.group_name,
               u.full_name AS instructor_name
        FROM courses c
        JOIN course_enrollments ce ON c.id = ce.course_id
        JOIN users u ON c.instructor_id = u.id
        WHERE ce.student_id = ? AND c.is_active = true
        ORDER BY c.created_at DESC
      `, [req.user.id]);
    } else {
      return getAllCourses(req, res);
    }

    return successResponse(res, rows);
  } catch (error) {
    console.error('Get my courses error:', error.message);
    return errorResponse(res, 'Failed to fetch courses.');
  }
};

const getCourseByUUID = async (req, res) => {
  const { uuid } = req.params;

  try {
    const [rows] = await pool.query(`
      SELECT c.uuid, c.course_code, c.course_name, c.semester, c.attendance_threshold, c.group_name,
             u.full_name AS instructor_name, u.email AS instructor_email
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.uuid = ? AND c.is_active = true
    `, [uuid]);

    if (rows.length === 0) {
      return errorResponse(res, 'Course not found.', 404);
    }

    return successResponse(res, rows[0]);
  } catch (error) {
    console.error('Get course error:', error.message);
    return errorResponse(res, 'Failed to fetch course.');
  }
};

const enrollStudent = async (req, res) => {
  const { course_uuid, student_uuid } = req.body;

  if (!course_uuid || !student_uuid) {
    return errorResponse(res, 'Course UUID and student UUID are required.', 400);
  }

  try {
    const [course] = await pool.query('SELECT id FROM courses WHERE uuid = ?', [course_uuid]);
    if (course.length === 0) {
      return errorResponse(res, 'Course not found.', 404);
    }

    const [student] = await pool.query('SELECT id FROM users WHERE uuid = ? AND role = ?', [student_uuid, 'student']);
    if (student.length === 0) {
      return errorResponse(res, 'Student not found.', 404);
    }

    const [existing] = await pool.query(
      'SELECT id FROM course_enrollments WHERE student_id = ? AND course_id = ?',
      [student[0].id, course[0].id]
    );
    if (existing.length > 0) {
      return errorResponse(res, 'Student already enrolled.', 409);
    }

    await pool.query(
      'INSERT INTO course_enrollments (student_id, course_id) VALUES (?, ?)',
      [student[0].id, course[0].id]
    );

    return successResponse(res, {}, 'Student enrolled successfully.', 201);
  } catch (error) {
    console.error('Enroll error:', error.message);
    return errorResponse(res, 'Failed to enroll student.');
  }
};

const getCourseStudents = async (req, res) => {
  const { uuid } = req.params;

  try {
    const [course] = await pool.query('SELECT id FROM courses WHERE uuid = ?', [uuid]);
    if (course.length === 0) {
      return errorResponse(res, 'Course not found.', 404);
    }

    const [rows] = await pool.query(`
      SELECT u.uuid, u.full_name, u.email, u.student_number, ce.enrolled_at
      FROM users u
      JOIN course_enrollments ce ON u.id = ce.student_id
      WHERE ce.course_id = ?
      ORDER BY u.full_name ASC
    `, [course[0].id]);

    return successResponse(res, rows);
  } catch (error) {
    console.error('Get students error:', error.message);
    return errorResponse(res, 'Failed to fetch students.');
  }
};

const deleteCourse = async (req, res) => {
  const { uuid } = req.params;
  try {
    const [course] = await pool.query(
      'SELECT id FROM courses WHERE uuid = ? AND instructor_id = ?',
      [uuid, req.user.id]
    );
    if (course.length === 0) return errorResponse(res, 'Course not found or access denied.', 404);

    await pool.query('DELETE FROM courses WHERE id = ?', [course[0].id]);
    return successResponse(res, {}, 'Course deleted successfully.');
  } catch (error) {
    console.error('Delete course error:', error.message);
    return errorResponse(res, 'Failed to delete course.');
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getMyCourses,
  getCourseByUUID,
  enrollStudent,
  getCourseStudents,
  deleteCourse
};
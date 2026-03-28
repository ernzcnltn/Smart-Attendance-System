const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/helpers');

const getStats = async (req, res) => {
  try {
    const [[students]] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');
    const [[instructors]] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "instructor"');
    const [[courses]] = await pool.query('SELECT COUNT(*) as count FROM courses WHERE is_active = true');
    const [[sessions]] = await pool.query('SELECT COUNT(*) as count FROM class_sessions');
    const [[attendances]] = await pool.query('SELECT COUNT(*) as count FROM attendance_records');

    return successResponse(res, {
      students: students.count,
      instructors: instructors.count,
      courses: courses.count,
      sessions: sessions.count,
      attendances: attendances.count
    });
  } catch (error) {
    console.error('Get stats error:', error.message);
    return errorResponse(res, 'Failed to fetch stats.');
  }
};

const getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT uuid, full_name, email, role, student_number, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    return successResponse(res, rows);
  } catch (error) {
    console.error('Get users error:', error.message);
    return errorResponse(res, 'Failed to fetch users.');
  }
};

const toggleUserStatus = async (req, res) => {
  const { uuid } = req.params;
  try {
    const [user] = await pool.query('SELECT id, is_active FROM users WHERE uuid = ?', [uuid]);
    if (user.length === 0) return errorResponse(res, 'User not found.', 404);

    const newStatus = !user[0].is_active;
    await pool.query('UPDATE users SET is_active = ? WHERE uuid = ?', [newStatus, uuid]);

    return successResponse(res, { is_active: newStatus }, `User ${newStatus ? 'activated' : 'deactivated'} successfully.`);
  } catch (error) {
    console.error('Toggle user error:', error.message);
    return errorResponse(res, 'Failed to update user status.');
  }
};

const deleteUser = async (req, res) => {
  const { uuid } = req.params;
  try {
    const [user] = await pool.query('SELECT id FROM users WHERE uuid = ?', [uuid]);
    if (user.length === 0) return errorResponse(res, 'User not found.', 404);

    await pool.query('DELETE FROM users WHERE uuid = ?', [uuid]);
    return successResponse(res, {}, 'User deleted successfully.');
  } catch (error) {
    console.error('Delete user error:', error.message);
    return errorResponse(res, 'Failed to delete user.');
  }
};

const getAllCoursesAdmin = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.uuid, c.course_code, c.course_name, c.semester, c.attendance_threshold, c.is_active,
             u.full_name AS instructor_name, u.email AS instructor_email,
             COUNT(ce.id) AS student_count
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    return successResponse(res, rows);
  } catch (error) {
    console.error('Get all courses error:', error.message);
    return errorResponse(res, 'Failed to fetch courses.');
  }
};

const toggleCourseStatus = async (req, res) => {
  const { uuid } = req.params;
  try {
    const [course] = await pool.query('SELECT id, is_active FROM courses WHERE uuid = ?', [uuid]);
    if (course.length === 0) return errorResponse(res, 'Course not found.', 404);

    const newStatus = !course[0].is_active;
    await pool.query('UPDATE courses SET is_active = ? WHERE uuid = ?', [newStatus, uuid]);

    return successResponse(res, { is_active: newStatus }, `Course ${newStatus ? 'activated' : 'deactivated'} successfully.`);
  } catch (error) {
    console.error('Toggle course error:', error.message);
    return errorResponse(res, 'Failed to update course status.');
  }
};

module.exports = {
  getStats,
  getAllUsers,
  toggleUserStatus,
  deleteUser,
  getAllCoursesAdmin,
  toggleCourseStatus
};
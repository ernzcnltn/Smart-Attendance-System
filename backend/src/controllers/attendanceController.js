const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/helpers');

const getAttendanceStats = async (req, res) => {
  const { course_uuid } = req.params;

  try {
    const [course] = await pool.query(
      'SELECT id, attendance_threshold FROM courses WHERE uuid = ?',
      [course_uuid]
    );
    if (course.length === 0) {
      return errorResponse(res, 'Course not found.', 404);
    }

    const courseId = course[0].id;
    const threshold = course[0].attendance_threshold;

    const [totalSessions] = await pool.query(
      'SELECT COUNT(*) as total FROM class_sessions WHERE course_id = ?',
      [courseId]
    );

    const [students] = await pool.query(`
      SELECT
        u.uuid, u.full_name, u.student_number,
        COUNT(ar.id) as attended,
        ? as total_sessions,
        ROUND((COUNT(ar.id) / NULLIF(?, 0)) * 100, 2) as percentage
      FROM users u
      JOIN course_enrollments ce ON u.id = ce.student_id
      LEFT JOIN class_sessions cs ON cs.course_id = ?
      LEFT JOIN attendance_records ar ON ar.student_id = u.id AND ar.session_id = cs.id
      WHERE ce.course_id = ?
      GROUP BY u.id, u.uuid, u.full_name, u.student_number
      ORDER BY percentage ASC
    `, [
      totalSessions[0].total,
      totalSessions[0].total,
      courseId,
      courseId
    ]);

    const atRisk = students.filter(s => s.percentage < threshold);

    return successResponse(res, {
      total_sessions: totalSessions[0].total,
      threshold,
      students,
      at_risk_count: atRisk.length
    });
  } catch (error) {
    console.error('Get attendance stats error:', error.message);
    return errorResponse(res, 'Failed to fetch attendance stats.');
  }
};

const sendLowAttendanceNotifications = async (req, res) => {
  const { course_uuid } = req.params;

  try {
    const [course] = await pool.query(
      'SELECT id, course_name, attendance_threshold FROM courses WHERE uuid = ? AND instructor_id = ?',
      [course_uuid, req.user.id]
    );
    if (course.length === 0) {
      return errorResponse(res, 'Course not found or access denied.', 404);
    }

    const courseId = course[0].id;
    const threshold = course[0].attendance_threshold;

    const [totalSessions] = await pool.query(
      'SELECT COUNT(*) as total FROM class_sessions WHERE course_id = ?',
      [courseId]
    );

    const total = totalSessions[0].total;
    if (total === 0) {
      return errorResponse(res, 'No sessions found for this course.', 400);
    }

    const [students] = await pool.query(`
      SELECT
        u.id, u.full_name, u.student_number,
        COUNT(ar.id) as attended,
        ROUND((COUNT(ar.id) / ?) * 100, 2) as percentage
      FROM users u
      JOIN course_enrollments ce ON u.id = ce.student_id
      LEFT JOIN class_sessions cs ON cs.course_id = ?
      LEFT JOIN attendance_records ar ON ar.student_id = u.id AND ar.session_id = cs.id
      WHERE ce.course_id = ?
      GROUP BY u.id, u.full_name, u.student_number
      HAVING percentage < ?
    `, [total, courseId, courseId, threshold]);

    if (students.length === 0) {
      return successResponse(res, { notified: 0 }, 'No students below threshold.');
    }

    const notifications = students.map(s => [
      s.id,
      `Your attendance in ${course[0].course_name} is ${s.percentage}%, which is below the required ${threshold}%. Please attend classes regularly.`
    ]);

    await pool.query(
      'INSERT INTO notifications (user_id, message) VALUES ?',
      [notifications]
    );

    return successResponse(res, {
      notified: students.length,
      students: students.map(s => ({
        full_name: s.full_name,
        student_number: s.student_number,
        percentage: s.percentage
      }))
    }, `${students.length} students notified.`);
  } catch (error) {
    console.error('Send notifications error:', error.message);
    return errorResponse(res, 'Failed to send notifications.');
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    return successResponse(res, rows);
  } catch (error) {
    console.error('Get notifications error:', error.message);
    return errorResponse(res, 'Failed to fetch notifications.');
  }
};

const markNotificationRead = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return errorResponse(res, 'Notification not found.', 404);
    }
    return successResponse(res, {}, 'Notification marked as read.');
  } catch (error) {
    console.error('Mark notification error:', error.message);
    return errorResponse(res, 'Failed to update notification.');
  }
};

const deleteNotification = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return errorResponse(res, 'Notification not found.', 404);
    }
    return successResponse(res, {}, 'Notification deleted successfully.');
  } catch (error) {
    console.error('Delete notification error:', error.message);
    return errorResponse(res, 'Failed to delete notification.');
  }
};

module.exports = {
  getAttendanceStats,
  sendLowAttendanceNotifications,
  getMyNotifications,
  markNotificationRead,
  deleteNotification
};
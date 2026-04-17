const pool = require('../config/db');
const QRCode = require('qrcode');
const { generateUUID, successResponse, errorResponse } = require('../utils/helpers');

const createSession = async (req, res) => {
  const { course_uuid, session_date, start_time, end_time } = req.body;

  if (!course_uuid || !session_date || !start_time || !end_time) {
    return errorResponse(res, 'All fields are required.', 400);
  }

  try {
    const [course] = await pool.query(
      'SELECT id FROM courses WHERE uuid = ? AND instructor_id = ?',
      [course_uuid, req.user.id]
    );
    if (course.length === 0) {
      return errorResponse(res, 'Course not found or access denied.', 404);
    }

    const uuid = generateUUID();
    await pool.query(
      'INSERT INTO class_sessions (uuid, course_id, session_date, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
      [uuid, course[0].id, session_date, start_time, end_time]
    );

    return successResponse(res, { uuid, session_date, start_time, end_time }, 'Session created successfully.', 201);
  } catch (error) {
    console.error('Create session error:', error.message);
    return errorResponse(res, 'Failed to create session.');
  }
};

const notifyStudents = async (courseId, message) => {
  try {
    const [students] = await pool.query(`
      SELECT student_id FROM course_enrollments WHERE course_id = ?
    `, [courseId]);

    if (students.length === 0) return;

    const notifications = students.map(s => [s.student_id, message]);
    await pool.query(
      'INSERT INTO notifications (user_id, message) VALUES ?',
      [notifications]
    );
  } catch (err) {
    console.error('Notify students error:', err.message);
  }
};

const generateQR = async (req, res) => {
  const { course_uuid } = req.params;
  const { duration_minutes = 15, use_existing = false, force_new = false } = req.body;

  try {
    const [course] = await pool.query(
      'SELECT id, course_code, course_name FROM courses WHERE uuid = ? AND instructor_id = ?',
      [course_uuid, req.user.id]
    );
    if (course.length === 0) {
      return errorResponse(res, 'Course not found or access denied.', 404);
    }

    const now = new Date();
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const startTime = now.toTimeString().split(' ')[0];
    const endTime = new Date(Date.now() + duration_minutes * 60 * 1000).toTimeString().split(' ')[0];

    const [existingSessions] = await pool.query(
      `SELECT id, uuid, session_date, start_time, end_time 
       FROM class_sessions 
       WHERE course_id = ? 
       AND session_date = ? 
       AND qr_expires_at > NOW()
       AND is_active = true`,
      [course[0].id, today]
    );

    if (existingSessions.length > 0 && !use_existing && !force_new) {
      return res.status(200).json({
        success: true,
        has_existing: true,
        message: 'An active session already exists for today.',
        data: {
          existing_session: {
            uuid: existingSessions[0].uuid,
            session_date: existingSessions[0].session_date,
            start_time: existingSessions[0].start_time,
            end_time: existingSessions[0].end_time
          }
        }
      });
    }

    let sessionUUID;
    let sessionId;
    let isNewSession = false;

    if (existingSessions.length > 0 && use_existing) {
      sessionUUID = existingSessions[0].uuid;
      sessionId = existingSessions[0].id;
    } else {
      sessionUUID = generateUUID();
      const [result] = await pool.query(
        'INSERT INTO class_sessions (uuid, course_id, session_date, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
        [sessionUUID, course[0].id, today, startTime, endTime]
      );
      sessionId = result.insertId;
      isNewSession = true;
    }

    const qr_token = generateUUID();
    const qr_expires_at = new Date(Date.now() + duration_minutes * 60 * 1000);

    await pool.query(
      'UPDATE class_sessions SET qr_token = ?, qr_expires_at = ?, is_active = true WHERE id = ?',
      [qr_token, qr_expires_at, sessionId]
    );

    // Yeni session açılınca bildirim gönder
    if (isNewSession) {
      await notifyStudents(
        course[0].id,
        ` ${course[0].course_code} - ${course[0].course_name} attendance is now open. Please scan the QR code to mark your attendance.`
      );
    }

    const qrData = JSON.stringify({
      session_uuid: sessionUUID,
      qr_token,
      expires_at: qr_expires_at
    });

    const qrCodeImage = await QRCode.toDataURL(qrData);

    return successResponse(res, {
      qr_code: qrCodeImage,
      qr_token,
      session_uuid: sessionUUID,
      expires_at: qr_expires_at,
      duration_minutes
    }, 'QR code generated successfully.');
  } catch (error) {
    console.error('Generate QR error:', error.message);
    return errorResponse(res, 'Failed to generate QR code.');
  }
};

const markAttendance = async (req, res) => {
  const { session_uuid, qr_token } = req.body;

  if (!session_uuid || !qr_token) {
    return errorResponse(res, 'Session UUID and QR token are required.', 400);
  }

  if (req.user.role !== 'student') {
    return errorResponse(res, 'Only students can mark attendance.', 403);
  }

  try {
    const [sessions] = await pool.query(`
      SELECT cs.id, cs.qr_token, cs.qr_expires_at, cs.is_active, cs.course_id,
             cs.session_date, cs.start_time, cs.end_time
      FROM class_sessions cs
      WHERE cs.uuid = ?
    `, [session_uuid]);

    if (sessions.length === 0) {
      return errorResponse(res, 'Session not found.', 404);
    }

    const session = sessions[0];

    if (!session.is_active) {
      return errorResponse(res, 'Session is not active.', 400);
    }

    if (session.qr_token !== qr_token) {
      return errorResponse(res, 'Invalid QR code.', 400);
    }

    if (new Date() > new Date(session.qr_expires_at)) {
      return errorResponse(res, 'QR code has expired.', 400);
    }

    const now = new Date();
    const sessionDate = session.session_date instanceof Date
      ? `${session.session_date.getFullYear()}-${String(session.session_date.getMonth() + 1).padStart(2, '0')}-${String(session.session_date.getDate()).padStart(2, '0')}`
      : session.session_date.toString().split('T')[0];
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    if (sessionDate !== today) {
      return errorResponse(res, 'This session is not scheduled for today.', 400);
    }

    const currentTime = now.toTimeString().split(' ')[0];
    if (currentTime < session.start_time || currentTime > session.end_time) {
      return errorResponse(res, 'Attendance can only be marked during class hours.', 400);
    }

    const [enrollment] = await pool.query(
      'SELECT id FROM course_enrollments WHERE student_id = ? AND course_id = ?',
      [req.user.id, session.course_id]
    );
    if (enrollment.length === 0) {
      return errorResponse(res, 'You are not enrolled in this course.', 403);
    }

    const [existing] = await pool.query(
      'SELECT id FROM attendance_records WHERE student_id = ? AND session_id = ?',
      [req.user.id, session.id]
    );
    if (existing.length > 0) {
      return errorResponse(res, 'Attendance already marked.', 409);
    }

    await pool.query(
      'INSERT INTO attendance_records (student_id, session_id, method) VALUES (?, ?, ?)',
      [req.user.id, session.id, 'qr']
    );

    return successResponse(res, {}, 'Attendance marked successfully.');
  } catch (error) {
    console.error('Mark attendance error:', error.message);
    return errorResponse(res, 'Failed to mark attendance.');
  }
};

const getSessionAttendance = async (req, res) => {
  const { uuid } = req.params;

  try {
    const [sessions] = await pool.query(`
      SELECT cs.id, c.instructor_id
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.uuid = ?
    `, [uuid]);

    if (sessions.length === 0) {
      return errorResponse(res, 'Session not found.', 404);
    }

    if (sessions[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, 'Access denied.', 403);
    }

    const [records] = await pool.query(`
      SELECT u.full_name, u.student_number, u.email,
             ar.marked_at, ar.method
      FROM attendance_records ar
      JOIN users u ON ar.student_id = u.id
      WHERE ar.session_id = ?
      ORDER BY ar.marked_at ASC
    `, [sessions[0].id]);

    return successResponse(res, records);
  } catch (error) {
    console.error('Get attendance error:', error.message);
    return errorResponse(res, 'Failed to fetch attendance.');
  }
};

const getMyAttendance = async (req, res) => {
  try {
    const [records] = await pool.query(`
      SELECT c.course_code, c.course_name,
             cs.session_date, cs.start_time, cs.end_time,
             ar.marked_at, ar.method
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      WHERE ar.student_id = ?
      ORDER BY ar.marked_at DESC
    `, [req.user.id]);

    return successResponse(res, records);
  } catch (error) {
    console.error('Get my attendance error:', error.message);
    return errorResponse(res, 'Failed to fetch attendance.');
  }
};

const deleteSession = async (req, res) => {
  const { uuid } = req.params;
  try {
    const [session] = await pool.query(`
      SELECT cs.id, cs.course_id, c.instructor_id, c.course_code, c.course_name
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.uuid = ?
    `, [uuid]);

    if (session.length === 0) return errorResponse(res, 'Session not found.', 404);
    if (session[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, 'Access denied.', 403);
    }

    // Session silinince bildirim gönder
   await notifyStudents(
  session[0].course_id,
  `${session[0].course_code} - ${session[0].course_name} attendance session has been cancelled by the instructor.`
);

    await pool.query('DELETE FROM class_sessions WHERE uuid = ?', [uuid]);
    return successResponse(res, {}, 'Session deleted successfully.');
  } catch (error) {
    console.error('Delete session error:', error.message);
    return errorResponse(res, 'Failed to delete session.');
  }
};

const getSessionsByCourse = async (req, res) => {
  const { course_uuid } = req.params;
  try {
    const [course] = await pool.query('SELECT id FROM courses WHERE uuid = ?', [course_uuid]);
    if (course.length === 0) return errorResponse(res, 'Course not found.', 404);

    const [rows] = await pool.query(`
      SELECT uuid, session_date, start_time, end_time, qr_expires_at,
             (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = cs.id) as attendance_count
      FROM class_sessions cs
      WHERE course_id = ?
      ORDER BY session_date DESC, start_time DESC
    `, [course[0].id]);

    return successResponse(res, rows);
  } catch (error) {
    console.error('Get sessions error:', error.message);
    return errorResponse(res, 'Failed to fetch sessions.');
  }
};

const getActiveSession = async (req, res) => {
  const { course_uuid } = req.params;
  try {
    const [course] = await pool.query(
      'SELECT id FROM courses WHERE uuid = ? AND instructor_id = ?',
      [course_uuid, req.user.id]
    );
    if (course.length === 0) return errorResponse(res, 'Course not found.', 404);

    const now = new Date();
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    const [sessions] = await pool.query(
      `SELECT uuid, qr_token, qr_expires_at, start_time, end_time, session_date
       FROM class_sessions
       WHERE course_id = ?
       AND session_date = ?
       AND qr_expires_at > NOW()
       AND is_active = true
       ORDER BY qr_expires_at DESC
       LIMIT 1`,
      [course[0].id, today]
    );

    if (sessions.length === 0) {
      return successResponse(res, { has_active: false });
    }

    const session = sessions[0];
    const expiresAt = new Date(session.qr_expires_at);
    const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));

    const qrData = JSON.stringify({
      session_uuid: session.uuid,
      qr_token: session.qr_token,
      expires_at: session.qr_expires_at
    });

    const qrCodeImage = await QRCode.toDataURL(qrData);

    return successResponse(res, {
      has_active: true,
      session_uuid: session.uuid,
      qr_code: qrCodeImage,
      qr_token: session.qr_token,
      expires_at: session.qr_expires_at,
      remaining_seconds: remainingSeconds,
      start_time: session.start_time,
      end_time: session.end_time,
      session_date: session.session_date
    });
  } catch (error) {
    console.error('Get active session error:', error.message);
    return errorResponse(res, 'Failed to fetch active session.');
  }
};

module.exports = {
  createSession,
  generateQR,
  markAttendance,
  getSessionAttendance,
  getMyAttendance,
  deleteSession,
  getSessionsByCourse,
  getActiveSession
};
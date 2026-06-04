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
    if (course.length === 0) return errorResponse(res, 'Course not found or access denied.', 404);
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
    const [students] = await pool.query('SELECT student_id FROM course_enrollments WHERE course_id = ?', [courseId]);
    if (students.length === 0) return;
    const notifications = students.map(s => [s.student_id, message]);
    await pool.query('INSERT INTO notifications (user_id, message) VALUES ?', [notifications]);
  } catch (err) {
    console.error('Notify students error:', err.message);
  }
};

const generateQR = async (req, res) => {
  const { course_uuid } = req.params;
  const { duration_minutes = 15, use_existing = false, force_new = false, latitude, longitude, is_online = false } = req.body;

  if (!is_online && (!latitude || !longitude)) {
    return errorResponse(res, 'Location is required to start a session. Please allow location access.', 400, 'LOCATION_REQUIRED');
  }

  try {
    const [course] = await pool.query(
      'SELECT id, course_code, course_name FROM courses WHERE uuid = ? AND instructor_id = ?',
      [course_uuid, req.user.id]
    );
    if (course.length === 0) return errorResponse(res, 'Course not found or access denied.', 404);

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const todayName = DAYS[now.getDay()];
    const currentTime = now.toTimeString().split(' ')[0];

    const [schedules] = await pool.query(
      'SELECT day, start_time, end_time FROM course_schedules WHERE course_id = ? AND day = ?',
      [course[0].id, todayName]
    );

    if (schedules.length === 0) {
      return errorResponse(res, `No class scheduled for ${todayName}. QR code can only be generated during scheduled class hours.`, 400, 'NO_CLASS_TODAY');
    }

    const isWithinSchedule = schedules.some(s => {
      const start = s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time;
      const end = s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time;
      return currentTime >= start && currentTime <= end;
    });

    if (!isWithinSchedule) {
      const times = schedules.map(s => `${s.start_time.substring(0,5)} - ${s.end_time.substring(0,5)}`).join(', ');
      return errorResponse(res, `Class is not in session right now. Today's schedule: ${times}`, 400, 'NOT_IN_SESSION');
    }

    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const startTime = now.toTimeString().split(' ')[0];
    const endTime = new Date(Date.now() + duration_minutes * 60 * 1000).toTimeString().split(' ')[0];

    const [existingSessions] = await pool.query(
  `SELECT id, uuid, session_date, start_time, end_time, qr_expires_at, is_active
   FROM class_sessions 
   WHERE course_id = ? AND session_date = ?`,
  [course[0].id, today]
);

if (existingSessions.length > 0 && !force_new) {
  const expired = existingSessions.find(
    s => new Date(s.qr_expires_at) < new Date()
  );
  if (expired) {
    return errorResponse(
      res,
      `A session already took place for today's ${course[0].course_code} class. A new QR code cannot be generated.`,
      400,
      'SESSION_ALREADY_COMPLETED'
    );
  }
}

    let sessionUUID, sessionId, isNewSession = false;

    if (existingSessions.length > 0 && use_existing) {
      sessionUUID = existingSessions[0].uuid;
      sessionId = existingSessions[0].id;
      await pool.query(
        'UPDATE class_sessions SET instructor_lat = ?, instructor_lng = ? WHERE id = ?',
        [latitude || null, longitude || null, sessionId]
      );
    } else {
      sessionUUID = generateUUID();
      const [result] = await pool.query(
        'INSERT INTO class_sessions (uuid, course_id, session_date, start_time, end_time, instructor_lat, instructor_lng, is_online) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [sessionUUID, course[0].id, today, startTime, endTime, latitude || null, longitude || null, is_online ? 1 : 0]
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

    if (isNewSession) {
      await notifyStudents(
        course[0].id,
        `${course[0].course_code} - ${course[0].course_name} attendance is now open. Please scan the QR code to mark your attendance.`
      );
    }

    const qrData = JSON.stringify({ session_uuid: sessionUUID, qr_token, expires_at: qr_expires_at });
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

const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const markAttendance = async (req, res) => {
  const { session_uuid, qr_token, latitude, longitude, expected_course_uuid } = req.body;

  if (!session_uuid || !qr_token) return errorResponse(res, 'Session UUID and QR token are required.', 400);
  if (!latitude || !longitude) return errorResponse(res, 'Location is required to mark attendance.', 400, 'LOCATION_REQUIRED');
  if (req.user.role !== 'student') return errorResponse(res, 'Only students can mark attendance.', 403);

  try {
    const [sessions] = await pool.query(`
      SELECT cs.id, cs.qr_token, cs.qr_expires_at, cs.is_active, cs.course_id,
             cs.session_date, cs.start_time, cs.end_time,
             cs.instructor_lat, cs.instructor_lng, cs.is_online
      FROM class_sessions cs WHERE cs.uuid = ?
    `, [session_uuid]);

    if (sessions.length === 0) return errorResponse(res, 'Session not found.', 404);

    const session = sessions[0];

    if (!session.is_active) return errorResponse(res, 'Session is not active.', 400, 'SESSION_INACTIVE');
    if (session.qr_token !== qr_token) return errorResponse(res, 'Invalid QR code.', 400, 'INVALID_QR');
    if (new Date() > new Date(session.qr_expires_at)) return errorResponse(res, 'QR code has expired.', 400, 'QR_EXPIRED');

    const now = new Date();
    const sessionDate = session.session_date instanceof Date
      ? `${session.session_date.getFullYear()}-${String(session.session_date.getMonth() + 1).padStart(2, '0')}-${String(session.session_date.getDate()).padStart(2, '0')}`
      : session.session_date.toString().split('T')[0];
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    if (sessionDate !== today) return errorResponse(res, 'This session is not scheduled for today.', 400, 'WRONG_DATE');

    const currentTime = now.toTimeString().split(' ')[0];
    if (currentTime < session.start_time || currentTime > session.end_time) {
      return errorResponse(res, 'Attendance can only be marked during class hours.', 400, 'OUTSIDE_CLASS_HOURS');
    }

    // GPS kontrolü — online session ise atla
   if (!session.is_online) {
      if (!session.instructor_lat || !session.instructor_lng) {
        return errorResponse(res, 'Session location not set. Cannot verify attendance.', 400, 'NO_INSTRUCTOR_LOCATION');
      }
      const studentLat = parseFloat(latitude);
      const studentLng = parseFloat(longitude);
      if (isNaN(studentLat) || isNaN(studentLng)) {
        return errorResponse(res, 'Invalid location data.', 400, 'INVALID_LOCATION');
      }
      const GPS_RADIUS = 1;
      const distance = getDistanceMeters(
        parseFloat(session.instructor_lat), parseFloat(session.instructor_lng),
        studentLat, studentLng
      );
      console.log(`[GPS] Distance: ${Math.round(distance)}m (max: ${GPS_RADIUS}m)`);
      if (isNaN(distance) || distance > GPS_RADIUS) {
        return errorResponse(
          res,
          `You must be within ${GPS_RADIUS} meters of the classroom. Your distance: ${isNaN(distance) ? 'unknown' : Math.round(distance)}m.`,
          400,
          'GPS_TOO_FAR'
        );
      }
    }

    const [enrollment] = await pool.query(
      'SELECT id FROM course_enrollments WHERE student_id = ? AND course_id = ?',
      [req.user.id, session.course_id]
    );
    if (enrollment.length === 0) return errorResponse(res, 'You are not enrolled in this course.', 403, 'NOT_ENROLLED');

    if (expected_course_uuid) {
      const [expectedCourse] = await pool.query('SELECT id FROM courses WHERE uuid = ?', [expected_course_uuid]);
      if (expectedCourse.length > 0 && expectedCourse[0].id !== session.course_id) {
        const [actualCourse] = await pool.query('SELECT course_code, course_name FROM courses WHERE id = ?', [session.course_id]);
        const actualName = actualCourse.length > 0 ? `${actualCourse[0].course_code} - ${actualCourse[0].course_name}` : 'another course';
        return errorResponse(res, `This QR code belongs to ${actualName}. Please scan the correct QR code for your course.`, 400, 'WRONG_COURSE');
      }
    }

    const [courseInfo] = await pool.query('SELECT course_code, course_name FROM courses WHERE id = ?', [session.course_id]);

    const [existing] = await pool.query(
      'SELECT id FROM attendance_records WHERE student_id = ? AND session_id = ?',
      [req.user.id, session.id]
    );
    if (existing.length > 0) return errorResponse(res, 'Attendance already marked.', 409, 'ALREADY_MARKED');

    await pool.query(
      'INSERT INTO attendance_records (student_id, session_id, method) VALUES (?, ?, ?)',
      [req.user.id, session.id, 'qr']
    );

    return successResponse(res, {
      course_code: courseInfo[0]?.course_code,
      course_name: courseInfo[0]?.course_name
    }, 'Attendance marked successfully.');
  } catch (error) {
    console.error('Mark attendance error:', error.message);
    return errorResponse(res, 'Failed to mark attendance.');
  }
};

const getSessionAttendance = async (req, res) => {
  const { uuid } = req.params;
  try {
    const [sessions] = await pool.query(`
      SELECT cs.id, c.instructor_id FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id WHERE cs.uuid = ?
    `, [uuid]);
    if (sessions.length === 0) return errorResponse(res, 'Session not found.', 404);
    if (sessions[0].instructor_id !== req.user.id && req.user.role !== 'admin') return errorResponse(res, 'Access denied.', 403);
    const [records] = await pool.query(`
      SELECT u.full_name, u.student_number, u.email, ar.marked_at, ar.method
      FROM attendance_records ar JOIN users u ON ar.student_id = u.id
      WHERE ar.session_id = ? ORDER BY ar.marked_at ASC
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
             ar.marked_at, ar.method,
             u.full_name as instructor_name
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
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
      FROM class_sessions cs JOIN courses c ON cs.course_id = c.id WHERE cs.uuid = ?
    `, [uuid]);
    if (session.length === 0) return errorResponse(res, 'Session not found.', 404);
    if (session[0].instructor_id !== req.user.id && req.user.role !== 'admin') return errorResponse(res, 'Access denied.', 403);
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
      FROM class_sessions cs WHERE course_id = ?
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
       WHERE course_id = ? AND session_date = ? AND qr_expires_at > NOW() AND is_active = true
       ORDER BY qr_expires_at DESC LIMIT 1`,
      [course[0].id, today]
    );

    if (sessions.length === 0) return successResponse(res, { has_active: false });

    const session = sessions[0];
    const remainingSeconds = Math.max(0, Math.floor((new Date(session.qr_expires_at) - now) / 1000));
    const qrData = JSON.stringify({ session_uuid: session.uuid, qr_token: session.qr_token, expires_at: session.qr_expires_at });
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


const getActiveSessionForStudent = async (req, res) => {
  const { course_uuid } = req.params;
  try {
    const [course] = await pool.query(
      `SELECT c.id FROM courses c 
       JOIN course_enrollments ce ON c.id = ce.course_id 
       WHERE c.uuid = ? AND ce.student_id = ?`,
      [course_uuid, req.user.id]
    );
    if (course.length === 0) return successResponse(res, { has_active: false });

    const now = new Date();
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    const [sessions] = await pool.query(
      `SELECT uuid, qr_token, qr_expires_at, start_time, end_time, session_date
       FROM class_sessions
       WHERE course_id = ? AND session_date = ? AND qr_expires_at > NOW() AND is_active = true
       ORDER BY qr_expires_at DESC LIMIT 1`,
      [course[0].id, today]
    );

    if (sessions.length === 0) return successResponse(res, { has_active: false });

    const session = sessions[0];
    return successResponse(res, {
      has_active: true,
      session_uuid: session.uuid,
      qr_token: session.qr_token,
      expires_at: session.qr_expires_at,
    });
  } catch (error) {
    console.error('Get active session for student error:', error.message);
    return errorResponse(res, 'Failed to fetch active session.');
  }
};


const refreshQRToken = async (req, res) => {
  const { session_uuid } = req.params;
  try {
    const [sessions] = await pool.query(
      `SELECT cs.id, cs.qr_expires_at, cs.is_active, c.instructor_id
       FROM class_sessions cs
       JOIN courses c ON cs.course_id = c.id
       WHERE cs.uuid = ?`,
      [session_uuid]
    );

    if (sessions.length === 0) return errorResponse(res, 'Session not found.', 404);
    const session = sessions[0];

    if (session.instructor_id !== req.user.id) return errorResponse(res, 'Access denied.', 403);
    if (!session.is_active) return errorResponse(res, 'Session is not active.', 400);
    if (new Date() > new Date(session.qr_expires_at)) return errorResponse(res, 'Session has expired.', 400);

    const qr_token = generateUUID();
    await pool.query(
      'UPDATE class_sessions SET qr_token = ? WHERE id = ?',
      [qr_token, session.id]
    );

    const qrData = JSON.stringify({ session_uuid, qr_token, expires_at: session.qr_expires_at });
    const qrCodeImage = await QRCode.toDataURL(qrData);

    return successResponse(res, { qr_code: qrCodeImage, qr_token });
  } catch (error) {
    console.error('Refresh QR error:', error.message);
    return errorResponse(res, 'Failed to refresh QR token.');
  }
};

module.exports = {
  createSession, generateQR, markAttendance,
  getSessionAttendance, getMyAttendance, deleteSession,
  getSessionsByCourse, getActiveSession, getActiveSessionForStudent, refreshQRToken
};
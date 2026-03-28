const pool = require('../config/db');
const { generateUUID, successResponse, errorResponse } = require('../utils/helpers');
const fs = require('fs');
const csv = require('csv-parser');

const uploadTimetable = async (req, res) => {
  if (!req.file) {
    return errorResponse(res, 'No file uploaded.', 400);
  }

  const results = [];
  const errors = [];
  let processed = 0;
  let created = 0;

  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    for (const row of results) {
      processed++;
      try {
        const {
          course_code, course_name, instructor_email,
          semester, attendance_threshold,
          session_date, start_time, end_time
        } = row;

        if (!course_code || !course_name || !instructor_email || !semester || !session_date || !start_time || !end_time) {
          errors.push(`Row ${processed}: Missing required fields.`);
          continue;
        }

        const [instructor] = await pool.query(
          'SELECT id FROM users WHERE email = ? AND role = "instructor"',
          [instructor_email]
        );
        if (instructor.length === 0) {
          errors.push(`Row ${processed}: Instructor not found — ${instructor_email}`);
          continue;
        }

        let courseId;
        const [existingCourse] = await pool.query(
          'SELECT id FROM courses WHERE course_code = ?',
          [course_code]
        );

        if (existingCourse.length > 0) {
          courseId = existingCourse[0].id;
        } else {
          const uuid = generateUUID();
          const [result] = await pool.query(
            'INSERT INTO courses (uuid, course_code, course_name, instructor_id, semester, attendance_threshold) VALUES (?, ?, ?, ?, ?, ?)',
            [uuid, course_code, course_name, instructor[0].id, semester, attendance_threshold || 70]
          );
          courseId = result.insertId;
        }

        const [existingSession] = await pool.query(
          'SELECT id FROM class_sessions WHERE course_id = ? AND session_date = ? AND start_time = ?',
          [courseId, session_date, start_time]
        );

        if (existingSession.length === 0) {
          const sessionUUID = generateUUID();
          await pool.query(
            'INSERT INTO class_sessions (uuid, course_id, session_date, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
            [sessionUUID, courseId, session_date, start_time, end_time]
          );
          created++;
        }
      } catch (err) {
        errors.push(`Row ${processed}: ${err.message}`);
      }
    }

    fs.unlinkSync(req.file.path);

    return successResponse(res, {
      processed,
      created,
      errors
    }, `Timetable uploaded. ${created} sessions created.`);
  } catch (error) {
    console.error('Upload timetable error:', error.message);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return errorResponse(res, 'Failed to process timetable.');
  }
};

module.exports = { uploadTimetable };
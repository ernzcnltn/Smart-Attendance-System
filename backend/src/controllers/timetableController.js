const pool = require('../config/db');
const { generateUUID, successResponse, errorResponse } = require('../utils/helpers');
const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');

const uploadTimetable = async (req, res) => {
  if (!req.file) return errorResponse(res, 'No file uploaded.', 400);

  const errors = [];
  let processed = 0;
  let created = 0;
  let coursesCreated = 0;
  const deletedCourses = new Set();

  const formatTime = (time) => {
    if (!isNaN(Number(time)) && String(time).includes('.')) {
      const num = Number(time);
      const totalMinutes = Math.round(num * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    }
    const str = String(time).trim();
    const parts = str.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    }
    return str;
  };

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const results = XLSX.utils.sheet_to_json(sheet);

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    for (const row of results) {
      processed++;
      try {
        const course_code = String(row['course_code'] || '').trim();
        const course_name = String(row['course_name'] || '').trim();
        const instructor_email = String(row['instructor_email'] || '').trim();
        const semester = String(row['semester'] || '').trim();
        const attendance_threshold = row['attendance_threshold'] || 70;
        const day = String(row['day'] || '').trim();
        const start_time = String(row['start_time'] || '').trim();
        const end_time = String(row['end_time'] || '').trim();
        const group_name = String(row['group_name'] || row['Group'] || '').trim() || null;

        if (!course_code || !course_name || !instructor_email || !semester || !day || !start_time || !end_time) {
          errors.push(`Row ${processed}: Missing required fields.`);
          continue;
        }

        if (!validDays.includes(day)) {
          errors.push(`Row ${processed}: Invalid day "${day}".`);
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
          'SELECT id FROM courses WHERE course_code = ? AND instructor_id = ? AND (group_name = ? OR (group_name IS NULL AND ? IS NULL))',
          [course_code, instructor[0].id, group_name, group_name]
        );

        if (existingCourse.length > 0) {
          courseId = existingCourse[0].id;
        } else {
          const uuid = generateUUID();
          const [result] = await pool.query(
            'INSERT INTO courses (uuid, course_code, course_name, instructor_id, semester, attendance_threshold, group_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuid, course_code, course_name, instructor[0].id, semester, attendance_threshold, group_name]
          );
          courseId = result.insertId;
          coursesCreated++;
        }

        if (!deletedCourses.has(courseId)) {
          await pool.query('DELETE FROM course_schedules WHERE course_id = ?', [courseId]);
          deletedCourses.add(courseId);
        }

        await pool.query(
          'INSERT INTO course_schedules (course_id, day, start_time, end_time) VALUES (?, ?, ?, ?)',
          [courseId, day, formatTime(start_time), formatTime(end_time)]
        );
        created++;
      } catch (err) {
        errors.push(`Row ${processed}: ${err.message}`);
      }
    }

    fs.unlinkSync(req.file.path);

    return successResponse(res, { processed, created, coursesCreated, errors },
      `Timetable uploaded. ${created} schedule entries created, ${coursesCreated} new courses created.`);
  } catch (error) {
    console.error('Upload timetable error:', error.message);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return errorResponse(res, 'Failed to process timetable.');
  }
};

const uploadStudentList = async (req, res) => {
  if (!req.file) return errorResponse(res, 'No file uploaded.', 400);
  const { course_uuid } = req.body;
  if (!course_uuid) return errorResponse(res, 'Course UUID is required.', 400);

  try {
    const [course] = await pool.query(
      'SELECT id FROM courses WHERE uuid = ? AND instructor_id = ?',
      [course_uuid, req.user.id]
    );
    if (course.length === 0) return errorResponse(res, 'Course not found or access denied.', 404);

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let enrolled = 0;
    let skipped = 0;
    let notFound = 0;
    const errors = [];

    for (const row of rows) {
      const student_number = String(row['student_number'] || row['Student Number'] || row['StudentNumber'] || '').trim();
      if (!student_number) {
        errors.push(`Row skipped: missing student_number`);
        skipped++;
        continue;
      }

      const [student] = await pool.query(
        'SELECT id FROM users WHERE student_number = ? AND role = "student"',
        [student_number]
      );

      if (student.length === 0) {
        notFound++;
        continue;
      }

      const [existing] = await pool.query(
        'SELECT id FROM course_enrollments WHERE student_id = ? AND course_id = ?',
        [student[0].id, course[0].id]
      );

      if (existing.length === 0) {
        await pool.query(
          'INSERT INTO course_enrollments (student_id, course_id) VALUES (?, ?)',
          [student[0].id, course[0].id]
        );
        enrolled++;
      } else {
        skipped++;
      }
    }

    fs.unlinkSync(req.file.path);

    return successResponse(res, { enrolled, skipped, notFound, errors },
      `Student list processed. ${enrolled} students enrolled.`);
  } catch (error) {
    console.error('Upload student list error:', error.message);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return errorResponse(res, 'Failed to process student list.');
  }
};

const uploadCourseSchedule = async (req, res) => {
  if (!req.file) return errorResponse(res, 'No file uploaded.', 400);

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let created = 0;
    let skipped = 0;
    let coursesCreated = 0;
    const errors = [];
    const deletedCourses = new Set();

    const formatTime = (time) => {
      if (!isNaN(Number(time)) && String(time).includes('.')) {
        const num = Number(time);
        const totalMinutes = Math.round(num * 24 * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
      }
      const str = String(time).trim();
      const parts = str.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
      }
      return str;
    };

    for (const row of rows) {
      const course_code = String(row['course_code'] || row['Course Code'] || '').trim();
      const course_name = String(row['course_name'] || row['Course Name'] || '').trim();
      const semester = String(row['semester'] || row['Semester'] || '').trim();
      const day = String(row['day'] || row['Day'] || '').trim();
      const start_time = String(row['start_time'] || row['Start Time'] || '').trim();
      const end_time = String(row['end_time'] || row['End Time'] || '').trim();
      const group_name = String(row['group_name'] || row['Group'] || '').trim() || null;

      if (!course_code || !day || !start_time || !end_time) {
        errors.push(`Row skipped: missing fields`);
        skipped++;
        continue;
      }

      if (!validDays.includes(day)) {
        errors.push(`Row skipped: invalid day "${day}"`);
        skipped++;
        continue;
      }

      let courseId;
      const [existingCourse] = await pool.query(
        'SELECT id FROM courses WHERE course_code = ? AND instructor_id = ? AND (group_name = ? OR (group_name IS NULL AND ? IS NULL))',
        [course_code, req.user.id, group_name, group_name]
      );

      if (existingCourse.length > 0) {
        courseId = existingCourse[0].id;
      } else {
        if (!course_name || !semester) {
          errors.push(`Course not found and missing course_name/semester to create: ${course_code}`);
          skipped++;
          continue;
        }
        const uuid = generateUUID();
        const [result] = await pool.query(
          'INSERT INTO courses (uuid, course_code, course_name, instructor_id, semester, attendance_threshold, group_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [uuid, course_code, course_name, req.user.id, semester, 70, group_name]
        );
        courseId = result.insertId;
        coursesCreated++;
      }

      if (!deletedCourses.has(courseId)) {
        await pool.query('DELETE FROM course_schedules WHERE course_id = ?', [courseId]);
        deletedCourses.add(courseId);
      }

      await pool.query(
        'INSERT INTO course_schedules (course_id, day, start_time, end_time) VALUES (?, ?, ?, ?)',
        [courseId, day, formatTime(start_time), formatTime(end_time)]
      );
      created++;
    }

    fs.unlinkSync(req.file.path);

    return successResponse(res, { created, skipped, coursesCreated, errors },
      `Schedule uploaded. ${created} entries created, ${coursesCreated} new courses created.`);
  } catch (error) {
    console.error('Upload course schedule error:', error.message);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return errorResponse(res, 'Failed to process course schedule.');
  }
};

const getCourseSchedule = async (req, res) => {
  const { course_uuid } = req.params;
  try {
    const [course] = await pool.query('SELECT id FROM courses WHERE uuid = ?', [course_uuid]);
    if (course.length === 0) return errorResponse(res, 'Course not found.', 404);

    const [schedules] = await pool.query(
      'SELECT day, start_time, end_time FROM course_schedules WHERE course_id = ? ORDER BY FIELD(day, "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday")',
      [course[0].id]
    );

    return successResponse(res, schedules);
  } catch (error) {
    console.error('Get course schedule error:', error.message);
    return errorResponse(res, 'Failed to fetch schedule.');
  }
};

module.exports = { uploadTimetable, uploadStudentList, uploadCourseSchedule, getCourseSchedule };
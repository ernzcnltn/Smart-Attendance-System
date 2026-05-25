const pool = require('../config/db');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Logo'yu settings'ten al
const getLogoBase64 = async () => {
  try {
    const [rows] = await pool.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'school_logo'",
    );
    return rows.length > 0 && rows[0].setting_value ? rows[0].setting_value : null;
  } catch { return null; }
};

// Base64'ten buffer'a çevir
const base64ToBuffer = (base64) => {
  const data = base64.includes(',') ? base64.split(',')[1] : base64;
  return Buffer.from(data, 'base64');
};

// PDF'e logo ekle, y konumunu döndür
const addLogoToPDF = async (doc) => {
  const logo = await getLogoBase64();
  if (logo) {
    try {
      const buf = base64ToBuffer(logo);
      doc.image(buf, (doc.page.width - 80) / 2, 30, { width: 80, height: 80 });
    } catch (e) {
      console.error('Logo render error:', e.message);
    }
  }
  return logo ? 130 : 40; // 100'den 130'a çıkardık
};

const exportAttendanceExcel = async (req, res) => {
  const { course_uuid } = req.params;
  try {
    const [course] = await pool.query(
      `SELECT c.id, c.course_code, c.course_name, c.semester, c.attendance_threshold,
              u.full_name as instructor_name
       FROM courses c LEFT JOIN users u ON c.instructor_id = u.id WHERE c.uuid = ?`,
      [course_uuid]
    );
    if (course.length === 0) return res.status(404).json({ success: false, message: 'Course not found.' });

    const [records] = await pool.query(`
      SELECT u.full_name, u.student_number, u.email,
             cs.session_date, cs.start_time, cs.end_time, ar.marked_at, ar.method
      FROM attendance_records ar
      JOIN users u ON ar.student_id = u.id
      JOIN class_sessions cs ON ar.session_id = cs.id
      WHERE cs.course_id = ? ORDER BY cs.session_date ASC, u.full_name ASC
    `, [course[0].id]);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance');

    sheet.mergeCells('A1:H1');
    sheet.getCell('A1').value = `${course[0].course_code} — ${course[0].course_name}`;
    sheet.getCell('A1').font = { bold: true, size: 14 };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:H2');
    sheet.getCell('A2').value = 'Course Attendance Report';
    sheet.getCell('A2').font = { bold: true, size: 11, color: { argb: 'FF666666' } };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.mergeCells('A3:H3');
    sheet.getCell('A3').value = `Semester: ${course[0].semester} | Instructor: ${course[0].instructor_name}`;
    sheet.getCell('A3').alignment = { horizontal: 'center' };

    sheet.addRow([]);
    sheet.addRow(['Student Name', 'Student No', 'Email', 'Session Date', 'Start Time', 'End Time', 'Marked At', 'Method']);
    sheet.getRow(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
    sheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    records.forEach(r => {
      sheet.addRow([
        r.full_name, r.student_number, r.email,
        new Date(r.session_date).toLocaleDateString('en-GB'),
        r.start_time, r.end_time,
        new Date(r.marked_at).toLocaleString('en-GB'), r.method
      ]);
    });

    sheet.columns = [
      { width: 25 }, { width: 15 }, { width: 28 },
      { width: 15 }, { width: 12 }, { width: 12 }, { width: 22 }, { width: 10 }
    ];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${course[0].course_code}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Excel error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to export Excel.' });
  }
};

const exportAttendancePDF = async (req, res) => {
  const { course_uuid } = req.params;
  try {
    const [course] = await pool.query(
      `SELECT c.id, c.course_code, c.course_name, c.semester, c.attendance_threshold,
              u.full_name as instructor_name
       FROM courses c LEFT JOIN users u ON c.instructor_id = u.id WHERE c.uuid = ?`,
      [course_uuid]
    );
    if (course.length === 0) return res.status(404).json({ success: false, message: 'Course not found.' });

    const [sessions] = await pool.query('SELECT COUNT(*) as total FROM class_sessions WHERE course_id = ?', [course[0].id]);

    const [students] = await pool.query(`
      SELECT u.full_name, u.student_number,
             COUNT(ar.id) as attended,
             ROUND((COUNT(ar.id) / NULLIF(?, 0)) * 100, 2) as percentage
      FROM users u
      JOIN course_enrollments ce ON u.id = ce.student_id
      LEFT JOIN class_sessions cs ON cs.course_id = ?
      LEFT JOIN attendance_records ar ON ar.student_id = u.id AND ar.session_id = cs.id
      WHERE ce.course_id = ?
      GROUP BY u.id, u.full_name, u.student_number ORDER BY u.full_name ASC
    `, [sessions[0].total, course[0].id, course[0].id]);

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${course[0].course_code}.pdf`);
    doc.pipe(res);

    // Logo
    const startY = await addLogoToPDF(doc);
    doc.y = startY;

    // Başlık
    doc.fontSize(18).font('Helvetica-Bold')
      .text(`${course[0].course_code} — ${course[0].course_name}`, { align: 'center' });
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#666666')
      .text('Course Attendance Report', { align: 'center' });
    doc.fontSize(11).font('Helvetica').fillColor('black')
      .text(`Semester: ${course[0].semester}`, { align: 'center' })
      .text(`Total Sessions: ${sessions[0].total} | Threshold: ${course[0].attendance_threshold}%`, { align: 'center' })
      .text(`Instructor: ${course[0].instructor_name}`, { align: 'center' })
      .text(`Generated: ${new Date().toLocaleString('en-GB')}`, { align: 'center' });
    doc.moveDown();

    doc.moveTo(40, doc.y).lineTo(570, doc.y).stroke();
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const col = { name: 40, no: 220, attended: 310, percentage: 390, status: 470 };

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Student Name', col.name, tableTop);
    doc.text('Student No', col.no, tableTop);
    doc.text('Attended', col.attended, tableTop);
    doc.text('Percentage', col.percentage, tableTop);
    doc.text('Status', col.status, tableTop);
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(570, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(9);
    students.forEach(s => {
      const y = doc.y;
      const status = s.percentage >= course[0].attendance_threshold ? 'OK' : 'At Risk';
     doc.fillColor('black')
  .text(s.full_name, col.name, y, { width: 170 });
      doc.fillColor('black')
        .text(s.student_number || '—', col.no, y)
        .text(`${s.attended} / ${sessions[0].total}`, col.attended, y)
        .text(`${s.percentage}%`, col.percentage, y);
      doc.fillColor(status === 'At Risk' ? '#cc0000' : '#008800')
        .text(status, col.status, y);
      doc.fillColor('black');
      doc.moveDown(0.6);
    });

    doc.end();
  } catch (error) {
    console.error('Export PDF error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to export PDF.' });
  }
};

const exportSessionAttendanceExcel = async (req, res) => {
  const { session_uuid } = req.params;
  try {
    const [session] = await pool.query(`
      SELECT cs.id, cs.session_date, cs.start_time, cs.end_time,
             c.course_code, c.course_name, c.semester
      FROM class_sessions cs JOIN courses c ON cs.course_id = c.id WHERE cs.uuid = ?
    `, [session_uuid]);
    if (session.length === 0) return res.status(404).json({ success: false, message: 'Session not found.' });

    const [records] = await pool.query(`
      SELECT u.full_name, u.student_number, u.email, ar.marked_at, ar.method
      FROM attendance_records ar JOIN users u ON ar.student_id = u.id
      WHERE ar.session_id = ? ORDER BY u.full_name ASC
    `, [session[0].id]);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Session Attendance');

    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = `${session[0].course_code} — ${session[0].course_name}`;
    sheet.getCell('A1').font = { bold: true, size: 14 };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = 'Course Attendance Report';
    sheet.getCell('A2').font = { bold: true, size: 11, color: { argb: 'FF666666' } };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.mergeCells('A3:F3');
    sheet.getCell('A3').value = `Session: ${new Date(session[0].session_date).toLocaleDateString('en-GB')} | ${session[0].start_time} - ${session[0].end_time}`;
    sheet.getCell('A3').alignment = { horizontal: 'center' };

    sheet.addRow([]);
    sheet.addRow(['Student Name', 'Student No', 'Email', 'Marked At', 'Method']);
    sheet.getRow(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
    sheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    records.forEach(r => {
      sheet.addRow([r.full_name, r.student_number, r.email, new Date(r.marked_at).toLocaleString('en-GB'), r.method]);
    });

    sheet.columns = [{ width: 25 }, { width: 15 }, { width: 28 }, { width: 22 }, { width: 10 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const safeDate = new Date(session[0].session_date).toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename=session_${session[0].course_code}_${safeDate}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export session Excel error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to export Excel.' });
  }
};

const exportSessionAttendancePDF = async (req, res) => {
  const { session_uuid } = req.params;
  try {
    const [session] = await pool.query(`
      SELECT cs.id, cs.session_date, cs.start_time, cs.end_time,
             c.course_code, c.course_name, c.semester, c.attendance_threshold,
             u.full_name as instructor_name
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      WHERE cs.uuid = ?
    `, [session_uuid]);
    if (session.length === 0) return res.status(404).json({ success: false, message: 'Session not found.' });

    const [records] = await pool.query(`
      SELECT u.full_name, u.student_number, u.email, ar.marked_at, ar.method
      FROM attendance_records ar JOIN users u ON ar.student_id = u.id
      WHERE ar.session_id = ? ORDER BY u.full_name ASC
    `, [session[0].id]);

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    const safeDate = new Date(session[0].session_date).toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename=session_${session[0].course_code}_${safeDate}.pdf`);
    doc.pipe(res);

    // Logo
    const startY = await addLogoToPDF(doc);
    doc.y = startY;

    // Başlık
    doc.fontSize(18).font('Helvetica-Bold')
      .text(`${session[0].course_code} — ${session[0].course_name}`, { align: 'center' });
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#666666')
      .text('Course Attendance Report', { align: 'center' });
    doc.fontSize(11).font('Helvetica').fillColor('black')
      .text(`Semester: ${session[0].semester}`, { align: 'center' })
      .text(`Session Date: ${new Date(session[0].session_date).toLocaleDateString('en-GB')} | Time: ${session[0].start_time} - ${session[0].end_time}`, { align: 'center' })
      .text(`Total Attended: ${records.length}`, { align: 'center' })
      .text(`Instructor: ${session[0].instructor_name}`, { align: 'center' })
      .text(`Generated: ${new Date().toLocaleString('en-GB')}`, { align: 'center' });
    doc.moveDown();

    doc.moveTo(40, doc.y).lineTo(570, doc.y).stroke();
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const col = { name: 40, no: 220, email: 310, marked: 430, method: 520 };

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Student Name', col.name, tableTop);
    doc.text('Student No', col.no, tableTop);
    doc.text('Email', col.email, tableTop);
    doc.text('Marked At', col.marked, tableTop);
    doc.text('Method', col.method, tableTop);
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(570, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(9);
    records.forEach(r => {
      const y = doc.y;
      doc.text(r.full_name, col.name, y, { width: 170 });
      doc.text(r.student_number || '—', col.no, y);
      doc.text(r.email, col.email, y, { width: 110 });
      doc.text(new Date(r.marked_at).toLocaleString('en-GB'), col.marked, y);
      doc.text(r.method, col.method, y);
      doc.moveDown(0.6);
    });

    doc.end();
  } catch (error) {
    console.error('Export session PDF error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to export PDF.' });
  }
};

module.exports = {
  exportAttendanceExcel,
  exportAttendancePDF,
  exportSessionAttendanceExcel,
  exportSessionAttendancePDF
};
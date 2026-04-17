const cron = require('node-cron');
const pool = require('../config/db');

const startSessionExpiryJob = () => {
  // Her dakika çalışır
  cron.schedule('* * * * *', async () => {
    try {
      // Süresi dolan ama henüz bildirim gönderilmemiş session'ları bul
      const [expiredSessions] = await pool.query(`
        SELECT cs.id, cs.course_id, c.course_code, c.course_name
        FROM class_sessions cs
        JOIN courses c ON cs.course_id = c.id
        WHERE cs.qr_expires_at < NOW()
        AND cs.is_active = true
        AND cs.expiry_notified = false
      `);

      for (const session of expiredSessions) {
        // Öğrencilere bildirim gönder
        const [students] = await pool.query(
          'SELECT student_id FROM course_enrollments WHERE course_id = ?',
          [session.course_id]
        );

        if (students.length > 0) {
          const notifications = students.map(s => [
            s.student_id,
            `${session.course_code} - ${session.course_name} attendance session has ended.`
          ]);
          await pool.query(
            'INSERT INTO notifications (user_id, message) VALUES ?',
            [notifications]
          );
        }

        // Session'ı güncelle
        await pool.query(
          'UPDATE class_sessions SET is_active = false, expiry_notified = true WHERE id = ?',
          [session.id]
        );
      }
    } catch (err) {
      console.error('Session expiry job error:', err.message);
    }
  });

  console.log('Session expiry job started.');
};

module.exports = { startSessionExpiryJob };
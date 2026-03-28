const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' }
});
app.use('/api/', limiter);

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const courseRoutes = require('./routes/courseRoutes');
app.use('/api/courses', courseRoutes);

const sessionRoutes = require('./routes/sessionRoutes');
app.use('/api/sessions', sessionRoutes);

const attendanceRoutes = require('./routes/attendanceRoutes');
app.use('/api/attendance', attendanceRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

const exportRoutes = require('./routes/exportRoutes');
app.use('/api/export', exportRoutes);

const timetableRoutes = require('./routes/timetableRoutes');
app.use('/api/timetable', timetableRoutes);

const settingsRoutes = require('./routes/settingsRoutes');
app.use('/api/settings', settingsRoutes);

const faceRoutes = require('./routes/faceRoutes');
app.use('/api/face', faceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running.' });
});



module.exports = app;
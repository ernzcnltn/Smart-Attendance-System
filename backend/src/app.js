const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Genel API limiti — IP başına 15 dakikada 300 istek
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});

// Auth limiti — brute force önleme, IP başına 15 dakikada 20 istek
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
});

// Face register/verify limiti — IP başına 15 dakikada 50 istek
const faceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many face requests. Please try again later.' }
});

const { startSessionExpiryJob } = require('./jobs/sessionExpiry');
startSessionExpiryJob();

app.use('/api/auth', authLimiter);
app.use('/api/face/register', faceLimiter);
app.use('/api/face/verify', faceLimiter);
app.use('/api/', generalLimiter);

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const passport = require('./config/passport');
app.use(passport.initialize());

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
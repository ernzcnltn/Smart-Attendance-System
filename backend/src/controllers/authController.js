const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const { generateUUID, generateToken, successResponse, errorResponse } = require('../utils/helpers');
const { sendWelcomeMail } = require('../utils/mailer');

const register = async (req, res) => {
  const { full_name, email, password, role, student_number } = req.body;

  if (!full_name || !email || !password || !role) {
    return errorResponse(res, 'All fields are required.', 400);
  }

  const allowedRoles = ['student', 'instructor', 'admin'];
  if (!allowedRoles.includes(role)) {
    return errorResponse(res, 'Invalid role.', 400);
  }

  if (role === 'student' && !student_number) {
    return errorResponse(res, 'Student number is required for students.', 400);
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return errorResponse(res, 'Email already in use.', 409);
    }

    const password_hash = await bcrypt.hash(password, 12);
    const uuid = generateUUID();

    await pool.query(
      'INSERT INTO users (uuid, full_name, email, password_hash, role, student_number) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid, full_name, email, password_hash, role, student_number || null]
    );

    return successResponse(res, { email, role }, 'User registered successfully.', 201);
  } catch (error) {
    console.error('Register error:', error.message);
    return errorResponse(res, 'Registration failed.');
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorResponse(res, 'Email and password are required.', 400);
  }

  if (email.length > 50 || password.length > 15) {
    return errorResponse(res, 'Invalid credentials.', 400);
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND is_active = true', [email]);
    if (rows.length === 0) {
      return errorResponse(res, 'Invalid credentials.', 401);
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, 'Invalid credentials.', 401);
    }

    const token = generateToken({
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      role: user.role
    });

    return successResponse(res, {
      token,
      user: {
        uuid: user.uuid,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        student_number: user.student_number
      }
    }, 'Login successful.');
  } catch (error) {
    console.error('Login error:', error.message);
    return errorResponse(res, 'Login failed.');
  }
};

const getMe = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT uuid, full_name, email, role, student_number, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return errorResponse(res, 'User not found.', 404);
    }
    return successResponse(res, rows[0]);
  } catch (error) {
    console.error('GetMe error:', error.message);
    return errorResponse(res, 'Failed to fetch user.');
  }
};

const searchStudents = async (req, res) => {
  const { query } = req.query;
  if (!query) return errorResponse(res, 'Search query is required.', 400);

  try {
    const [rows] = await pool.query(
      `SELECT uuid, full_name, email, student_number 
       FROM users 
       WHERE role = 'student' 
       AND (full_name LIKE ? OR student_number LIKE ? OR email LIKE ?)
       AND is_active = true
       LIMIT 10`,
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );
    return successResponse(res, rows);
  } catch (error) {
    console.error('Search students error:', error.message);
    return errorResponse(res, 'Failed to search students.');
  }
};

const completeGoogleRegistration = async (req, res) => {
  const { email, full_name, student_number } = req.body;

  if (!email || !full_name || !student_number) {
    return errorResponse(res, 'All fields are required.', 400);
  }

  const schoolDomain = process.env.SCHOOL_DOMAIN || 'final.edu.tr';
  if (!email.endsWith(`@${schoolDomain}`)) {
    return errorResponse(res, `Only ${schoolDomain} email addresses are allowed.`, 400);
  }

  try {
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return errorResponse(res, 'Email already registered.', 409);
    }

    const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase();
    const password_hash = await bcrypt.hash(tempPassword, 12);
    const uuid = generateUUID();

    await pool.query(
      'INSERT INTO users (uuid, full_name, email, password_hash, role, student_number) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid, full_name, email, password_hash, 'student', student_number]
    );

    await sendWelcomeMail(email, full_name, tempPassword);

    const [newUser] = await pool.query('SELECT id FROM users WHERE uuid = ?', [uuid]);
    const token = generateToken({
      id: newUser[0].id,
      uuid,
      email,
      role: 'student'
    });

    return successResponse(res, {
      token,
      user: { uuid, full_name, email, role: 'student', student_number }
    }, 'Registration completed successfully.');
  } catch (error) {
    console.error('Complete registration error:', error.message);
    return errorResponse(res, 'Registration failed.');
  }
};

const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return errorResponse(res, 'All fields are required.', 400);
  }

  if (new_password.length < 6 || new_password.length > 15) {
    return errorResponse(res, 'New password must be 6-15 characters.', 400);
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return errorResponse(res, 'User not found.', 404);

    const user = rows[0];
    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) return errorResponse(res, 'Current password is incorrect.', 400);

    const password_hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, req.user.id]);

    return successResponse(res, {}, 'Password changed successfully.');
  } catch (error) {
    console.error('Change password error:', error.message);
    return errorResponse(res, 'Failed to change password.');
  }
};

module.exports = { register, login, getMe, searchStudents, completeGoogleRegistration,changePassword };
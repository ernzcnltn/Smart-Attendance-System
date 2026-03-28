const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { generateUUID, generateToken, successResponse, errorResponse } = require('../utils/helpers');

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

module.exports = { register, login, getMe, searchStudents };
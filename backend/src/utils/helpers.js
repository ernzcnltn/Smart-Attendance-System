const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const generateUUID = () => uuidv4();

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

// code parametresi eklendi — frontend buna göre çeviri yapacak
const errorResponse = (res, message = 'Something went wrong', statusCode = 500, code = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code
  });
};

module.exports = {
  generateUUID,
  generateToken,
  verifyToken,
  successResponse,
  errorResponse
};
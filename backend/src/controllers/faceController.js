const pool = require('../config/db');
const axios = require('axios');
const { successResponse, errorResponse } = require('../utils/helpers');

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || 'http://localhost:5001';

const registerFace = async (req, res) => {
  const { image, challenge_id, step } = req.body;

  if (!image || !challenge_id) {
    return errorResponse(res, 'Image and challenge are required.', 400);
  }

  try {
    const response = await axios.post(`${FACE_SERVICE_URL}/register`, {
      student_uuid: req.user.uuid,
      image,
      challenge_id,
      step: step !== undefined ? step : 0
    });

    console.log('Python response:', response.data);

    const is_complete = response.data.is_complete;
    const next_step = response.data.next_step;

    console.log('is_complete:', is_complete, 'next_step:', next_step);

    if (is_complete) {
      await pool.query(
        'UPDATE users SET face_registered = true, face_registered_at = NOW() WHERE id = ?',
        [req.user.id]
      );
    }

    return res.status(200).json({
      success: true,
      message: response.data.message,
      data: {
        is_complete,
        next_step
      }
    });
  } catch (error) {
    console.error('Register face error:', error.message);
    if (error.response?.data) {
      return errorResponse(res, error.response.data.message, 400);
    }
    return errorResponse(res, 'Failed to register face.');
  }
};


const verifyFace = async (req, res) => {
  const { image, challenge_id } = req.body;

  if (!image || !challenge_id) {
    return errorResponse(res, 'Image and challenge are required.', 400);
  }

  try {
    const response = await axios.post(`${FACE_SERVICE_URL}/verify`, {
      student_uuid: req.user.uuid,
      image,
      challenge_id
    });

    if (!response.data.success) {
      return errorResponse(res, response.data.message, 400);
    }

    return successResponse(res, {
      verified: response.data.verified,
      distance: response.data.distance
    }, 'Face verified successfully.');
  } catch (error) {
    console.error('Verify face error:', error.message);
    if (error.response?.data) {
      return errorResponse(res, error.response.data.message, 400);
    }
    return errorResponse(res, 'Failed to verify face.');
  }
};

const getFaceStatus = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT face_registered, face_registered_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'User not found.', 404);
    }

    const { face_registered, face_registered_at } = rows[0];

    let needsUpdate = false;
    if (face_registered && face_registered_at) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      needsUpdate = new Date(face_registered_at) < sixMonthsAgo;
    }

    return successResponse(res, {
      face_registered: !!face_registered,
      face_registered_at,
      needs_update: needsUpdate
    });
  } catch (error) {
    console.error('Get face status error:', error.message);
    return errorResponse(res, 'Failed to get face status.');
  }
};

const resetFace = async (req, res) => {
  const { student_uuid } = req.body;

  if (!student_uuid) {
    return errorResponse(res, 'Student UUID is required.', 400);
  }

  try {
    await axios.post(`${FACE_SERVICE_URL}/delete`, { student_uuid });

    await pool.query(
      'UPDATE users SET face_registered = false, face_registered_at = NULL WHERE uuid = ?',
      [student_uuid]
    );

    return successResponse(res, {}, 'Face reset successfully.');
  } catch (error) {
    console.error('Reset face error:', error.message);
    return errorResponse(res, 'Failed to reset face.');
  }
};

const resetAllFaces = async (req, res) => {
  try {
    const [students] = await pool.query(
      'SELECT uuid FROM users WHERE role = "student"'
    );

    for (const student of students) {
      try {
        await axios.post(`${FACE_SERVICE_URL}/delete`, { student_uuid: student.uuid });
      } catch (err) {}
    }

    await pool.query(
      'UPDATE users SET face_registered = false, face_registered_at = NULL WHERE role = "student"'
    );

    return successResponse(res, { reset_count: students.length }, `${students.length} faces reset successfully.`);
  } catch (error) {
    console.error('Reset all faces error:', error.message);
    return errorResponse(res, 'Failed to reset all faces.');
  }
};



const getChallenge = async (req, res) => {
  const type = req.query.type || 'verification';
  const step = parseInt(req.query.step) || 0;

  const registrationChallenges = [
    { id: 'look_straight', instruction: 'Look straight at the camera' },
    { id: 'turn_left', instruction: 'Please turn your head to the left' },
    { id: 'turn_right', instruction: 'Please turn your head to the right' }
  ];

  const verificationChallenges = [
    { id: 'smile', instruction: 'Please smile at the camera' },
    { id: 'open_mouth', instruction: 'Please open your mouth' },
    { id: 'raise_eyebrows', instruction: 'Please raise your eyebrows' }
  ];

  let challenge;
  if (type === 'registration') {
    challenge = registrationChallenges[step % registrationChallenges.length];
  } else {
    challenge = verificationChallenges[Math.floor(Math.random() * verificationChallenges.length)];
  }

  return successResponse(res, { challenge });
};
const checkChallenge = async (req, res) => {
  const { image, challenge_id } = req.body;
  if (!image || !challenge_id) {
    return errorResponse(res, 'Image and challenge_id are required.', 400);
  }
  try {
    const response = await axios.post(`${FACE_SERVICE_URL}/check-challenge`, {
      image,
      challenge_id
    });
    return res.status(200).json({
      success: true,
      detected: response.data.detected
    });
  } catch (error) {
    return res.status(200).json({ success: false, detected: false });
  }
};

module.exports = {
  registerFace,
  verifyFace,
  getFaceStatus,
  resetFace,
  resetAllFaces,
  getChallenge,
  checkChallenge
};
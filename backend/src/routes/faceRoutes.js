const express = require('express');
const router = express.Router();
const {
  registerFace,
  verifyFace,
  getFaceStatus,
  resetFace,
  resetAllFaces,
  getChallenge,
  checkChallenge
} = require('../controllers/faceController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.post('/register', authorize('student'), registerFace);
router.post('/verify', authorize('student'), verifyFace);
router.get('/status', authorize('student'), getFaceStatus);
router.post('/reset', authorize('admin'), resetFace);
router.post('/reset-all', authorize('admin'), resetAllFaces);
router.get('/challenge', getChallenge);
router.post('/check-challenge', authorize('student'), checkChallenge);

module.exports = router;
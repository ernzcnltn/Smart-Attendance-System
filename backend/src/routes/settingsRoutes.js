const express = require('express');
const router = express.Router();
const { getSettings, updateSetting, getPublicSettings } = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

// Public route 
router.get('/public', getPublicSettings);

// Admin routes
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getSettings);
router.patch('/:key', updateSetting);

module.exports = router;
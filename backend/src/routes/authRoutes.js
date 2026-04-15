const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { login, getMe, searchStudents, googleCallback, completeGoogleRegistration,changePassword } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/students/search', authenticate, authorize('instructor', 'admin'), searchStudents);
router.post('/google/complete', completeGoogleRegistration);
router.post('/change-password', authenticate, changePassword);

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
}));

router.get('/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_failed`);

      if (!user && info?.message === 'new_user') {
        return res.redirect(`${process.env.FRONTEND_URL}/auth/complete-registration?email=${info.email}&name=${encodeURIComponent(info.full_name)}`);
      }

      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(info?.message || 'google_failed')}`);
      }

      const token = require('../utils/helpers').generateToken({
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        role: user.role
      });

      return res.redirect(`${process.env.FRONTEND_URL}/auth/google/success?token=${token}`);
    })(req, res, next);
  }
);

module.exports = router;
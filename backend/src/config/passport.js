const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');
const { generateUUID } = require('../utils/helpers');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
callbackURL: 'http://localhost:5000/api/auth/google/callback'}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const schoolDomain = process.env.SCHOOL_DOMAIN || 'final.edu.tr';

    if (!email.endsWith(`@${schoolDomain}`)) {
      return done(null, false, { message: `Only ${schoolDomain} email addresses are allowed.` });
    }

    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (existing.length > 0) {
      return done(null, existing[0]);
    }

    return done(null, false, { message: 'new_user', email, full_name: profile.displayName });
  } catch (error) {
    return done(error);
  }
}));

module.exports = passport;
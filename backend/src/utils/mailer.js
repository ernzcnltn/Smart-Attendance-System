const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendMail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Smart Attendance System" <${process.env.SMTP_FROM}>`,
    to,
    subject,
    html
  });
};

const sendWelcomeMail = async (email, fullName, tempPassword) => {
  await sendMail({
    to: email,
    subject: 'Welcome to Smart Attendance System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #c0392b; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Smart Attendance System</h2>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">Final International University</p>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h3>Welcome, ${fullName}!</h3>
          <p>Your account has been created successfully. You can now login with your school email and the temporary password below:</p>
          <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; color: #666; font-size: 14px;">Temporary Password</p>
            <h2 style="margin: 10px 0; color: #c0392b; letter-spacing: 2px;">${tempPassword}</h2>
          </div>
          <p style="color: #666; font-size: 14px;">Please change your password after first login from your profile page.</p>
          <p style="color: #666; font-size: 14px;">You can also login with your Google account anytime.</p>
        </div>
      </div>
    `
  });
};

const sendPasswordResetMail = async (email, fullName, resetLink) => {
  await sendMail({
    to: email,
    subject: 'Password Reset Request - Smart Attendance System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #c0392b; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Smart Attendance System</h2>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">Final International University</p>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h3>Hello, ${fullName}!</h3>
          <p>We received a request to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #c0392b; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 13px;">This link will expire in <strong>1 hour</strong>.</p>
          <p style="color: #666; font-size: 13px;">If you did not request a password reset, please ignore this email.</p>
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px; margin-top: 16px;">
            <p style="margin: 0; font-size: 12px; color: #856404;">
              ⚠ For security, never share this link with anyone.
            </p>
          </div>
        </div>
        <div style="padding: 16px; text-align: center; background: #eee;">
          <p style="margin: 0; font-size: 12px; color: #999;">© ${new Date().getFullYear()} Final International University</p>
        </div>
      </div>
    `
  });
};

module.exports = { sendMail, sendWelcomeMail, sendPasswordResetMail };
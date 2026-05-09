import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EyeFill, EyeSlashFill, PersonFill, LockFill } from 'react-bootstrap-icons';
import { login } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import ForgotPasswordModal from './ForgotPasswordModal';

/* ───────────── Desktop SVG Illustration ───────────── */
const AttendanceIllustration = () => (
  <svg viewBox="0 0 440 380" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: '400px', height: 'auto', filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.12))' }}>
    <rect x="70" y="50" width="300" height="240" rx="16" fill="#fff" />
    <rect x="70" y="50" width="300" height="52" rx="16" fill="#b71c1c" />
    <rect x="70" y="80" width="300" height="22" fill="#b71c1c" />
    <rect x="130" y="42" width="8" height="20" rx="4" fill="#d32f2f" />
    <rect x="200" y="42" width="8" height="20" rx="4" fill="#d32f2f" />
    <rect x="270" y="42" width="8" height="20" rx="4" fill="#d32f2f" />
    <rect x="340" y="42" width="8" height="20" rx="4" fill="#d32f2f" />
    <text x="220" y="90" textAnchor="middle" fill="#fff" fontSize="17" fontWeight="700" fontFamily="Poppins, sans-serif">April 2026</text>
    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => (
      <text key={d} x={102 + i * 40} y="126" textAnchor="middle" fill="#999" fontSize="9.5" fontWeight="600" fontFamily="Poppins, sans-serif">{d}</text>
    ))}
    {[[null,null,'1','2','3','4','5'],['6','7','8','9','10','11','12'],['13','14','15','16','17','18','19'],['20','21','22','23','24','25','26']].map((week, wi) =>
      week.map((day, di) => {
        if (!day) return null;
        const cx = 102 + di * 40, cy = 150 + wi * 34;
        const isToday = day === '17';
        const isPresent = ['1','2','3','7','8','9','10','14','15','16','17'].includes(day);
        return (
          <g key={`${wi}-${di}`}>
            {isToday && <circle cx={cx} cy={cy} r="14" fill="#b71c1c" />}
            {isPresent && !isToday && <circle cx={cx} cy={cy} r="14" fill="rgba(183,28,28,0.08)" />}
            <text x={cx} y={cy + 4} textAnchor="middle" fill={isToday ? '#fff' : isPresent ? '#b71c1c' : '#666'} fontSize="11.5" fontWeight={isToday || isPresent ? '600' : '400'} fontFamily="Poppins, sans-serif">{day}</text>
          </g>
        );
      })
    )}
    <g transform="translate(345, 295)"><rect width="50" height="50" rx="10" fill="#fff" filter="url(#iconShadow)" /><rect x="10" y="10" width="12" height="12" rx="2" fill="#b71c1c" /><rect x="28" y="10" width="12" height="12" rx="2" fill="#b71c1c" /><rect x="10" y="28" width="12" height="12" rx="2" fill="#b71c1c" /><rect x="28" y="28" width="5" height="5" rx="1" fill="#b71c1c" /><rect x="35" y="28" width="5" height="5" rx="1" fill="#b71c1c" /><rect x="28" y="35" width="5" height="5" rx="1" fill="#b71c1c" /></g>
    <g transform="translate(45, 295)"><rect width="50" height="50" rx="10" fill="#fff" filter="url(#iconShadow)" /><ellipse cx="25" cy="23" rx="10" ry="12" stroke="#b71c1c" strokeWidth="1.8" fill="none" /><circle cx="21" cy="21" r="1.5" fill="#b71c1c" /><circle cx="29" cy="21" r="1.5" fill="#b71c1c" /><path d="M21 27 Q25 31 29 27" stroke="#b71c1c" strokeWidth="1.3" fill="none" strokeLinecap="round" /><path d="M10 15 L10 10 L15 10" stroke="#b71c1c" strokeWidth="1.8" fill="none" strokeLinecap="round" /><path d="M40 15 L40 10 L35 10" stroke="#b71c1c" strokeWidth="1.8" fill="none" strokeLinecap="round" /><path d="M10 35 L10 40 L15 40" stroke="#b71c1c" strokeWidth="1.8" fill="none" strokeLinecap="round" /><path d="M40 35 L40 40 L35 40" stroke="#b71c1c" strokeWidth="1.8" fill="none" strokeLinecap="round" /></g>
    <g transform="translate(52, 18)"><path d="M10 0C4.5 0 0 4.5 0 10c0 7.5 10 17 10 17s10-9.5 10-17C20 4.5 15.5 0 10 0z" fill="#d32f2f" /><circle cx="10" cy="10" r="4" fill="#fff" /></g>
    <g transform="translate(375, 45)"><circle cx="16" cy="16" r="16" fill="#43a047" /><path d="M9 16 L14 21 L23 11" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>
    <g transform="translate(170, 305)"><circle cx="12" cy="7" r="7" fill="#ef5350" opacity="0.7" /><path d="M0 28 Q0 16 12 14 Q24 16 24 28" fill="#ef5350" opacity="0.5" /></g>
    <g transform="translate(210, 310)"><circle cx="10" cy="6" r="6" fill="#b71c1c" opacity="0.5" /><path d="M0 24 Q0 14 10 12 Q20 14 20 24" fill="#b71c1c" opacity="0.35" /></g>
    <g transform="translate(245, 307)"><circle cx="11" cy="7" r="7" fill="#d32f2f" opacity="0.6" /><path d="M0 26 Q0 15 11 13 Q22 15 22 26" fill="#d32f2f" opacity="0.4" /></g>
    <defs><filter id="iconShadow" x="-4" y="-2" width="58" height="58"><feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.1" /></filter></defs>
  </svg>
);

/* ── Compact mobile illustration ── */
const MiniIllustration = () => (
  <svg viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '170px', height: 'auto', opacity: 0.9 }}>
    <rect x="0" y="5" width="55" height="50" rx="8" fill="#fff" opacity="0.9" />
    <rect x="0" y="5" width="55" height="16" rx="8" fill="rgba(255,255,255,0.3)" />
    <rect x="0" y="15" width="55" height="6" fill="rgba(255,255,255,0.3)" />
    <text x="27.5" y="17" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Poppins">APR</text>
    <text x="27.5" y="42" textAnchor="middle" fill="#b71c1c" fontSize="18" fontWeight="800" fontFamily="Poppins">17</text>
    <g transform="translate(72, 8)"><rect width="44" height="44" rx="8" fill="#fff" opacity="0.9" /><ellipse cx="22" cy="20" rx="9" ry="10" stroke="#b71c1c" strokeWidth="1.5" fill="none" /><circle cx="18" cy="18" r="1.2" fill="#b71c1c" /><circle cx="26" cy="18" r="1.2" fill="#b71c1c" /><path d="M18 24 Q22 27 26 24" stroke="#b71c1c" strokeWidth="1" fill="none" strokeLinecap="round" /><path d="M8 12 L8 8 L12 8" stroke="#b71c1c" strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d="M36 12 L36 8 L32 8" stroke="#b71c1c" strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d="M8 30 L8 34 L12 34" stroke="#b71c1c" strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d="M36 30 L36 34 L32 34" stroke="#b71c1c" strokeWidth="1.2" fill="none" strokeLinecap="round" /></g>
    <g transform="translate(132, 8)"><rect width="44" height="44" rx="8" fill="#fff" opacity="0.9" /><rect x="9" y="9" width="10" height="10" rx="2" fill="#b71c1c" /><rect x="25" y="9" width="10" height="10" rx="2" fill="#b71c1c" /><rect x="9" y="25" width="10" height="10" rx="2" fill="#b71c1c" /><rect x="25" y="25" width="4" height="4" rx="1" fill="#b71c1c" /><rect x="31" y="25" width="4" height="4" rx="1" fill="#b71c1c" /><rect x="25" y="31" width="4" height="4" rx="1" fill="#b71c1c" /></g>
  </svg>
);

/* ───────────────── Component ───────────────── */
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'google_failed') setError('Google sign in failed. Please try again.');
    else if (err) setError(decodeURIComponent(err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      updateUser(user);
      if (user.role === 'student') navigate('/student');
      else if (user.role === 'instructor') navigate('/instructor');
      else navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: 'Poppins', 'Segoe UI', sans-serif; background: linear-gradient(160deg, #fafafa 0%, #f5f5f5 35%, #ffebee 55%, #ffcdd2 72%, #ef9a9a 85%, #e53935 100%); padding: 24px; position: relative; overflow: hidden; }
        .login-page::before { content: ''; position: absolute; width: 500px; height: 500px; border-radius: 50%; background: radial-gradient(circle, rgba(229,57,53,0.10) 0%, transparent 70%); top: -100px; right: -100px; pointer-events: none; }
        .login-page::after { content: ''; position: absolute; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, rgba(183,28,28,0.06) 0%, transparent 70%); bottom: -80px; left: -80px; pointer-events: none; }
        .login-card { display: flex; width: 100%; max-width: 1020px; background: rgba(255,255,255,0.75); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 28px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 20px 60px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; position: relative; z-index: 1; }
        .login-left { flex: 1 1 50%; background: linear-gradient(145deg, #c62828 0%, #d32f2f 40%, #e53935 80%, #ef5350 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 36px; position: relative; overflow: hidden; }
        .login-left::before { content: ''; position: absolute; width: 300px; height: 300px; border-radius: 50%; background: rgba(255,255,255,0.06); top: -60px; left: -80px; }
        .login-left::after { content: ''; position: absolute; width: 200px; height: 200px; border-radius: 50%; background: rgba(255,255,255,0.04); bottom: 30px; right: -50px; }
        .login-left h2 { font-size: clamp(22px, 2.2vw, 30px); font-weight: 800; color: #fff; line-height: 1.2; text-align: center; margin-top: 28px; margin-bottom: 10px; position: relative; z-index: 1; }
        .login-left p { font-size: 13px; color: rgba(255,255,255,0.8); text-align: center; max-width: 340px; line-height: 1.6; position: relative; z-index: 1; }
        .login-mobile-header { display: none; }
        .login-right { flex: 1 1 50%; display: flex; align-items: center; justify-content: center; padding: 48px 44px; background: transparent; }
        .login-form-wrap { width: 100%; max-width: 360px; }
        .login-form-wrap .form-control { background: rgba(255,255,255,0.85) !important; border: 1.5px solid #e0e0e0 !important; color: #222 !important; font-size: 14px; padding: 11px 14px; transition: border-color 0.2s, box-shadow 0.2s; }
        .login-form-wrap .form-control:focus { border-color: #c62828 !important; box-shadow: 0 0 0 3px rgba(198,40,40,0.10) !important; background: #fff !important; }
        .login-form-wrap .form-control::placeholder { color: #bbb !important; }
        .login-form-wrap .input-group-text { background: rgba(255,255,255,0.85) !important; border: 1.5px solid #e0e0e0 !important; color: #aaa; transition: border-color 0.2s; }
        .login-form-wrap .input-group-text.focused { border-color: #c62828 !important; }
        .login-form-wrap .form-label { font-size: 13px; font-weight: 600; color: #444; margin-bottom: 6px; }
        .login-submit { background: linear-gradient(135deg, #b71c1c 0%, #d32f2f 50%, #e53935 100%) !important; border: none !important; border-radius: 12px !important; padding: 12px !important; font-weight: 700 !important; font-size: 15px !important; letter-spacing: 0.3px; box-shadow: 0 4px 18px rgba(183,28,28,0.30); transition: transform 0.15s, box-shadow 0.15s !important; }
        .login-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(183,28,28,0.40) !important; }
        .login-submit:active:not(:disabled) { transform: translateY(0); }
        .login-divider { display: flex; align-items: center; margin: 16px 0; }
        .login-divider::before, .login-divider::after { content: ''; flex: 1; height: 1px; background: #e0e0e0; }
        .login-divider span { padding: 0 14px; font-size: 12px; color: #aaa; font-weight: 500; white-space: nowrap; }
        .login-footer { margin-top: 20px; text-align: center; font-size: 11.5px; color: #bbb; }
        .eye-toggle { background: rgba(255,255,255,0.85) !important; border: 1.5px solid #e0e0e0 !important; border-left: none !important; transition: border-color 0.2s; }
        .eye-toggle.focused { border-color: #c62828 !important; }
        .forgot-link { color: #c62828; font-size: 12px; padding: 0; text-decoration: none; background: none; border: none; cursor: pointer; }
        .forgot-link:hover { color: #b71c1c; text-decoration: underline; }
        .google-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; background: #fff !important; border: 1.5px solid #e0e0e0 !important; border-radius: 10px !important; padding: 10px 16px !important; font-size: 14px !important; font-weight: 500 !important; color: #444 !important; transition: border-color 0.2s, box-shadow 0.2s !important; }
        .google-btn:hover { border-color: #c62828 !important; box-shadow: 0 0 0 3px rgba(198,40,40,0.08) !important; color: #222 !important; }
        [data-bs-theme="dark"] .login-page, [data-bs-theme="dark"] .login-page * { color-scheme: light; }
        [data-bs-theme="dark"] .login-form-wrap .form-control { background: rgba(255,255,255,0.9) !important; color: #222 !important; border-color: #ddd !important; }
        [data-bs-theme="dark"] .login-form-wrap .form-control:focus { background: #fff !important; border-color: #c62828 !important; }
        [data-bs-theme="dark"] .login-form-wrap .input-group-text { background: rgba(255,255,255,0.9) !important; border-color: #ddd !important; }
        [data-bs-theme="dark"] .login-form-wrap .form-label { color: #444 !important; }
        [data-bs-theme="dark"] .login-card { background: rgba(255,255,255,0.8); }
        [data-bs-theme="dark"] .login-form-wrap .alert-danger { background: #ffebee !important; color: #b71c1c !important; border-color: #ffcdd2 !important; }
        @media (max-width: 768px) {
          .login-page { padding: 0; margin: 0; background: #fff; align-items: stretch; justify-content: stretch; }
          .login-page::before, .login-page::after { display: none; }
          .login-card { flex-direction: column; width: 100%; max-width: 100%; min-height: 100vh; border-radius: 0; border: none; box-shadow: none; background: #fff; backdrop-filter: none; -webkit-backdrop-filter: none; }
          .login-left { display: none !important; }
          .login-mobile-header { display: flex; flex-direction: column; align-items: center; background: linear-gradient(145deg, #c62828 0%, #d32f2f 40%, #e53935 80%, #ef5350 100%); padding: 36px 20px 30px; position: relative; overflow: hidden; flex-shrink: 0; }
          .login-mobile-header::before { content: ''; position: absolute; width: 200px; height: 200px; border-radius: 50%; background: rgba(255,255,255,0.06); top: -50px; left: -50px; }
          .login-mobile-header::after { content: ''; position: absolute; width: 140px; height: 140px; border-radius: 50%; background: rgba(255,255,255,0.04); bottom: -30px; right: -30px; }
          .login-mobile-header h4 { font-size: 19px; font-weight: 700; color: #fff; margin-top: 14px; margin-bottom: 2px; text-align: center; position: relative; z-index: 1; }
          .login-mobile-header p { font-size: 12px; color: rgba(255,255,255,0.75); margin: 0; text-align: center; position: relative; z-index: 1; }
          .login-right { flex: 1; padding: 28px 28px 24px; align-items: flex-start; justify-content: flex-start; }
          .login-form-wrap { max-width: 100%; }
          .login-form-wrap h3 { font-size: 22px !important; }
          .login-footer { margin-top: 16px; }
          .login-divider { margin: 14px 0; }
        }
        @media (max-width: 380px) {
          .login-mobile-header { padding: 28px 16px 24px; }
          .login-mobile-header h4 { font-size: 17px; }
          .login-right { padding: 22px 20px 18px; }
        }
      `}</style>

      <div className="login-page">
        <div className="login-card">
          <div className="login-left">
            <AttendanceIllustration />
            <h2>Smart Attendance<br />Management System</h2>
            <p>Track attendance seamlessly with QR codes, facial recognition, and real-time analytics — all in one place.</p>
          </div>

          <div className="login-mobile-header">
            <MiniIllustration />
            <h4>Smart Attendance System</h4>
            <p>Final International University</p>
          </div>

          <div className="login-right">
            <div className="login-form-wrap">
              <div className="text-center mb-1">
                <img src="/logo.png" alt="FIU Logo" style={{ height: '52px', objectFit: 'contain' }} />
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a2e', textAlign: 'center', marginBottom: '2px' }}>Welcome Back</h3>
              <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', marginBottom: '20px' }}>Sign in to continue to your dashboard</p>

              {error && <Alert variant="danger" className="py-2 small" style={{ borderRadius: '10px', fontSize: '13px' }}>{error}</Alert>}

              {/* Google Sign In Button */}
              <Button
                className="google-btn mb-2"
                onClick={() => { window.location.href = `${process.env.REACT_APP_API_URL}/auth/google`; }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                Sign in with Google
              </Button>

              <div className="login-divider"><span>or sign in with email</span></div>

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <InputGroup>
                    <InputGroup.Text className={emailFocused ? 'focused' : ''} style={{ borderRadius: '10px 0 0 10px', borderRight: 'none' }}>
                      <PersonFill size={15} color={emailFocused ? '#c62828' : '#aaa'} />
                    </InputGroup.Text>
                    <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} placeholder="you@fiu.edu.tr" maxLength={50} minLength={5} required style={{ borderRadius: '0 10px 10px 0', borderLeft: 'none' }} />
                  </InputGroup>
                </Form.Group>

                <Form.Group className="mb-1">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Form.Label className="mb-0">Password</Form.Label>
                    <button type="button" className="forgot-link" onClick={() => setShowForgot(true)}>
                      Forgot password?
                    </button>
                  </div>
                  <InputGroup>
                    <InputGroup.Text className={passFocused ? 'focused' : ''} style={{ borderRadius: '10px 0 0 10px', borderRight: 'none' }}>
                      <LockFill size={14} color={passFocused ? '#c62828' : '#aaa'} />
                    </InputGroup.Text>
                    <Form.Control type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setPassFocused(true)} onBlur={() => setPassFocused(false)} placeholder="••••••••" maxLength={15} minLength={6} required style={{ borderRadius: '0', borderLeft: 'none', borderRight: 'none' }} />
                    <Button variant="link" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} className={`eye-toggle ${passFocused ? 'focused' : ''}`} style={{ borderRadius: '0 10px 10px 0', textDecoration: 'none' }}>
                      {showPassword ? <EyeSlashFill size={15} color={passFocused ? '#c62828' : '#888'} /> : <EyeFill size={15} color={passFocused ? '#c62828' : '#888'} />}
                    </Button>
                  </InputGroup>
                </Form.Group>

                <div className="mb-4" />

                <Button type="submit" className="w-100 login-submit" disabled={loading}>
                  {loading ? (<><Spinner size="sm" className="me-2" />Signing in...</>) : 'Sign In'}
                </Button>
              </Form>

              <div className="login-footer">Final International University &copy; {new Date().getFullYear()}</div>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal show={showForgot} onHide={() => setShowForgot(false)} />
    </>
  );
};

export default Login;
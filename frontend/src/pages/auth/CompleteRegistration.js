import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import api from '../../services/api';
import { setToken, setUser } from '../../utils/helpers';

const CompleteRegistration = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useAuth();
  const { t } = useTranslation();
  const { branding } = useBranding();
  const [studentNumber, setStudentNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const logoSrc = branding.school_logo || '/logo.png';
  const universityName = branding.university_name || 'Final International University';
  const email = searchParams.get('email');
  const fullName = searchParams.get('name');

  useEffect(() => {
    if (!email || !fullName) navigate('/login');
  }, [email, fullName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/google/complete', {
        email, full_name: fullName, student_number: studentNumber
      });
      const { token, user } = response.data.data;
      setToken(token); setUser(user); updateUser(user);
      navigate('/student');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        .complete-reg-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: 'Poppins', 'Segoe UI', sans-serif; background: linear-gradient(160deg, #fafafa 0%, #f5f5f5 35%, #ffebee 55%, #ffcdd2 72%, #ef9a9a 85%, #e53935 100%); padding: 24px; position: relative; overflow: hidden; }
        .complete-reg-page::before { content: ''; position: absolute; width: 500px; height: 500px; border-radius: 50%; background: radial-gradient(circle, rgba(229,57,53,0.10) 0%, transparent 70%); top: -100px; right: -100px; pointer-events: none; }
        .complete-reg-card { width: 100%; max-width: 440px; background: rgba(255,255,255,0.75); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 28px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 20px 60px rgba(0,0,0,0.08); padding: 44px 40px; position: relative; z-index: 1; }
        .complete-reg-card .form-control { background: rgba(255,255,255,0.85) !important; border: 1.5px solid #e0e0e0 !important; color: #222 !important; font-size: 14px; padding: 11px 14px; border-radius: 10px; transition: border-color 0.2s, box-shadow 0.2s; }
        .complete-reg-card .form-control:focus { border-color: #c62828 !important; box-shadow: 0 0 0 3px rgba(198,40,40,0.10) !important; background: #fff !important; }
        .complete-reg-card .form-label { font-size: 13px; font-weight: 600; color: #444; margin-bottom: 6px; }
        .complete-reg-submit { background: linear-gradient(135deg, #b71c1c 0%, #d32f2f 50%, #e53935 100%) !important; border: none !important; border-radius: 12px !important; padding: 12px !important; font-weight: 700 !important; font-size: 15px !important; box-shadow: 0 4px 18px rgba(183,28,28,0.30); transition: transform 0.15s, box-shadow 0.15s !important; }
        .complete-reg-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(183,28,28,0.40) !important; }
        .info-box { background: rgba(198,40,40,0.06); border: 1px solid rgba(198,40,40,0.15); border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; }
        .info-box .info-label { font-size: 11px; color: #999; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
        .info-box .info-value { font-size: 14px; color: #222; font-weight: 600; }
        @media (max-width: 480px) { .complete-reg-card { padding: 32px 24px; border-radius: 20px; } }
      `}</style>

      <div className="complete-reg-page">
        <div className="complete-reg-card">
          <div className="text-center mb-4">
            <img src={logoSrc} alt="Logo" style={{ height: '52px', objectFit: 'contain' }} />
            <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a2e', marginTop: '12px', marginBottom: '4px' }}>
              {t('completeRegistration.title')}
            </h3>
            <p style={{ fontSize: '13px', color: '#999', marginBottom: '0' }}>
              {universityName}
            </p>
          </div>

          {error && (
            <Alert variant="danger" className="py-2 small" style={{ borderRadius: '10px', fontSize: '13px' }}>
              {error}
            </Alert>
          )}

          <div className="info-box">
            <div className="mb-2">
              <div className="info-label">{t('profile.fullName')}</div>
              <div className="info-value">{fullName}</div>
            </div>
            <div>
              <div className="info-label">{t('profile.email')}</div>
              <div className="info-value">{email}</div>
            </div>
          </div>

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-4">
              <Form.Label>{t('profile.studentNumber')}</Form.Label>
              <Form.Control
                type="text"
                value={studentNumber}
                onChange={e => setStudentNumber(e.target.value)}
                placeholder="Enter your student number"
                maxLength={20}
                required
              />
            </Form.Group>
            <Button type="submit" className="w-100 complete-reg-submit" disabled={loading}>
              {loading ? <><Spinner size="sm" className="me-2" />{t('common.loading')}</> : t('completeRegistration.button')}
            </Button>
          </Form>

          <p className="text-center mt-3" style={{ fontSize: '12px', color: '#bbb' }}>
            {t('completeRegistration.tempPassword')}
          </p>

          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11.5px', color: '#bbb' }}>
            {universityName} &copy; {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </>
  );
};

export default CompleteRegistration;
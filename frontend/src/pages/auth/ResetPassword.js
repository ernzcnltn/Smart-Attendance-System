import React, { useState, useMemo } from 'react';
import { Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LockFill, EyeFill, EyeSlashFill, CheckCircleFill, XCircleFill } from 'react-bootstrap-icons';
import api from '../../services/api';

const ResetPassword = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const passwordRules = [
    { label: t('resetPassword.rules.minLength'), test: (p) => p.length >= 6 },
    { label: t('resetPassword.rules.maxLength'), test: (p) => p.length <= 15 },
    { label: t('resetPassword.rules.uppercase'), test: (p) => /[A-Z]/.test(p) },
    { label: t('resetPassword.rules.number'),    test: (p) => /[0-9]/.test(p) },
  ];

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const allRulesPassed = useMemo(() => passwordRules.every(r => r.test(newPassword)), [newPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!allRulesPassed) { setError('Please meet all password requirements.'); return; }
    if (newPassword !== confirmPassword) { setError(t('resetPassword.noMatch')); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: newPassword });
      setSuccess(t('resetPassword.success'));
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <Alert variant="danger">{t('resetPassword.invalidLink')}</Alert>
          <Button variant="danger" className="w-100" onClick={() => navigate('/login')}>{t('resetPassword.backToLogin')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <style>{`
        .rp-input { background: rgba(255,255,255,0.85) !important; border: 1.5px solid #e0e0e0 !important; color: #222 !important; font-size: 14px; }
        .rp-input:focus { border-color: #c62828 !important; box-shadow: 0 0 0 3px rgba(198,40,40,0.10) !important; background: #fff !important; }
        .rp-icon { background: rgba(255,255,255,0.85) !important; border: 1.5px solid #e0e0e0 !important; color: #aaa; }
        .rp-eye { background: rgba(255,255,255,0.85) !important; border: 1.5px solid #e0e0e0 !important; border-left: none !important; }
        .rp-btn { background: linear-gradient(135deg, #b71c1c 0%, #d32f2f 50%, #e53935 100%) !important; border: none !important; border-radius: 12px !important; padding: 12px !important; font-weight: 700 !important; }
        .rp-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(183,28,28,0.40) !important; }
        .rp-btn:disabled { opacity: 0.6; }
      `}</style>

      <div style={cardStyle}>
        <div style={{ background: 'linear-gradient(135deg, #c62828, #e53935)', borderRadius: '16px 16px 0 0', padding: '28px 24px', textAlign: 'center', margin: '-32px -32px 28px' }}>
          <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <LockFill size={24} color="white" />
          </div>
          <h5 style={{ color: '#fff', fontWeight: 700, margin: 0 }}>{t('resetPassword.title')}</h5>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', margin: '4px 0 0' }}>{t('resetPassword.description')}</p>
        </div>

        {error && <Alert variant="danger" className="py-2" style={{ borderRadius: '10px', fontSize: '13px' }}>{error}</Alert>}
        {success && <Alert variant="success" className="py-2" style={{ borderRadius: '10px', fontSize: '13px' }}>{success}</Alert>}

        {!success && (
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>{t('resetPassword.newPassword')}</Form.Label>
              <InputGroup>
                <InputGroup.Text className="rp-icon" style={{ borderRadius: '10px 0 0 10px', borderRight: 'none' }}>
                  <LockFill size={14} color="#aaa" />
                </InputGroup.Text>
                <Form.Control
                  type={showPass ? 'text' : 'password'}
                  className="rp-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none' }}
                />
                <Button variant="link" onClick={() => setShowPass(!showPass)} tabIndex={-1} className="rp-eye" style={{ borderRadius: '0 10px 10px 0', textDecoration: 'none' }}>
                  {showPass ? <EyeSlashFill size={14} color="#888" /> : <EyeFill size={14} color="#888" />}
                </Button>
              </InputGroup>
              {newPassword && (
                <div style={{ marginTop: '8px', padding: '10px 14px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                  {passwordRules.map((rule, i) => {
                    const ok = rule.test(newPassword);
                    return (
                      <div key={i} className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: '12px' }}>
                        {ok ? <CheckCircleFill size={12} color="#16a34a" /> : <XCircleFill size={12} color="#dc2626" />}
                        <span style={{ color: ok ? '#16a34a' : '#dc2626' }}>{rule.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>{t('resetPassword.confirmPassword')}</Form.Label>
              <InputGroup>
                <InputGroup.Text className="rp-icon" style={{ borderRadius: '10px 0 0 10px', borderRight: 'none' }}>
                  <LockFill size={14} color="#aaa" />
                </InputGroup.Text>
                <Form.Control
                  type={showConfirm ? 'text' : 'password'}
                  className="rp-input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none' }}
                />
                <Button variant="link" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1} className="rp-eye" style={{ borderRadius: '0 10px 10px 0', textDecoration: 'none' }}>
                  {showConfirm ? <EyeSlashFill size={14} color="#888" /> : <EyeFill size={14} color="#888" />}
                </Button>
              </InputGroup>
              {confirmPassword && newPassword !== confirmPassword && (
                <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: '12px', color: '#dc2626' }}>
                  <XCircleFill size={12} /> {t('resetPassword.noMatch')}
                </div>
              )}
              {confirmPassword && newPassword === confirmPassword && allRulesPassed && (
                <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: '12px', color: '#16a34a' }}>
                  <CheckCircleFill size={12} /> {t('resetPassword.match')}
                </div>
              )}
            </Form.Group>

            <Button type="submit" className="w-100 rp-btn" disabled={loading || !allRulesPassed || newPassword !== confirmPassword}>
              {loading ? <><Spinner size="sm" className="me-2" />{t('resetPassword.resetting')}</> : t('resetPassword.reset')}
            </Button>
          </Form>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Button variant="link" style={{ color: '#c62828', fontSize: '13px', textDecoration: 'none' }} onClick={() => navigate('/login')}>
            ← {t('resetPassword.backToLogin')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const pageStyle = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(160deg, #fafafa 0%, #f5f5f5 35%, #ffebee 55%, #ffcdd2 72%, #ef9a9a 85%, #e53935 100%)',
  padding: '24px', fontFamily: "'Poppins', 'Segoe UI', sans-serif"
};

const cardStyle = {
  width: '100%', maxWidth: '420px',
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(20px)',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
  padding: '32px'
};

export default ResetPassword;
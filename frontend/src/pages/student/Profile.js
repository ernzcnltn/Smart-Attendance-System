import React, { useState, useMemo } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { PersonFill, LockFill, ShieldFill, EyeFill, EyeSlashFill, CheckCircleFill, XCircleFill } from 'react-bootstrap-icons';
import api from '../../services/api';

const Profile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const passwordRules = [
    { label: t('resetPassword.rules.minLength'), test: (p) => p.length >= 6 },
    { label: t('resetPassword.rules.maxLength'), test: (p) => p.length <= 15 },
    { label: t('resetPassword.rules.uppercase'), test: (p) => /[A-Z]/.test(p) },
    { label: t('resetPassword.rules.number'),    test: (p) => /[0-9]/.test(p) },
  ];

  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const allRulesPassed = useMemo(() => passwordRules.every(r => r.test(passwordForm.new_password)), [passwordForm.new_password]);
  const passwordsMatch = passwordForm.new_password === passwordForm.confirm_password;

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError(''); setPasswordSuccess('');
    if (!allRulesPassed) return setPasswordError('Please meet all password requirements.');
    if (!passwordsMatch) return setPasswordError(t('resetPassword.noMatch'));
    setLoading(true);
    try {
      await api.post('/auth/change-password', { current_password: passwordForm.current_password, new_password: passwordForm.new_password });
      setPasswordSuccess('Password changed successfully.');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    } finally { setLoading(false); }
  };

  const eyeStyle = { background: 'var(--bs-body-bg)', border: '1px solid var(--bs-border-color)', borderLeft: 'none', borderRadius: '0 6px 6px 0', color: '#888' };

  return (
    <Container>
      <h4 className="mb-4 fw-bold">{t('profile.title')}</h4>
      <Row className="g-4">
        <Col md={6}>
          <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '14px' }}>
            <Card.Header className="border-bottom py-3 d-flex align-items-center gap-2">
              <PersonFill size={18} /><strong>{t('profile.personalInfo')}</strong>
            </Card.Header>
            <Card.Body>
              <div className="mb-4 text-center">
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #c0392b, #922b21)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '32px', margin: '0 auto 12px' }}>
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
                <h5 className="mb-0">{user?.full_name}</h5>
                <p className="text-muted small text-capitalize">{user?.role}</p>
              </div>
              {[
                { label: t('profile.fullName'), value: user?.full_name },
                { label: t('profile.email'), value: user?.email },
                { label: t('profile.studentNumber'), value: user?.student_number || '—' },
                { label: t('profile.role'), value: user?.role },
              ].map((item, i, arr) => (
                <div key={i}>
                  <div className="mb-3">
                    <label className="text-muted small">{item.label}</label>
                    <p className="fw-semibold mb-0 text-capitalize">{item.value}</p>
                  </div>
                  {i < arr.length - 1 && <hr />}
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '14px' }}>
            <Card.Header className="border-bottom py-3 d-flex align-items-center gap-2">
              <LockFill size={18} /><strong>{t('profile.changePassword')}</strong>
            </Card.Header>
            <Card.Body>
              {passwordError && <Alert variant="danger" className="py-2 small" style={{ borderRadius: '8px' }}>{passwordError}</Alert>}
              {passwordSuccess && <Alert variant="success" className="py-2 small" style={{ borderRadius: '8px' }}>{passwordSuccess}</Alert>}

              <Form onSubmit={handlePasswordChange}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">{t('profile.currentPassword')}</Form.Label>
                  <InputGroup>
                    <Form.Control type={showCurrent ? 'text' : 'password'} value={passwordForm.current_password} onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })} maxLength={15} required style={{ borderRadius: '6px 0 0 6px', borderRight: 'none' }} />
                    <Button variant="link" onClick={() => setShowCurrent(!showCurrent)} tabIndex={-1} style={eyeStyle}>
                      {showCurrent ? <EyeSlashFill size={14} /> : <EyeFill size={14} />}
                    </Button>
                  </InputGroup>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">{t('profile.newPassword')}</Form.Label>
                  <InputGroup>
                    <Form.Control type={showNew ? 'text' : 'password'} value={passwordForm.new_password} onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })} maxLength={15} required style={{ borderRadius: '6px 0 0 6px', borderRight: 'none' }} />
                    <Button variant="link" onClick={() => setShowNew(!showNew)} tabIndex={-1} style={eyeStyle}>
                      {showNew ? <EyeSlashFill size={14} /> : <EyeFill size={14} />}
                    </Button>
                  </InputGroup>
                  {passwordForm.new_password && (
                    <div style={{ marginTop: '8px', padding: '10px 14px', background: 'var(--bs-secondary-bg)', borderRadius: '8px', border: '1px solid var(--bs-border-color)' }}>
                      {passwordRules.map((rule, i) => {
                        const ok = rule.test(passwordForm.new_password);
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
                  <Form.Label className="small fw-semibold">{t('profile.confirmNewPassword')}</Form.Label>
                  <InputGroup>
                    <Form.Control type={showConfirm ? 'text' : 'password'} value={passwordForm.confirm_password} onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} maxLength={15} required style={{ borderRadius: '6px 0 0 6px', borderRight: 'none' }} />
                    <Button variant="link" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1} style={eyeStyle}>
                      {showConfirm ? <EyeSlashFill size={14} /> : <EyeFill size={14} />}
                    </Button>
                  </InputGroup>
                  {passwordForm.confirm_password && !passwordsMatch && (
                    <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: '12px', color: '#dc2626' }}>
                      <XCircleFill size={12} /> {t('resetPassword.noMatch')}
                    </div>
                  )}
                  {passwordForm.confirm_password && passwordsMatch && allRulesPassed && (
                    <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: '12px', color: '#16a34a' }}>
                      <CheckCircleFill size={12} /> {t('resetPassword.match')}
                    </div>
                  )}
                </Form.Group>

                <Button type="submit" variant="danger" className="w-100" disabled={loading || !allRulesPassed || !passwordsMatch} style={{ borderRadius: '10px', fontWeight: 600 }}>
                  {loading ? <Spinner size="sm" /> : t('profile.changeBtn')}
                </Button>
              </Form>

              <div className="mt-4 p-3 rounded" style={{ background: 'var(--bs-secondary-bg)' }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <ShieldFill size={16} className="text-warning" />
                  <strong className="small">{t('profile.securityTips')}</strong>
                </div>
                <ul className="mb-0 small text-muted ps-3">
                  <li>{t('profile.tip1')}</li>
                  <li>{t('profile.tip2')}</li>
                  <li>{t('profile.tip3')}</li>
                </ul>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;
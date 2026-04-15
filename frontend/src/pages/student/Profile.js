import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { PersonFill, LockFill, ShieldFill } from 'react-bootstrap-icons';
import api from '../../services/api';

const Profile = () => {
  const { user } = useAuth();
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      return setPasswordError('New passwords do not match.');
    }
    if (passwordForm.new_password.length < 6) {
      return setPasswordError('New password must be at least 6 characters.');
    }
    if (passwordForm.new_password.length > 15) {
      return setPasswordError('New password must be at most 15 characters.');
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      setPasswordSuccess('Password changed successfully.');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <h4 className="mb-4">My Profile</h4>

      <Row className="g-4">
        {/* Personal Info */}
        <Col md={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="border-bottom py-3 d-flex align-items-center gap-2">
              <PersonFill size={18} />
              <strong>Personal Information</strong>
            </Card.Header>
            <Card.Body>
              <div className="mb-4 text-center">
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #c0392b, #922b21)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 'bold', fontSize: '32px',
                  margin: '0 auto 12px'
                }}>
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
                <h5 className="mb-0">{user?.full_name}</h5>
                <p className="text-muted small">{user?.role}</p>
              </div>

              <div className="mb-3">
                <label className="text-muted small">Full Name</label>
                <p className="fw-semibold mb-0">{user?.full_name}</p>
              </div>
              <hr />
              <div className="mb-3">
                <label className="text-muted small">Email</label>
                <p className="fw-semibold mb-0">{user?.email}</p>
              </div>
              <hr />
              <div className="mb-3">
                <label className="text-muted small">Student Number</label>
                <p className="fw-semibold mb-0">{user?.student_number || '—'}</p>
              </div>
              <hr />
              <div>
                <label className="text-muted small">Role</label>
                <p className="fw-semibold mb-0 text-capitalize">{user?.role}</p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Change Password */}
        <Col md={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="border-bottom py-3 d-flex align-items-center gap-2">
              <LockFill size={18} />
              <strong>Change Password</strong>
            </Card.Header>
            <Card.Body>
              {passwordError && <Alert variant="danger" className="py-2 small">{passwordError}</Alert>}
              {passwordSuccess && <Alert variant="success" className="py-2 small">{passwordSuccess}</Alert>}

              <Form onSubmit={handlePasswordChange}>
                <Form.Group className="mb-3">
                  <Form.Label>Current Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    maxLength={15}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    maxLength={15}
                    required
                  />
                  <Form.Text className="text-muted">6-15 characters</Form.Text>
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    maxLength={15}
                    required
                  />
                </Form.Group>
                <Button type="submit" variant="danger" className="w-100" disabled={loading}>
                  {loading ? <Spinner size="sm" /> : 'Change Password'}
                </Button>
              </Form>

              <div className="mt-4 p-3 rounded" style={{ background: 'var(--bs-secondary-bg)' }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <ShieldFill size={16} className="text-warning" />
                  <strong className="small">Security Tips</strong>
                </div>
                <ul className="mb-0 small text-muted ps-3">
                  <li>Use a strong password with letters and numbers</li>
                  <li>Do not share your password with anyone</li>
                  <li>Change your password regularly</li>
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
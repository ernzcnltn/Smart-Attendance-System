// Bu bileşeni Login.jsx'e import edip kullan
// import ForgotPasswordModal from './ForgotPasswordModal';

import React, { useState } from 'react';
import { Modal, Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { EnvelopeFill } from 'react-bootstrap-icons';
import api from '../../services/api';

const ForgotPasswordModal = ({ show, onHide }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [focused, setFocused] = useState(false);

  const handleClose = () => {
    setEmail(''); setError(''); setSuccess('');
    onHide();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    // Email format kontrolu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Okul domain kontrolu
    const schoolDomain = process.env.REACT_APP_SCHOOL_DOMAIN || 'final.edu.tr';
    if (!email.endsWith(`@${schoolDomain}`)) {
      setError(`Only @${schoolDomain} email addresses are allowed.`);
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess('If this email is registered, a reset link has been sent. Please check your inbox.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div style={{ width: '100%', textAlign: 'center', paddingTop: '8px' }}>
          <div style={{
            width: '48px', height: '48px',
            background: 'linear-gradient(135deg, #c62828, #e53935)',
            borderRadius: '12px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px'
          }}>
            <EnvelopeFill size={22} color="white" />
          </div>
          <h5 style={{ fontWeight: 700, margin: 0 }}>Forgot Password?</h5>
          <p style={{ color: '#999', fontSize: '13px', margin: '4px 0 0' }}>
            Enter your email and we'll send you a reset link.
          </p>
        </div>
      </Modal.Header>
      <Modal.Body className="pt-3 pb-4 px-4">
        {error && <Alert variant="danger" className="py-2 small" style={{ borderRadius: '10px', fontSize: '13px' }}>{error}</Alert>}
        {success ? (
          <div>
            <Alert variant="success" className="py-3" style={{ borderRadius: '10px', fontSize: '13px' }}>
              <strong>✓ Email sent!</strong><br />{success}
            </Alert>
            <Button variant="danger" className="w-100" style={{ borderRadius: '10px' }} onClick={handleClose}>Close</Button>
          </div>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-4">
              <Form.Label style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>Email Address</Form.Label>
              <InputGroup>
                <InputGroup.Text style={{
                  background: 'rgba(255,255,255,0.85)', borderRight: 'none',
                  border: `1.5px solid ${focused ? '#c62828' : '#e0e0e0'}`,
                  borderRadius: '10px 0 0 10px', transition: 'border-color 0.2s'
                }}>
                  <EnvelopeFill size={14} color={focused ? '#c62828' : '#aaa'} />
                </InputGroup.Text>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="you@fiu.edu.tr"
                  required
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    border: `1.5px solid ${focused ? '#c62828' : '#e0e0e0'}`,
                    borderLeft: 'none', borderRadius: '0 10px 10px 0',
                    fontSize: '14px', transition: 'border-color 0.2s'
                  }}
                />
              </InputGroup>
            </Form.Group>
            <Button
              type="submit"
              className="w-100"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #b71c1c 0%, #d32f2f 50%, #e53935 100%)',
                border: 'none', borderRadius: '12px', padding: '12px',
                fontWeight: 700, fontSize: '15px',
                boxShadow: '0 4px 18px rgba(183,28,28,0.30)'
              }}
            >
              {loading ? <><Spinner size="sm" className="me-2" />Sending...</> : 'Send Reset Link'}
            </Button>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default ForgotPasswordModal;
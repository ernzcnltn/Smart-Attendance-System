import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { setToken, setUser } from '../../utils/helpers';

const CompleteRegistration = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useAuth();
  const [studentNumber, setStudentNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        email,
        full_name: fullName,
        student_number: studentNumber
      });
      const { token, user } = response.data.data;
      setToken(token);
      setUser(user);
      updateUser(user);
      navigate('/student');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: 'url(/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          width: '420px',
          maxWidth: '90vw',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '40px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div className="text-center mb-4">
          <img src="/logo.png" alt="FIU Logo" height="60" style={{ objectFit: 'contain' }} />
          <h5 className="mt-3" style={{ color: 'white', fontWeight: '600' }}>Complete Registration</h5>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Final International University</p>
        </div>

        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

        <div className="mb-3 p-3 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <p className="mb-1 small" style={{ color: 'rgba(255,255,255,0.7)' }}>Name</p>
          <p className="mb-0" style={{ color: 'white', fontWeight: '500' }}>{fullName}</p>
          <p className="mb-1 mt-2 small" style={{ color: 'rgba(255,255,255,0.7)' }}>Email</p>
          <p className="mb-0" style={{ color: 'white', fontWeight: '500' }}>{email}</p>
        </div>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-4">
            <Form.Label style={{ color: 'white' }}>Student Number</Form.Label>
            <Form.Control
              type="text"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              placeholder="Enter your student number"
              maxLength={20}
              required
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                borderRadius: '8px'
              }}
            />
          </Form.Group>
          <Button
            type="submit"
            className="w-100"
            disabled={loading}
            style={{
              background: '#c0392b',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              fontWeight: '600'
            }}
          >
            {loading ? <Spinner size="sm" /> : 'Complete Registration'}
          </Button>
        </Form>

        <p className="text-center mt-3 small" style={{ color: 'rgba(255,255,255,0.6)' }}>
          A temporary password will be sent to your email after registration.
        </p>
      </div>
    </div>
  );
};

export default CompleteRegistration;
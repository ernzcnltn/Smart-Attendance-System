import React, { useState } from 'react';
import { Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { EyeFill, EyeSlashFill, PersonFill } from 'react-bootstrap-icons';
import { login } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();
  const navigate = useNavigate();

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
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: 'url(/background1.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
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
          <img src="/logo.png" alt="FIU Logo" height="70" style={{ objectFit: 'contain' }} />
          <h5 className="mt-3" style={{ color: 'white', fontWeight: '600' }}>Smart Attendance System</h5>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Final International University</p>
        </div>

        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <InputGroup>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                maxLength={50}
                required
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  borderRadius: '8px'
                }}
              />
              <InputGroup.Text style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)' }}>
                <PersonFill color="white" size={16} />
              </InputGroup.Text>
            </InputGroup>
            <small style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Max 50 characters</small>
          </Form.Group>

          <Form.Group className="mb-4">
            <InputGroup>
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                maxLength={15}
                required
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  borderRadius: '8px 0 0 8px'
                }}
              />
              <Button
                variant="outline-light"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}
              >
                {showPassword ? <EyeSlashFill size={16} /> : <EyeFill size={16} />}
              </Button>
            </InputGroup>
            <small style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Max 15 characters</small>
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
              fontWeight: '600',
              fontSize: '15px'
            }}
          >
            {loading ? 'Signing in...' : 'Login'}
          </Button>
        </Form>
      </div>
    </div>
  );
};

export default Login;
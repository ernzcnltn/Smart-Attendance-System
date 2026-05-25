import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { register } from '../../services/authService';

const Register = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'student', student_number: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <Card style={{ width: '400px' }} className="p-4 shadow">
        <h4 className="text-center mb-4">Create Account</h4>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>{t('admin.dashboard.fullName')}</Form.Label>
            <Form.Control name="full_name" value={form.full_name} onChange={handleChange} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t('admin.dashboard.email')}</Form.Label>
            <Form.Control type="email" name="email" value={form.email} onChange={handleChange} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t('admin.dashboard.password')}</Form.Label>
            <Form.Control type="password" name="password" value={form.password} onChange={handleChange} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t('admin.dashboard.roleLabel')}</Form.Label>
            <Form.Select name="role" value={form.role} onChange={handleChange}>
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Admin</option>
            </Form.Select>
          </Form.Group>
          {form.role === 'student' && (
            <Form.Group className="mb-3">
              <Form.Label>{t('admin.dashboard.studentNumber')}</Form.Label>
              <Form.Control name="student_number" value={form.student_number} onChange={handleChange} required />
            </Form.Group>
          )}
          <Button variant="primary" type="submit" className="w-100" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </Button>
        </Form>
        <p className="text-center mt-3">
          Already have an account? <Link to="/login">{t('login.signIn')}</Link>
        </p>
      </Card>
    </Container>
  );
};

export default Register;
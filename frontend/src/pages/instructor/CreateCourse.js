import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { createCourse } from '../../services/courseService';

const CreateCourse = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    course_code: '',
    course_name: '',
    semester: '',
    attendance_threshold: 70
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createCourse(form);
      navigate('/instructor');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create course.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => navigate('/instructor')}>
        ← Back
      </Button>
      <Card className="shadow-sm" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <Card.Header><strong>Create New Course</strong></Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Course Code</Form.Label>
              <Form.Control
                name="course_code"
                value={form.course_code}
                onChange={handleChange}
                placeholder="e.g. CS101"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Course Name</Form.Label>
              <Form.Control
                name="course_name"
                value={form.course_name}
                onChange={handleChange}
                placeholder="e.g. Introduction to Computer Science"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Semester</Form.Label>
              <Form.Control
                name="semester"
                value={form.semester}
                onChange={handleChange}
                placeholder="e.g. 2024-2025 Spring"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Attendance Threshold (%)</Form.Label>
              <Form.Control
                type="number"
                name="attendance_threshold"
                min="0"
                max="100"
                value={form.attendance_threshold}
                onChange={handleChange}
              />
              <Form.Text className="text-muted">
                Students below this percentage will be flagged as at risk.
              </Form.Text>
            </Form.Group>
            <Button type="submit" variant="primary" className="w-100" disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Create Course'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default CreateCourse;
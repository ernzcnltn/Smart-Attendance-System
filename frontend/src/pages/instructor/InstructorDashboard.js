import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getMyCourses } from '../../services/courseService';
import { useAuth } from '../../context/AuthContext';

const InstructorDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getMyCourses();
        setCourses(data);
      } catch (err) {
        setError('Failed to load courses.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>Welcome, {user?.full_name}</h4>
        <Button variant="primary" onClick={() => navigate('/instructor/courses/new')}>
          + New Course
        </Button>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center shadow-sm">
            <Card.Body>
              <h2>{courses.length}</h2>
              <p className="text-muted mb-0">My Courses</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Card.Header><strong>My Courses</strong></Card.Header>
        <Card.Body>
          {courses.length === 0 ? (
            <p className="text-muted">No courses found. Create your first course.</p>
          ) : (
            courses.map((course) => (
              <div key={course.uuid} className="d-flex justify-content-between align-items-center border-bottom py-3">
                <div>
                  <strong>{course.course_code}</strong> — {course.course_name}
                  <div className="text-muted small">{course.semester} · Threshold: {course.attendance_threshold}%</div>
                </div>
                <div className="d-flex gap-2">
                  <Button size="sm" variant="outline-primary" onClick={() => navigate(`/instructor/courses/${course.uuid}`)}>
                    Manage
                  </Button>
                  <Button size="sm" variant="outline-success" onClick={() => navigate(`/instructor/courses/${course.uuid}/qr`)}>
                    Generate QR
                  </Button>
                </div>
              </div>
            ))
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default InstructorDashboard;
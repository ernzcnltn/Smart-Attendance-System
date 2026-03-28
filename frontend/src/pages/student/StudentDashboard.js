import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Button } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { getMyCourses } from '../../services/courseService';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const c = await getMyCourses();
        setCourses(c);
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container>
     <h4 className="mb-4">Welcome, {user?.full_name}</h4>
      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center shadow-sm">
            <Card.Body>
              <h2>{courses.length}</h2>
              <p className="text-muted mb-0">Enrolled Courses</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm mb-4">
        <Card.Header><strong>My Courses</strong></Card.Header>
        <Card.Body>
          {courses.length === 0 ? (
            <p className="text-muted">No courses enrolled.</p>
          ) : (
            courses.map((course) => (
              <div key={course.uuid} className="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                  <strong>{course.course_code}</strong> — {course.course_name}
                  <div className="text-muted small">{course.instructor_name} · {course.semester}</div>
                </div>
              </div>
            ))
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default StudentDashboard;
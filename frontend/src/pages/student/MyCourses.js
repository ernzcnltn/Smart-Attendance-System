import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Modal, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getMyCourses } from '../../services/courseService';
import api from '../../services/api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MyCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState({ show: false, message: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const c = await getMyCourses();
        setCourses(c);

        const scheduleMap = {};
        await Promise.all(c.map(async (course) => {
          try {
            const response = await api.get(`/timetable/schedule/${course.uuid}`);
            scheduleMap[course.uuid] = response.data.data;
          } catch (e) {
            scheduleMap[course.uuid] = [];
          }
        }));
        setSchedules(scheduleMap);
      } catch (err) {
        setError('Failed to load courses.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

 const getCourseStatus = (courseUUID) => {
  const courseSchedules = schedules[courseUUID] || [];
  if (courseSchedules.length === 0) return 'no_schedule';

  const now = new Date();
  const todayName = DAYS[now.getDay()];
  const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

  const todaySchedules = courseSchedules.filter(s => s.day === todayName);
  if (todaySchedules.length === 0) return 'not_today';

  for (const s of todaySchedules) {
    // start_time ve end_time HH:MM:SS veya HH:MM formatında gelebilir
    const startTime = s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time;
    const endTime = s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time;

    if (currentTime >= startTime && currentTime <= endTime) {
      return 'active';
    }
    if (currentTime < startTime) {
      return { status: 'upcoming', start_time: s.start_time.substring(0, 5), end_time: s.end_time.substring(0, 5) };
    }
  }

  return 'ended';
};

  const handleCourseClick = (course) => {
    const status = getCourseStatus(course.uuid);

    if (status === 'active') {
      navigate('/student/face-attendance');
      return;
    }

    if (status === 'no_schedule') {
      setPopup({ show: true, message: 'No schedule has been set for this course yet.' });
      return;
    }

    if (status === 'not_today') {
      const courseSchedules = schedules[course.uuid] || [];
      const days = courseSchedules.map(s => s.day).join(', ');
      setPopup({ show: true, message: `This course is not scheduled for today. Class days: ${days}` });
      return;
    }

    if (status === 'ended') {
      setPopup({ show: true, message: 'Today\'s class for this course has already ended.' });
      return;
    }

    if (status?.status === 'upcoming') {
      setPopup({ show: true, message: `Class hasn't started yet. It will begin at ${status.start_time} and end at ${status.end_time}.` });
      return;
    }
  };

  const getCardStyle = (courseUUID) => {
    const status = getCourseStatus(courseUUID);
    if (status === 'active') {
      return {
        cursor: 'pointer',
        border: '2px solid #198754',
        opacity: 1,
        transition: 'transform 0.2s',
      };
    }
    return {
      cursor: 'pointer',
      opacity: 0.5,
      border: '1px solid var(--bs-border-color)',
      transition: 'transform 0.2s',
    };
  };

  const getStatusBadge = (courseUUID) => {
    const status = getCourseStatus(courseUUID);
    if (status === 'active') return <Badge bg="success">Active — Take Attendance</Badge>;
    if (status === 'no_schedule') return <Badge bg="secondary">No Schedule</Badge>;
    if (status === 'not_today') return <Badge bg="warning" text="dark">Not Today</Badge>;
    if (status === 'ended') return <Badge bg="danger">Ended</Badge>;
    if (status?.status === 'upcoming') return <Badge bg="info" text="dark">Starts at {status.start_time}</Badge>;
    return null;
  };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container>
      <h4 className="mb-4">My Courses</h4>
      {error && <Alert variant="danger">{error}</Alert>}

      {courses.length === 0 ? (
        <Card className="shadow-sm border-0">
          <Card.Body className="text-center py-5">
            <h5 className="text-muted">No courses enrolled yet.</h5>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-3">
          {courses.map((course) => (
            <Col md={6} lg={4} key={course.uuid}>
              <Card
                className="shadow-sm h-100"
                style={getCardStyle(course.uuid)}
                onClick={() => handleCourseClick(course)}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="fw-bold mb-0">{course.course_code}</h6>
                      <p className="text-muted small mb-0">{course.course_name}</p>
                    </div>
                    {getStatusBadge(course.uuid)}
                  </div>
                  <hr />
                  <p className="small mb-1 text-muted">{course.instructor_name}</p>
                  <p className="small mb-2 text-muted">{course.semester}</p>

                  {schedules[course.uuid]?.length > 0 && (
  <div>
    {schedules[course.uuid].map((s, i) => (
      <div key={i} className="small text-muted">
        {s.day}: {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
      </div>
    ))}
  </div>
)}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal show={popup.show} onHide={() => setPopup({ show: false, message: '' })} centered>
        <Modal.Header closeButton>
          <Modal.Title>Course Information</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{popup.message}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setPopup({ show: false, message: '' })}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MyCourses;
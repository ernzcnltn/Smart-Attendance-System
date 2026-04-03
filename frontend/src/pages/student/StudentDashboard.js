import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, ProgressBar, Badge, Button } from 'react-bootstrap';
import { CameraFill, ClipboardDataFill, PersonCheckFill, ExclamationTriangleFill, CheckCircleFill } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyCourses } from '../../services/courseService';
import { getMyAttendance } from '../../services/sessionService';
import { getMyNotifications } from '../../services/attendanceService';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, a, n] = await Promise.all([
          getMyCourses(),
          getMyAttendance(),
          getMyNotifications()
        ]);
        setCourses(c);
        setAttendance(a);
        setNotifications(n);
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getCourseStats = (course_code) => {
    const records = attendance.filter(a => a.course_code === course_code);
    return records.length;
  };

  const recentAttendance = attendance.slice(0, 5);
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const atRiskCount = courses.filter(c => {
    const attended = getCourseStats(c.course_code);
    const total = attended;
    if (total === 0) return false;
    return (attended / total) * 100 < (c.attendance_threshold || 70);
  }).length;

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container>
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Header */}
      <div className="mb-4 pb-3 border-bottom">
        <h4 className="mb-0">Welcome back, <strong>{user?.full_name}</strong></h4>
        <p className="text-muted mt-1 mb-0 small">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Row */}
      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
            <Card.Body className="d-flex align-items-center gap-3 py-4">
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px' }}>
                <PersonCheckFill size={28} color="white" />
              </div>
              <div>
                <h2 className="mb-0 text-white">{courses.length}</h2>
                <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.7)' }}>Enrolled Courses</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg, #0f3460, #533483)' }}>
            <Card.Body className="d-flex align-items-center gap-3 py-4">
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px' }}>
                <ClipboardDataFill size={28} color="white" />
              </div>
              <div>
                <h2 className="mb-0 text-white">{attendance.length}</h2>
                <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.7)' }}>Total Attendances</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100" style={{ background: unreadCount > 0 ? 'linear-gradient(135deg, #c0392b, #e74c3c)' : 'linear-gradient(135deg, #1e3c72, #2a5298)' }}>
            <Card.Body className="d-flex align-items-center gap-3 py-4">
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px' }}>
                <ExclamationTriangleFill size={28} color="white" />
              </div>
              <div>
                <h2 className="mb-0 text-white">{unreadCount}</h2>
                <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.7)' }}>Unread Alerts</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Action */}
      <Row className="mb-4">
        <Col>
          <Card
            className="shadow-sm border-0"
            style={{ background: 'linear-gradient(135deg, #c0392b, #922b21)', cursor: 'pointer' }}
            onClick={() => navigate('/student/face-attendance')}
          >
            <Card.Body className="d-flex align-items-center justify-content-between py-4 px-4">
              <div className="d-flex align-items-center gap-3">
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px' }}>
                  <CameraFill size={32} color="white" />
                </div>
                <div>
                  <h5 className="mb-1 text-white">Take Attendance</h5>
                  <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Verify your identity and scan the QR code to mark attendance
                  </p>
                </div>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '24px' }}>→</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* My Courses */}
        <Col md={7} className="mb-4">
          <Card className="shadow-sm border-0 h-100">
<Card.Header className="border-bottom d-flex justify-content-between align-items-center py-3">              <strong>My Courses</strong>
              <Button variant="outline-secondary" size="sm" onClick={() => navigate('/student/attendance')}>
                View Attendance
              </Button>
            </Card.Header>
            <Card.Body>
              {courses.length === 0 ? (
                <p className="text-muted">No courses enrolled.</p>
              ) : (
                courses.map((c, i) => {
                  const attended = getCourseStats(c.course_code);
                  return (
                    <div key={i} className={`mb-4 ${i < courses.length - 1 ? 'pb-4 border-bottom' : ''}`}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <span className="fw-bold">{c.course_code}</span>
                          <span className="text-muted ms-2 small">{c.course_name}</span>
                          <div className="text-muted small mt-1">{c.instructor_name} · {c.semester}</div>
                        </div>
                        {attended > 0 && (
                          <Badge bg="success" className="d-flex align-items-center gap-1">
                            <CheckCircleFill size={10} /> {attended} sessions
                          </Badge>
                        )}
                      </div>
                      {attended > 0 && (
                        <ProgressBar
                          now={100}
                          variant="success"
                          style={{ height: '6px', borderRadius: '4px' }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Attendance */}
        <Col md={5} className="mb-4">
          <Card className="shadow-sm border-0 h-100">
<Card.Header className="border-bottom py-3">              <strong>Recent Attendance</strong>
            </Card.Header>
            <Card.Body className="p-0">
              {recentAttendance.length === 0 ? (
                <p className="text-muted p-3">No attendance records yet.</p>
              ) : (
                recentAttendance.map((a, i) => (
                  <div
                    key={i}
                    className="d-flex justify-content-between align-items-center px-3 py-3"
                    style={{ borderBottom: i < recentAttendance.length - 1 ? '1px solid #f0f0f0' : 'none' }}
                  >
                    <div>
                      <div className="fw-bold small">{a.course_code}</div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>
                        {new Date(a.session_date).toLocaleDateString('en-GB')} · {a.start_time}
                      </div>
                    </div>
                    <Badge bg="dark" className="text-uppercase" style={{ fontSize: '10px' }}>{a.method}</Badge>
                  </div>
                ))
              )}
              {attendance.length > 5 && (
                <div className="p-3">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="w-100"
                    onClick={() => navigate('/student/attendance')}
                  >
                    View All Records
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default StudentDashboard;
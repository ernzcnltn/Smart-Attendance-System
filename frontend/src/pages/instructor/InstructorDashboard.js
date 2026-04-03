import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert, Badge, Image, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyCourses } from '../../services/courseService';
import { getActiveSession,deleteSession } from '../../services/sessionService';
import { PeopleFill, UpcScan, GridFill, PlayCircleFill, StopCircleFill } from 'react-bootstrap-icons';

const InstructorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [activeSessions, setActiveSessions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrModal, setQrModal] = useState({ show: false, course: null, data: null, timeLeft: null });
  const timerRef = React.useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const c = await getMyCourses();
      setCourses(c);
      const sessionMap = {};
      await Promise.all(c.map(async (course) => {
        try {
          const active = await getActiveSession(course.uuid);
          if (active?.has_active) {
            sessionMap[course.uuid] = active;
          }
        } catch (e) {}
      }));
      setActiveSessions(sessionMap);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

const handleGenerateQR = async (course) => {
  try {
    const active = await getActiveSession(course.uuid);
    if (active?.has_active) {
      setActiveSessions(prev => ({ ...prev, [course.uuid]: active }));
      openQrModal(course, active);
    } else {
      navigate(`/instructor/courses/${course.uuid}/qr`);
    }
  } catch (e) {
    navigate(`/instructor/courses/${course.uuid}/qr`);
  }
};

  const openQrModal = (course, data) => {
    if (timerRef.current) clearInterval(timerRef.current);
    let seconds = data.remaining_seconds;
    setQrModal({ show: true, course, data, timeLeft: seconds });

    timerRef.current = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        clearInterval(timerRef.current);
        setQrModal(prev => ({ ...prev, show: false }));
        setActiveSessions(prev => {
          const updated = { ...prev };
          delete updated[course.uuid];
          return updated;
        });
      } else {
        setQrModal(prev => ({ ...prev, timeLeft: seconds }));
      }
    }, 1000);
  };

  const closeQrModal = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setQrModal({ show: false, course: null, data: null, timeLeft: null });
  };

  const formatTime = (seconds) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const totalStudents = courses.reduce((acc, c) => acc + (c.student_count || 0), 0);
  const activeLiveCount = Object.keys(activeSessions).length;

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container>
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <h4 className="mb-0">Welcome, <strong>{user?.full_name}</strong></h4>
          <p className="text-muted mt-1 mb-0 small">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button variant="danger" onClick={() => navigate('/instructor/courses/new')}>
          + New Course
        </Button>
      </div>

      {/* Stats */}
      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
            <Card.Body className="d-flex align-items-center gap-3 py-4">
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px' }}>
                <GridFill size={28} color="white" />
              </div>
              <div>
                <h2 className="mb-0 text-white">{courses.length}</h2>
                <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.7)' }}>My Courses</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg, #0f3460, #533483)' }}>
            <Card.Body className="d-flex align-items-center gap-3 py-4">
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px' }}>
                <PeopleFill size={28} color="white" />
              </div>
              <div>
                <h2 className="mb-0 text-white">{totalStudents}</h2>
                <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.7)' }}>Total Students</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100" style={{ background: activeLiveCount > 0 ? 'linear-gradient(135deg, #c0392b, #e74c3c)' : 'linear-gradient(135deg, #1e3c72, #2a5298)' }}>
            <Card.Body className="d-flex align-items-center gap-3 py-4">
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px' }}>
                <UpcScan size={28} color="white" />
              </div>
              <div>
                <h2 className="mb-0 text-white">{activeLiveCount}</h2>
                <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.7)' }}>Active Sessions</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Courses */}
      <Card className="shadow-sm border-0">
<Card.Header className="border-bottom py-3">
          <strong>My Courses</strong>
        </Card.Header>
        <Card.Body className="p-0">
          {courses.length === 0 ? (
            <p className="text-muted p-3">No courses yet. Create your first course!</p>
          ) : (
           courses.map((c, i) => {
  const isLive = !!activeSessions[c.uuid];
  return (
    <div
      key={c.uuid}
      className="px-3 py-3"
      style={{ borderBottom: i < courses.length - 1 ? '1px solid var(--bs-border-color)' : 'none' }}
    >
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div style={{ flex: 1, marginRight: '8px' }}>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <strong>{c.course_code}</strong>
            <span className="text-muted">—</span>
            <span>{c.course_name}</span>
            {isLive && (
              <Badge bg="danger" className="d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', display: 'inline-block' }}></span>
                LIVE
              </Badge>
            )}
          </div>
          <div className="text-muted small mt-1">
            {c.semester} · Threshold: {c.attendance_threshold}% · {c.student_count || 0} students
          </div>
        </div>
      </div>
      <div className="d-flex gap-2">
        <Button
          size="sm"
          variant="outline-secondary"
          className="flex-fill"
          onClick={() => navigate(`/instructor/courses/${c.uuid}`)}
        >
          Manage
        </Button>
        <Button
          size="sm"
          variant={isLive ? 'danger' : 'primary'}
          className="flex-fill d-flex align-items-center justify-content-center gap-1"
          onClick={() => handleGenerateQR(c)}
        >
          {isLive ? (
            <><PlayCircleFill size={14} /> View QR</>
          ) : (
            <><UpcScan size={14} /> Generate QR</>
          )}
        </Button>
      </div>
    </div>
  );
})
          )}
        </Card.Body>
      </Card>

      {/* QR Modal */}
      <Modal show={qrModal.show} onHide={closeQrModal} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title className="small">
            <strong>{qrModal.course?.course_code}</strong> — Active Session
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <Badge
            bg={qrModal.timeLeft > 60 ? 'success' : 'danger'}
            className="fs-5 px-3 py-2 mb-3"
          >
            {formatTime(qrModal.timeLeft)}
          </Badge>
          <p className="text-muted small mb-3">Time remaining</p>
          {qrModal.data?.qr_code && (
            <Image src={qrModal.data.qr_code} fluid className="border rounded p-2" style={{ maxWidth: '250px' }} />
          )}
          <p className="text-muted small mt-3">Show this QR code to students.</p>
        </Modal.Body>
     <Modal.Footer className="justify-content-between">
  <Button
    variant="outline-danger"
    size="sm"
    onClick={async () => {
      try {
        await deleteSession(qrModal.data.session_uuid);
        closeQrModal();
        setActiveSessions(prev => {
          const updated = { ...prev };
          delete updated[qrModal.course.uuid];
          return updated;
        });
      } catch (e) {}
    }}
  >
    <StopCircleFill size={14} className="me-1" />
    Cancel Session
  </Button>
  <Button variant="secondary" size="sm" onClick={closeQrModal}>
    Close
  </Button>
</Modal.Footer>
      </Modal>
    </Container>
  );
};

export default InstructorDashboard;
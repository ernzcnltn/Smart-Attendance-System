import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Alert, Spinner, Badge } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseByUUID, getCourseStudents, enrollStudent } from '../../services/courseService';
import { getAttendanceStats, sendLowAttendanceNotifications } from '../../services/attendanceService';
import { exportExcel, exportPDF, exportSessionExcel, exportSessionPDF } from '../../services/exportService';
import { getSessionsByCourse } from '../../services/sessionService';

const ManageCourse = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [studentUUID, setStudentUUID] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, s, st, sess] = await Promise.all([
          getCourseByUUID(uuid),
          getCourseStudents(uuid),
          getAttendanceStats(uuid),
          getSessionsByCourse(uuid)
        ]);
        setCourse(c);
        setStudents(s);
        setStats(st);
        setSessions(sess);
      } catch (err) {
        setError('Failed to load course data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [uuid]);

  const showConfirm = (title, message, onConfirm) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  const handleConfirm = async () => {
    setConfirmModal({ ...confirmModal, show: false });
    if (confirmModal.onConfirm) await confirmModal.onConfirm();
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    try {
      await enrollStudent({ course_uuid: uuid, student_uuid: studentUUID });
      setSuccess('Student enrolled successfully.');
      setShowEnrollModal(false);
      setStudentUUID('');
      setSearchResults([]);
      const s = await getCourseStudents(uuid);
      setStudents(s);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enroll student.');
    }
  };

  const handleNotify = () => {
    showConfirm(
      'Send Low Attendance Alerts',
      'Send notifications to all students below the attendance threshold?',
      async () => {
        try {
          const res = await sendLowAttendanceNotifications(uuid);
          setSuccess(res.message);
        } catch (err) {
          setError('Failed to send notifications.');
        }
      }
    );
  };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => navigate('/instructor')}>
        ← Back
      </Button>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <h5>{course?.course_code} — {course?.course_name}</h5>
          <p className="text-muted mb-0">{course?.semester} · Attendance threshold: {course?.attendance_threshold}%</p>
        </Card.Body>
      </Card>

      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center shadow-sm">
            <Card.Body>
              <h3>{stats?.total_sessions || 0}</h3>
              <p className="text-muted mb-0">Total Sessions</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center shadow-sm">
            <Card.Body>
              <h3>{students.length}</h3>
              <p className="text-muted mb-0">Students</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center shadow-sm border-danger">
            <Card.Body>
              <h3 className="text-danger">{stats?.at_risk_count || 0}</h3>
              <p className="text-muted mb-0">At Risk</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="d-flex flex-wrap gap-2 mb-4">
        <Button variant="outline-primary" onClick={() => setShowEnrollModal(true)}>+ Enroll Student</Button>
        <Button variant="outline-danger" onClick={handleNotify}>Send Low Attendance Alerts</Button>
        <Button variant="outline-success" onClick={() => navigate(`/instructor/courses/${uuid}/qr`)}>Generate QR</Button>
        <Button variant="outline-secondary" onClick={() => exportExcel(uuid)}>Export Excel</Button>
        <Button variant="outline-dark" onClick={() => exportPDF(uuid)}>Export PDF</Button>
      </div>

      <Card className="shadow-sm mb-4">
        <Card.Header><strong>Student Attendance</strong></Card.Header>
        <Card.Body>
          {students.length === 0 ? (
            <p className="text-muted">No students enrolled.</p>
          ) : (
            <Table responsive hover>
              <thead className="table-dark">
                <tr>
                  <th>Student</th>
                  <th>Student No</th>
                  <th>Attended</th>
                  <th>Percentage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats?.students?.map((s, i) => (
                  <tr key={i}>
                    <td>{s.full_name}</td>
                    <td>{s.student_number}</td>
                    <td>{s.attended} / {s.total_sessions}</td>
                    <td>{s.percentage}%</td>
                    <td>
                      <Badge bg={s.percentage >= stats.threshold ? 'success' : 'danger'}>
                        {s.percentage >= stats.threshold ? 'OK' : 'At Risk'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Card className="shadow-sm mb-4">
        <Card.Header><strong>Sessions</strong></Card.Header>
        <Card.Body>
          {sessions.length === 0 ? (
            <p className="text-muted">No sessions found.</p>
          ) : (
            <Table responsive hover>
              <thead className="table-dark">
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Attendance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={i}>
                    <td>{new Date(s.session_date).toLocaleDateString('en-GB')}</td>
                    <td>{s.start_time} - {s.end_time}</td>
                    <td>{s.attendance_count} students</td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button size="sm" variant="outline-secondary" onClick={() => exportSessionExcel(s.uuid)}>
                          Excel
                        </Button>
                        <Button size="sm" variant="outline-dark" onClick={() => exportSessionPDF(s.uuid)}>
                          PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={showEnrollModal} onHide={() => { setShowEnrollModal(false); setStudentUUID(''); setSearchResults([]); }}>
        <Modal.Header closeButton>
          <Modal.Title>Enroll Student</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEnroll}>
            <Form.Group className="mb-3">
              <Form.Label>Search Student</Form.Label>
              <Form.Control
                placeholder="Search by name, email or student number"
                onChange={async (e) => {
                  const q = e.target.value;
                  if (q.length > 2) {
                    const { searchStudents } = await import('../../services/authService');
                    const results = await searchStudents(q);
                    setSearchResults(results);
                  } else {
                    setSearchResults([]);
                  }
                }}
              />
            </Form.Group>
            {searchResults.length > 0 && (
              <div className="border rounded mb-3">
                {searchResults.map((s) => (
                  <div
                    key={s.uuid}
                    className={`p-2 border-bottom ${studentUUID === s.uuid ? 'bg-primary text-white' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setStudentUUID(s.uuid)}
                  >
                    <strong>{s.full_name}</strong> — {s.student_number}
                    <div className="small">{s.email}</div>
                  </div>
                ))}
              </div>
            )}
            {studentUUID && <p className="text-success small">Student selected.</p>}
            <Button type="submit" variant="primary" className="w-100" disabled={!studentUUID}>
              Enroll
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={confirmModal.show} onHide={() => setConfirmModal({ ...confirmModal, show: false })} centered>
        <Modal.Header closeButton>
          <Modal.Title>{confirmModal.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{confirmModal.message}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ManageCourse;
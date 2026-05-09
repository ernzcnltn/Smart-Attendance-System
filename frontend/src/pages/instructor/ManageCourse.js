import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Alert, Spinner, Badge, InputGroup } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseByUUID, getCourseStudents, enrollStudent } from '../../services/courseService';
import { getAttendanceStats, sendLowAttendanceNotifications } from '../../services/attendanceService';
import { exportExcel, exportPDF, exportSessionExcel, exportSessionPDF } from '../../services/exportService';
import { getSessionsByCourse } from '../../services/sessionService';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import { Download, Search, PencilFill, PlusCircleFill, TrashFill } from 'react-bootstrap-icons';

const STUDENTS_PER_PAGE = 10;
const SESSIONS_PER_PAGE = 10;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ManageCourse = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [studentUUID, setStudentUUID] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [showStudentUploadModal, setShowStudentUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [studentPage, setStudentPage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);
  const [studentSearch, setStudentSearch] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ course_name: '', semester: '', attendance_threshold: 70, schedules: [] });
  const [editLoading, setEditLoading] = useState(false);
  const studentFileRef = useRef(null);

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

        // Schedule'ı ayrıca çek
        try {
          const schRes = await api.get(`/timetable/schedule/${uuid}`);
          setSchedules(schRes.data.data || []);
        } catch { setSchedules([]); }

      } catch (err) {
        setError('Failed to load course data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [uuid]);

  const openEditModal = () => {
    setEditForm({
      course_code: course?.course_code || '',
      course_name: course?.course_name || '',
      semester: course?.semester || '',
      attendance_threshold: course?.attendance_threshold || 70,
      schedules: schedules.length > 0
        ? schedules.map(s => ({ day: s.day, start_time: s.start_time?.substring(0, 5), end_time: s.end_time?.substring(0, 5) }))
        : [{ day: 'Monday', start_time: '09:00', end_time: '10:30' }]
    });
    setShowEditModal(true);
  };

  const handleEditScheduleChange = (index, field, value) => {
    const updated = [...editForm.schedules];
    updated[index] = { ...updated[index], [field]: value };
    setEditForm({ ...editForm, schedules: updated });
  };

  const addScheduleRow = () => {
    setEditForm({ ...editForm, schedules: [...editForm.schedules, { day: 'Monday', start_time: '09:00', end_time: '10:30' }] });
  };

  const removeScheduleRow = (index) => {
    const updated = editForm.schedules.filter((_, i) => i !== index);
    setEditForm({ ...editForm, schedules: updated });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await api.put(`/courses/${uuid}`, {
        course_code: editForm.course_code,
        course_name: editForm.course_name,
        semester: editForm.semester,
        attendance_threshold: parseInt(editForm.attendance_threshold),
        schedules: editForm.schedules
      });
      setSuccess('Course updated successfully.');
      setShowEditModal(false);
      // Refresh
      const [c] = await Promise.all([getCourseByUUID(uuid)]);
      setCourse(c);
      const schRes = await api.get(`/timetable/schedule/${uuid}`);
      setSchedules(schRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update course.');
    } finally {
      setEditLoading(false);
    }
  };

  const showConfirm = (title, message, onConfirm) => setConfirmModal({ show: true, title, message, onConfirm });

  const handleConfirm = async () => {
    setConfirmModal({ ...confirmModal, show: false });
    if (confirmModal.onConfirm) await confirmModal.onConfirm();
  };

  const downloadStudentTemplate = () => {
    const data = [{ student_number: '2003060007' }, { student_number: '2003060008' }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'student_list_template.xlsx');
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

  const handleStudentUpload = async () => {
    const file = studentFileRef.current?.files[0];
    if (!file) return setError('Please select a file.');
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('course_uuid', uuid);
      const response = await api.post('/timetable/students', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(`${response.data.data.enrolled} students enrolled. ${response.data.data.notFound} not found in system.`);
      setShowStudentUploadModal(false);
      const s = await getCourseStudents(uuid);
      setStudents(s);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload student list.');
    } finally {
      setUploadLoading(false);
    }
  };

  const studentList = stats?.students || [];
  const filteredStudents = studentSearch
    ? studentList.filter(s =>
        s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.student_number?.includes(studentSearch)
      )
    : studentList;
  const studentTotalPages = Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice((studentPage - 1) * STUDENTS_PER_PAGE, studentPage * STUDENTS_PER_PAGE);
  const sessionTotalPages = Math.ceil(sessions.length / SESSIONS_PER_PAGE);
  const paginatedSessions = sessions.slice((sessionPage - 1) * SESSIONS_PER_PAGE, sessionPage * SESSIONS_PER_PAGE);

  const PaginationBar = ({ currentPage, totalPages, totalItems, perPage, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="d-flex justify-content-between align-items-center py-2 px-3 border-top">
        <small className="text-muted">
          Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, totalItems)} of {totalItems}
        </small>
        <div className="d-flex gap-1 flex-wrap">
          <Button size="sm" variant="outline-secondary" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>&larr;</Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button key={page} size="sm" variant={currentPage === page ? 'danger' : 'outline-secondary'} onClick={() => onPageChange(page)}>{page}</Button>
          ))}
          <Button size="sm" variant="outline-secondary" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>&rarr;</Button>
        </div>
      </div>
    );
  };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => navigate('/instructor')}>&larr; Back</Button>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Course Info Card */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h5 className="mb-1">{course?.course_code} — {course?.course_name}</h5>
              <p className="text-muted mb-0">{course?.semester} · Attendance threshold: {course?.attendance_threshold}%</p>
              {schedules.length > 0 && (
                <div className="mt-2">
                  {schedules.map((s, i) => (
                    <Badge key={i} bg="secondary" className="me-1" style={{ fontSize: '12px' }}>
                      {s.day}: {s.start_time?.substring(0, 5)} – {s.end_time?.substring(0, 5)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline-secondary" size="sm" onClick={openEditModal} className="d-flex align-items-center gap-1">
              <PencilFill size={13} /> Edit
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Row className="mb-4">
        {[
          { label: 'Total Sessions', value: stats?.total_sessions || 0 },
          { label: 'Students', value: students.length },
          { label: 'At Risk', value: stats?.at_risk_count || 0 },
        ].map((item, i) => (
          <Col md={3} xs={4} key={i}>
            <Card className="text-center shadow-sm">
              <Card.Body className="py-3">
                <h3>{item.value}</h3>
                <p className="text-muted mb-0 small">{item.label}</p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <div className="d-flex flex-wrap gap-2 mb-4">
        <Button variant="danger" onClick={() => setShowEnrollModal(true)}>+ Enroll Student</Button>
        <Button variant="danger" onClick={() => setShowStudentUploadModal(true)}>Upload Student List</Button>
        <Button variant="danger" onClick={handleNotify}>Send Low Attendance Alerts</Button>
        <Button variant="danger" onClick={() => navigate(`/instructor/courses/${uuid}/qr`)}>Generate QR</Button>
        <Button variant="secondary" onClick={() => exportExcel(uuid)}>Export Excel</Button>
        <Button variant="secondary" onClick={() => exportPDF(uuid)}>Export PDF</Button>
      </div>

      {/* Student Attendance */}
      <Card className="shadow-sm mb-4" style={{ borderRadius: '14px', overflow: 'hidden' }}>
        <Card.Header>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
            <strong>Student Attendance</strong>
            <InputGroup style={{ maxWidth: '280px' }}>
              <InputGroup.Text style={{ background: 'transparent' }}><Search size={14} /></InputGroup.Text>
              <Form.Control
                placeholder="Search by name or number..."
                value={studentSearch}
                onChange={e => { setStudentSearch(e.target.value); setStudentPage(1); }}
                size="sm"
              />
              {studentSearch && (
                <Button size="sm" variant="outline-secondary" onClick={() => { setStudentSearch(''); setStudentPage(1); }}>✕</Button>
              )}
            </InputGroup>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {filteredStudents.length === 0 ? (
            <p className="text-muted p-3">{studentSearch ? 'No students match your search.' : 'No students enrolled.'}</p>
          ) : (
            <>
              <div className="d-none d-md-block">
                <Table hover className="mb-0">
                  <thead className="table-dark">
                    <tr><th>Student</th><th>Student No</th><th>Attended</th><th>Percentage</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((s, i) => (
                      <tr key={i}>
                        <td>{s.full_name}</td>
                        <td>{s.student_number}</td>
                        <td>{s.attended} / {s.total_sessions}</td>
                        <td>{s.percentage}%</td>
                        <td><Badge bg={s.percentage >= stats.threshold ? 'success' : 'danger'}>{s.percentage >= stats.threshold ? 'OK' : 'At Risk'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <div className="d-md-none p-3">
                {paginatedStudents.map((s, i) => (
                  <Card key={i} className="shadow-sm border-0 mb-3" style={{ borderRadius: '10px' }}>
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <strong>{s.full_name}</strong>
                          <div className="text-muted small">{s.student_number}</div>
                        </div>
                        <Badge bg={s.percentage >= stats.threshold ? 'success' : 'danger'}>{s.percentage >= stats.threshold ? 'OK' : 'At Risk'}</Badge>
                      </div>
                      <hr className="my-2" />
                      <div style={{ fontSize: '0.82rem' }}>
                        <div className="d-flex justify-content-between mb-1"><span className="text-muted">Attended</span><span>{s.attended} / {s.total_sessions}</span></div>
                        <div className="d-flex justify-content-between"><span className="text-muted">Percentage</span><span style={{ fontWeight: 600, color: s.percentage >= stats.threshold ? '#16a34a' : '#dc2626' }}>{s.percentage}%</span></div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card.Body>
        <PaginationBar currentPage={studentPage} totalPages={studentTotalPages} totalItems={filteredStudents.length} perPage={STUDENTS_PER_PAGE} onPageChange={setStudentPage} />
      </Card>

      {/* Sessions */}
      <Card className="shadow-sm mb-4" style={{ borderRadius: '14px', overflow: 'hidden' }}>
        <Card.Header><strong>Sessions</strong></Card.Header>
        <Card.Body className="p-0">
          {sessions.length === 0 ? (
            <p className="text-muted p-3">No sessions found.</p>
          ) : (
            <>
              <div className="d-none d-md-block">
                <Table hover className="mb-0">
                  <thead className="table-dark">
                    <tr><th>Date</th><th>Time</th><th>Attendance</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {paginatedSessions.map((s, i) => (
                      <tr key={i}>
                        <td>{new Date(s.session_date).toLocaleDateString('en-GB')}</td>
                        <td>{s.start_time} – {s.end_time}</td>
                        <td>{s.attendance_count} students</td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button size="sm" variant="outline-secondary" onClick={() => exportSessionExcel(s.uuid)}>Excel</Button>
                            <Button size="sm" variant="outline-secondary" onClick={() => exportSessionPDF(s.uuid)}>PDF</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <div className="d-md-none p-3">
                {paginatedSessions.map((s, i) => (
                  <Card key={i} className="shadow-sm border-0 mb-3" style={{ borderRadius: '10px' }}>
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <strong>{new Date(s.session_date).toLocaleDateString('en-GB')}</strong>
                          <div className="text-muted small">{s.start_time} – {s.end_time}</div>
                        </div>
                        <Badge bg="secondary">{s.attendance_count} students</Badge>
                      </div>
                      <hr className="my-2" />
                      <div className="d-flex gap-2">
                        <Button size="sm" variant="outline-secondary" className="w-50" onClick={() => exportSessionExcel(s.uuid)}>Excel</Button>
                        <Button size="sm" variant="outline-secondary" className="w-50" onClick={() => exportSessionPDF(s.uuid)}>PDF</Button>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card.Body>
        <PaginationBar currentPage={sessionPage} totalPages={sessionTotalPages} totalItems={sessions.length} perPage={SESSIONS_PER_PAGE} onPageChange={setSessionPage} />
      </Card>

      {/* Edit Course Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Course — {course?.course_code}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditSubmit}>
            <Row className="g-3 mb-4">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold small">Course Code</Form.Label>
                  <Form.Control
                    value={editForm.course_code}
                    onChange={e => setEditForm({ ...editForm, course_code: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group>
                  <Form.Label className="fw-semibold small">Course Name</Form.Label>
                  <Form.Control
                    value={editForm.course_name}
                    onChange={e => setEditForm({ ...editForm, course_name: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group>
                  <Form.Label className="fw-semibold small">Semester</Form.Label>
                  <Form.Control
                    value={editForm.semester}
                    onChange={e => setEditForm({ ...editForm, semester: e.target.value })}
                    placeholder="e.g. 2025-2026 Spring"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold small">Attendance Threshold (%)</Form.Label>
                  <Form.Control
                    type="number"
                    min={0} max={100}
                    value={editForm.attendance_threshold}
                    onChange={e => setEditForm({ ...editForm, attendance_threshold: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="fw-semibold small mb-0">Schedule</Form.Label>
                <Button size="sm" variant="outline-danger" onClick={addScheduleRow} className="d-flex align-items-center gap-1">
                  <PlusCircleFill size={13} /> Add Day
                </Button>
              </div>
              {editForm.schedules.map((sch, i) => (
                <Row key={i} className="g-2 mb-2 align-items-center">
                  <Col xs={5} md={4}>
                    <Form.Select
                      value={sch.day}
                      onChange={e => handleEditScheduleChange(i, 'day', e.target.value)}
                      size="sm"
                    >
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </Form.Select>
                  </Col>
                  <Col xs={3} md={3}>
                    <Form.Control
                      type="time"
                      size="sm"
                      value={sch.start_time}
                      onChange={e => handleEditScheduleChange(i, 'start_time', e.target.value)}
                    />
                  </Col>
                  <Col xs={3} md={3}>
                    <Form.Control
                      type="time"
                      size="sm"
                      value={sch.end_time}
                      onChange={e => handleEditScheduleChange(i, 'end_time', e.target.value)}
                    />
                  </Col>
                  <Col xs={1} md={2}>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => removeScheduleRow(i)}
                      disabled={editForm.schedules.length === 1}
                    >
                      <TrashFill size={12} />
                    </Button>
                  </Col>
                </Row>
              ))}
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button type="submit" variant="danger" disabled={editLoading}>
                {editLoading ? <><Spinner size="sm" className="me-1" />Saving...</> : 'Save Changes'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Enroll Student Modal */}
      <Modal show={showEnrollModal} onHide={() => { setShowEnrollModal(false); setStudentUUID(''); setSearchResults([]); }}>
        <Modal.Header closeButton><Modal.Title>Enroll Student</Modal.Title></Modal.Header>
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
                  } else setSearchResults([]);
                }}
              />
            </Form.Group>
            {searchResults.length > 0 && (
              <div className="border rounded mb-3">
                {searchResults.map((s) => (
                  <div key={s.uuid} className={`p-2 border-bottom ${studentUUID === s.uuid ? 'bg-danger text-white' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setStudentUUID(s.uuid)}>
                    <strong>{s.full_name}</strong> — {s.student_number}
                    <div className="small">{s.email}</div>
                  </div>
                ))}
              </div>
            )}
            {studentUUID && <p className="small text-success">✓ Student selected.</p>}
            <Button type="submit" variant="danger" className="w-100" disabled={!studentUUID}>Enroll</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Upload Student List Modal */}
      <Modal show={showStudentUploadModal} onHide={() => setShowStudentUploadModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Upload Student List</Modal.Title></Modal.Header>
        <Modal.Body>
          <Alert variant="danger" className="small">
            Excel file must contain a <strong>student_number</strong> column.
          </Alert>
          <Button variant="outline-secondary" size="sm" className="mb-3 d-flex align-items-center gap-1" onClick={downloadStudentTemplate}>
            <Download size={14} /> Download Template
          </Button>
          <Form.Group>
            <Form.Label>Select Excel File (.xlsx)</Form.Label>
            <Form.Control type="file" accept=".xlsx,.xls" ref={studentFileRef} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStudentUploadModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleStudentUpload} disabled={uploadLoading}>
            {uploadLoading ? <Spinner size="sm" /> : 'Upload'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirm Modal */}
      <Modal show={confirmModal.show} onHide={() => setConfirmModal({ ...confirmModal, show: false })} centered>
        <Modal.Header closeButton><Modal.Title>{confirmModal.title}</Modal.Title></Modal.Header>
        <Modal.Body><p>{confirmModal.message}</p></Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirm}>Confirm</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ManageCourse;
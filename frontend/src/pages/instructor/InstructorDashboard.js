import React, { useEffect, useRef, useState } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert, Badge, Image, Modal, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { getMyCourses, deleteCourse } from '../../services/courseService';
import { getActiveSession, deleteSession } from '../../services/sessionService';
import { PeopleFill, GridFill, PlayCircleFill, StopCircleFill, UpcScan, Download, TrashFill } from 'react-bootstrap-icons';
import api from '../../services/api';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 10;

const InstructorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [activeSessions, setActiveSessions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrModal, setQrModal] = useState({ show: false, course: null, data: null, timeLeft: null });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const scheduleFileRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const c = await getMyCourses();
      setCourses(c);
      const sessionMap = {};
      await Promise.all(c.map(async (course) => {
        try {
          const active = await getActiveSession(course.uuid);
          if (active?.has_active) sessionMap[course.uuid] = active;
        } catch (e) {}
      }));
      setActiveSessions(sessionMap);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const showConfirm = (title, message, onConfirm) => setConfirmModal({ show: true, title, message, onConfirm });

  const handleConfirm = async () => {
    setConfirmModal({ ...confirmModal, show: false });
    if (confirmModal.onConfirm) await confirmModal.onConfirm();
  };

  const handleDeleteCourse = (course) => {
    showConfirm(
      t('instructor.dashboard.deleteCourseTitle'),
      t('instructor.dashboard.deleteCourseMsg', { code: course.course_code, name: course.course_name }),
      async () => {
        try {
          await deleteCourse(course.uuid);
          setSuccess('Course deleted successfully.');
          await fetchData();
        } catch (err) {
          setError('Failed to delete course.');
        }
      }
    );
  };

  const handleGenerateQR = async (course) => {
    const active = activeSessions[course.uuid];
    if (active?.has_active) {
      openQrModal(course, active);
    } else {
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

  const handleScheduleUpload = async () => {
    const file = scheduleFileRef.current?.files[0];
    if (!file) return setError('Please select a file.');
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/timetable/schedule', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(t('instructor.dashboard.scheduleUploaded', { created: response.data.data.created, coursesCreated: response.data.data.coursesCreated }));
      setShowScheduleModal(false);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload schedule.');
    } finally {
      setUploadLoading(false);
    }
  };

  const downloadScheduleTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['course_code', 'course_name', 'semester', 'group_name', 'day', 'start_time', 'end_time'],
      ['CS101', 'Introduction to Computer Science', '2025-2026 Spring', '1', 'Monday', '09:00', '10:30'],
      ['CS101', 'Introduction to Computer Science', '2025-2026 Spring', '1', 'Wednesday', '09:00', '10:30'],
      ['CS101', 'Introduction to Computer Science', '2025-2026 Spring', '2', 'Monday', '12:30', '14:30'],
      ['SOFT404', 'Capstone Project', '2025-2026 Spring', '', 'Tuesday', '13:00', '14:30'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Schedule');
    XLSX.writeFile(wb, 'schedule_template.xlsx');
  };

  const filteredCourses = courses.filter(c =>
    c.course_code.toLowerCase().includes(search.toLowerCase()) ||
    c.course_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.group_name && String(c.group_name).toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);
  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

const totalStudents = courses.length > 0 ? (courses[0].total_unique_students || 0) : 0;
  const activeLiveCount = Object.keys(activeSessions).length;

  const localeMap = { tr: 'tr-TR', fr: 'fr-FR', ar: 'ar-SA', ru: 'ru-RU', en: 'en-GB' };
  const today = new Date().toLocaleDateString(localeMap[i18n.language] || 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <h4 className="mb-0">{t('instructor.dashboard.welcome')} <strong>{user?.full_name}</strong></h4>
          <p className="text-muted mt-1 mb-0 small">{today}</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="danger" onClick={() => setShowScheduleModal(true)} className="d-flex align-items-center gap-1">
            {t('instructor.dashboard.uploadSchedule')}
          </Button>
          <Button variant="danger" onClick={() => navigate('/instructor/courses/new')}>
            {t('instructor.dashboard.newCourse')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg, #b71c1c, #c62828)' }}>
            <Card.Body className="d-flex align-items-center gap-3 py-4">
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px' }}>
                <GridFill size={28} color="white" />
              </div>
              <div>
                <h2 className="mb-0 text-white">{courses.length}</h2>
                <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('instructor.dashboard.myCourses')}</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg, #d32f2f, #e53935)' }}>
            <Card.Body className="d-flex align-items-center gap-3 py-4">
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px' }}>
                <PeopleFill size={28} color="white" />
              </div>
              <div>
                <h2 className="mb-0 text-white">{totalStudents}</h2>
                <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('instructor.dashboard.totalStudents')}</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 h-100" style={{ background: activeLiveCount > 0 ? 'linear-gradient(135deg, #c0392b, #e74c3c)' : 'linear-gradient(135deg, #e53935, #ef5350)' }}>
            <Card.Body className="d-flex align-items-center gap-3 py-4">
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px' }}>
                <UpcScan size={28} color="white" />
              </div>
              <div>
                <h2 className="mb-0 text-white">{activeLiveCount}</h2>
                <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('instructor.dashboard.activeSessions')}</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Courses */}
      <Card className="shadow-sm border-0">
        <Card.Header className="border-bottom py-3">
          <div className="d-flex justify-content-between align-items-center">
            <strong>{t('instructor.dashboard.myCourses')}</strong>
            <Form.Control
              size="sm"
              placeholder={t('instructor.dashboard.searchCourses')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ maxWidth: '200px' }}
            />
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {paginatedCourses.length === 0 ? (
            <p className="text-muted p-3">
              {search ? t('instructor.dashboard.noCoursesFound') : t('instructor.dashboard.noCourses')}
            </p>
          ) : (
            paginatedCourses.map((c, i) => {
              const isLive = !!activeSessions[c.uuid];
              return (
                <div
                  key={c.uuid}
                  className="px-3 py-3"
                  style={{ borderBottom: i < paginatedCourses.length - 1 ? '1px solid var(--bs-border-color)' : 'none' }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div style={{ flex: 1, marginRight: '8px' }}>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <strong>{c.course_code}</strong>
                        {c.group_name && <Badge bg="secondary" style={{ fontSize: '11px' }}>Group {c.group_name}</Badge>}
                        <span className="text-muted">—</span>
                        <span>{c.course_name}</span>
                        {isLive && (
                          <Badge bg="danger" className="d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', display: 'inline-block' }}></span>
                            {t('instructor.dashboard.live')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted small mt-1">
                        {c.semester} · {t('instructor.dashboard.threshold')}: {c.attendance_threshold}% · {c.student_count || 0} {t('instructor.dashboard.students')}
                      </div>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-fill" onClick={() => navigate(`/instructor/courses/${c.uuid}`)}>
                      {t('instructor.dashboard.manage')}
                    </Button>
                    <Button
                      size="sm"
                      variant={isLive ? 'danger' : 'secondary'}
                      className="flex-fill d-flex align-items-center justify-content-center gap-1"
                      onClick={() => handleGenerateQR(c)}
                    >
                      {isLive
                        ? <><PlayCircleFill size={14} /> {t('instructor.dashboard.viewQR')}</>
                        : <><UpcScan size={14} /> {t('instructor.dashboard.generateQR')}</>}
                    </Button>
                    <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDeleteCourse(c); }}>
                      <TrashFill size={14} />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </Card.Body>
        {totalPages > 1 && (
          <Card.Footer className="d-flex justify-content-between align-items-center py-2">
            <small className="text-muted">
              {t('common.showing', { from: (currentPage - 1) * ITEMS_PER_PAGE + 1, to: Math.min(currentPage * ITEMS_PER_PAGE, filteredCourses.length), total: filteredCourses.length })}
            </small>
            <div className="d-flex gap-1">
              <Button size="sm" variant="outline-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>←</Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button key={page} size="sm" variant={currentPage === page ? 'danger' : 'outline-secondary'} onClick={() => setCurrentPage(page)}>{page}</Button>
              ))}
              <Button size="sm" variant="outline-secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>→</Button>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* QR Modal */}
      <Modal show={qrModal.show} onHide={closeQrModal} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title className="small">
{qrModal.course?.course_code} — {t('instructor.dashboard.activeSession')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <Badge bg={qrModal.timeLeft > 60 ? 'success' : 'danger'} className="fs-5 px-3 py-2 mb-3">
            {formatTime(qrModal.timeLeft)}
          </Badge>
          <p className="text-muted small mb-3">{t('instructor.generateQR.timeRemaining')}</p>
          {qrModal.data?.qr_code && (
            <Image src={qrModal.data.qr_code} fluid className="border rounded p-2" style={{ maxWidth: '250px' }} />
          )}
          <p className="text-muted small mt-3">{t('instructor.generateQR.showQR')}</p>
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
            {t('instructor.generateQR.cancelSession')}
          </Button>
          <Button variant="secondary" size="sm" onClick={closeQrModal}>{t('common.close')}</Button>
        </Modal.Footer>
      </Modal>

      {/* Schedule Upload Modal */}
      <Modal show={showScheduleModal} onHide={() => setShowScheduleModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('common.uploadCourseSchedule')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="small">
            {t('instructor.dashboard.scheduleUploadInfo')}
            <br />{t('instructor.dashboard.scheduleUploadDays')}
            <br />{t('instructor.dashboard.scheduleUploadTime')}
            <br />{t('instructor.dashboard.scheduleUploadMultiple')}
          </Alert>
          <Button variant="outline-secondary" size="sm" className="mb-3 d-flex align-items-center gap-1" onClick={downloadScheduleTemplate}>
            <Download size={14} /> {t('common.download')}
          </Button>
          <Form.Group>
            <Form.Label>{t('common.selectExcelFile')}</Form.Label>
            <Form.Control type="file" accept=".xlsx,.xls" ref={scheduleFileRef} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={handleScheduleUpload} disabled={uploadLoading}>
            {uploadLoading ? <Spinner size="sm" /> : t('common.upload')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirm Modal */}
      <Modal show={confirmModal.show} onHide={() => setConfirmModal({ ...confirmModal, show: false })} centered>
        <Modal.Header closeButton>
          <Modal.Title>{confirmModal.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body><p>{confirmModal.message}</p></Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={handleConfirm}>{t('common.delete')}</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default InstructorDashboard;
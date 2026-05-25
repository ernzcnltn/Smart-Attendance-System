import React, { useEffect, useState } from 'react';
import { Container, Card, Table, Badge, Spinner, Alert, Form, Row, Col, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { getMyAttendance } from '../../services/sessionService';
import { formatDate } from '../../utils/helpers';

const ITEMS_PER_PAGE = 10;

const MyAttendance = () => {
  const { t, i18n } = useTranslation();
  const localeMap = { tr: 'tr-TR', fr: 'fr-FR', ar: 'ar-SA', ru: 'ru-RU', en: 'en-GB' };
  const locale = localeMap[i18n.language] || 'en-GB';
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [instructorFilter, setInstructorFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getMyAttendance();
        setRecords(data); setFiltered(data);
      } catch { setError('Failed to load attendance records.'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const courses = [...new Set(records.map(r => r.course_code))];
  const instructors = [...new Set(records.map(r => r.instructor_name).filter(Boolean))];

  const applyFilter = (course, instructor, start, end) => {
    let result = [...records];
    if (course) result = result.filter(r => r.course_code === course);
    if (instructor) result = result.filter(r => r.instructor_name === instructor);
    if (start) result = result.filter(r => new Date(r.session_date) >= new Date(start));
    if (end) result = result.filter(r => new Date(r.session_date) <= new Date(end));
    setFiltered(result); setCurrentPage(1);
  };

  const handleFilter = () => applyFilter(courseFilter, instructorFilter, startDate, endDate);
  const handleReset = () => { setCourseFilter(''); setInstructorFilter(''); setStartDate(''); setEndDate(''); setFiltered(records); setCurrentPage(1); };
  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); handleFilter(); } };

  const formatDateTime = (val) => {
    if (!val) return '—';
    const d = new Date(val);
    return `${d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatMethod = (method) => method ? method.charAt(0).toUpperCase() + method.slice(1).toLowerCase() : '—';

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const PaginationBar = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="d-flex justify-content-between align-items-center mt-3 px-1">
        <small className="text-muted">
          {t('myAttendance.showing', { from: (currentPage - 1) * ITEMS_PER_PAGE + 1, to: Math.min(currentPage * ITEMS_PER_PAGE, filtered.length), total: filtered.length })}
        </small>
        <div className="d-flex gap-1 flex-wrap">
          <Button size="sm" variant="outline-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>&larr;</Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Button key={p} size="sm" variant={currentPage === p ? 'danger' : 'outline-secondary'} onClick={() => setCurrentPage(p)}>{p}</Button>
          ))}
          <Button size="sm" variant="outline-secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>&rarr;</Button>
        </div>
      </div>
    );
  };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" style={{ color: '#dc2626' }} /></Container>;

  return (
    <Container>
      <h4 className="mb-4 fw-bold">{t('myAttendance.title')}</h4>
      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="shadow-sm mb-4 border-0" style={{ borderRadius: '14px' }}>
        <Card.Body className="p-4">
          <Row className="g-3 align-items-end">
            <Col xs={12} sm={6} md={2}>
              <Form.Label className="small fw-semibold">{t('myAttendance.course')}</Form.Label>
              <Form.Select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} onKeyDown={handleKeyDown} style={{ borderRadius: '8px' }}>
                <option value="">{t('myAttendance.allCourses')}</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </Form.Select>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Form.Label className="small fw-semibold">{t('myAttendance.instructor')}</Form.Label>
              <Form.Select value={instructorFilter} onChange={e => setInstructorFilter(e.target.value)} onKeyDown={handleKeyDown} style={{ borderRadius: '8px' }}>
                <option value="">{t('myAttendance.allInstructors')}</option>
                {instructors.map(ins => <option key={ins} value={ins}>{ins}</option>)}
              </Form.Select>
            </Col>
            <Col xs={6} sm={4} md={2}>
              <Form.Label className="small fw-semibold">{t('myAttendance.startDate')}</Form.Label>
              <Form.Control type="date" value={startDate} onChange={e => setStartDate(e.target.value)} onKeyDown={handleKeyDown} style={{ borderRadius: '8px' }} />
            </Col>
            <Col xs={6} sm={4} md={2}>
              <Form.Label className="small fw-semibold">{t('myAttendance.endDate')}</Form.Label>
              <Form.Control type="date" value={endDate} onChange={e => setEndDate(e.target.value)} onKeyDown={handleKeyDown} style={{ borderRadius: '8px' }} />
            </Col>
            <Col xs={12} sm={4} md={3}>
              <div className="d-flex gap-2">
                <Button variant="danger" onClick={handleFilter} className="w-50" style={{ borderRadius: '8px' }}>{t('common.filter')}</Button>
                <Button variant="outline-secondary" onClick={handleReset} className="w-50" style={{ borderRadius: '8px' }}>{t('common.reset')}</Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {filtered.length === 0 ? (
        <Card className="shadow-sm border-0" style={{ borderRadius: '14px' }}>
          <Card.Body className="text-center py-5 text-muted"><p className="mb-0">{t('myAttendance.noRecords')}</p></Card.Body>
        </Card>
      ) : (
        <>
          <Card className="shadow-sm border-0 d-none d-md-block" style={{ borderRadius: '14px', overflow: 'hidden' }}>
            <Card.Body className="p-0">
              <Table hover className="mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>{t('myAttendance.course')}</th>
                    <th>{t('myAttendance.instructor')}</th>
                    <th>{t('myAttendance.date')}</th>
                    <th>{t('myAttendance.time')}</th>
                    <th>{t('myAttendance.method')}</th>
                    <th>{t('myAttendance.markedAt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.course_code}</strong><br /><small className="text-muted">{r.course_name}</small></td>
                      <td className="small">{r.instructor_name || '—'}</td>
                      <td className="small">{formatDate(r.session_date)}</td>
                      <td className="small">{r.start_time} – {r.end_time}</td>
                      <td><Badge bg="info" text="dark">{formatMethod(r.method)}</Badge></td>
                      <td className="small">{formatDateTime(r.marked_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          <div className="d-md-none">
            {paginated.map((r, i) => (
              <Card key={i} className="shadow-sm border-0 mb-3" style={{ borderRadius: '12px' }}>
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <strong>{r.course_code}</strong>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>{r.course_name}</div>
                    </div>
                    <Badge bg="info" text="dark">{formatMethod(r.method)}</Badge>
                  </div>
                  <hr className="my-2" />
                  <div style={{ fontSize: '0.82rem' }}>
                    <div className="d-flex justify-content-between mb-1"><span className="text-muted">{t('myAttendance.instructor')}</span><span>{r.instructor_name || '—'}</span></div>
                    <div className="d-flex justify-content-between mb-1"><span className="text-muted">{t('myAttendance.date')}</span><span>{formatDate(r.session_date)}</span></div>
                    <div className="d-flex justify-content-between mb-1"><span className="text-muted">{t('myAttendance.time')}</span><span>{r.start_time} – {r.end_time}</span></div>
                    <div className="d-flex justify-content-between"><span className="text-muted">{t('myAttendance.markedAt')}</span><span>{formatDateTime(r.marked_at)}</span></div>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
          <PaginationBar />
        </>
      )}
    </Container>
  );
};

export default MyAttendance;
import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Modal, Button, Tab, Nav, Table, ProgressBar, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getMyCourses } from '../../services/courseService';
import { getMyAttendanceStats, getMySessionHistory } from '../../services/attendanceService';
import api from '../../services/api';
import { GridFill, ListUl, BookFill, PersonFill, CalendarFill, ClockFill } from 'react-bootstrap-icons';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ITEMS_PER_PAGE = 10;

const SessionTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const attended = payload[0]?.payload?.attended;
  const date = payload[0]?.payload?.date;
  return (
    <div style={{
      background: 'var(--tt-bg, rgba(10,10,16,0.96))',
      border: `1px solid ${attended ? '#16a34a' : '#dc2626'}40`,
      borderRadius: '10px', padding: '10px 14px', fontSize: '13px',
      backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
    }}>
      <p style={{ color: '#94a3b8', margin: '0 0 4px', fontWeight: 600, fontSize: '11px' }}>{date}</p>
      <p style={{ margin: 0, fontWeight: 700, color: attended ? '#4ade80' : '#f87171' }}>
        {attended ? '✓ Attended' : '✗ Absent'}
      </p>
    </div>
  );
};

const MyCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [sessionHistories, setSessionHistories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState({ show: false, message: '' });
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCourseUUID, setSelectedCourseUUID] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [attendanceSort, setAttendanceSort] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, stats] = await Promise.all([getMyCourses(), getMyAttendanceStats()]);
        setCourses(c);
        setAttendanceStats(stats);
        if (c.length > 0) setSelectedCourseUUID(c[0].uuid);

        const scheduleMap = {};
        const historyMap = {};
        await Promise.all(c.map(async (course) => {
          try {
            const res = await api.get(`/timetable/schedule/${course.uuid}`);
            scheduleMap[course.uuid] = res.data.data;
          } catch { scheduleMap[course.uuid] = []; }
          try {
            const hist = await getMySessionHistory(course.uuid);
            historyMap[course.uuid] = hist;
          } catch { historyMap[course.uuid] = []; }
        }));
        setSchedules(scheduleMap);
        setSessionHistories(historyMap);
      } catch { setError('Failed to load courses.'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  // Mobilde list view varsa grid'e düşür
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && viewMode === 'list') setViewMode('grid');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  const getCourseStatus = (uuid) => {
    const list = schedules[uuid] || [];
    if (!list.length) return 'no_schedule';
    const now = new Date();
    const todayName = DAYS[now.getDay()];
    const cur = now.toTimeString().split(' ')[0];
    const today = list.filter(s => s.day === todayName);
    if (!today.length) return 'not_today';
    for (const s of today) {
      const st = s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time;
      const en = s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time;
      if (cur >= st && cur <= en) return 'active';
      if (cur < st) return { status: 'upcoming', start_time: s.start_time.substring(0, 5), end_time: s.end_time.substring(0, 5) };
    }
    return 'ended';
  };

  const handleCourseClick = (course) => {
    const status = getCourseStatus(course.uuid);
    if (status === 'active') { navigate(`/student/face-attendance/${course.uuid}`); return; }
    if (status === 'no_schedule') { setPopup({ show: true, message: 'No schedule has been set for this course yet.' }); return; }
    if (status === 'not_today') {
      const days = (schedules[course.uuid] || []).map(s => s.day).join(', ');
      setPopup({ show: true, message: `This course is not scheduled for today. Class days: ${days}` });
      return;
    }
    if (status === 'ended') { setPopup({ show: true, message: "Today's class for this course has already ended." }); return; }
    if (status?.status === 'upcoming') { setPopup({ show: true, message: `Class hasn't started yet. It will begin at ${status.start_time} and end at ${status.end_time}.` }); return; }
  };

  const getStatusBadge = (uuid) => {
    const s = getCourseStatus(uuid);
    if (s === 'active') return <Badge bg="success">Active</Badge>;
    if (s === 'no_schedule') return <Badge bg="secondary">No Schedule</Badge>;
    if (s === 'not_today') return <Badge bg="secondary">Not Today</Badge>;
    if (s === 'ended') return <Badge bg="danger">Ended</Badge>;
    if (s?.status === 'upcoming') return <Badge bg="primary">Starts {s.start_time}</Badge>;
    return null;
  };

  const isActive = (uuid) => getCourseStatus(uuid) === 'active';
  const getCourseStat = (code) => attendanceStats.find(s => s.course_code === code);

  const handleAttendanceSort = () => {
    setAttendanceSort(prev => prev === 'asc' ? 'desc' : 'asc');
    setCurrentPage(1);
  };

  const getSortedCourses = () => {
    if (!attendanceSort) return courses;
    return [...courses].sort((a, b) => {
      const sa = getCourseStat(a.course_code)?.percentage ?? 0;
      const sb = getCourseStat(b.course_code)?.percentage ?? 0;
      return attendanceSort === 'asc' ? sa - sb : sb - sa;
    });
  };

  const sortedCourses = getSortedCourses();
  const totalPages = Math.ceil(sortedCourses.length / ITEMS_PER_PAGE);
  const paginatedCourses = sortedCourses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const selectedCourse = courses.find(c => c.uuid === selectedCourseUUID) || null;
  const selectedStat = selectedCourse ? getCourseStat(selectedCourse.course_code) : null;

  const PaginationBar = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="d-flex justify-content-between align-items-center mt-3">
        <small className="text-muted">
          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, sortedCourses.length)} of {sortedCourses.length}
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

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" style={{ color: '#ef4444' }} /></Container>;

  return (
    <Container>
      <style>{`
        :root {
          --tt-bg: rgba(255,255,255,0.97);
          --chart-grid: rgba(0,0,0,0.06);
          --chart-axis: #374151;
        }
        [data-bs-theme="dark"] {
          --tt-bg: rgba(10,10,16,0.96);
          --chart-grid: rgba(255,255,255,0.07);
          --chart-axis: #cbd5e1;
        }
        .course-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border-radius: 14px !important;
          overflow: hidden;
        }
        .course-card:hover { transform: translateY(-4px); }
        .course-card.active-course {
          border: 2px solid #16a34a !important;
          box-shadow: 0 4px 20px rgba(22,163,74,0.2) !important;
        }
        .course-card.inactive-course { opacity: 0.55; }
        .recharts-cartesian-axis-tick-value {
          fill: var(--chart-axis) !important;
          font-weight: 500 !important;
          font-size: 12px !important;
        }
        .recharts-cartesian-grid-horizontal line { stroke: var(--chart-grid) !important; }
        .recharts-legend-item-text { color: var(--chart-axis) !important; font-weight: 500 !important; }
        .recharts-wrapper, .recharts-surface,
        .recharts-wrapper *:focus, .recharts-surface *:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        .course-select:focus {
          border-color: #dc2626 !important;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.15) !important;
        }
      `}</style>

      <h4 className="mb-4 fw-bold">My Courses</h4>
      {error && <Alert variant="danger">{error}</Alert>}

      <Tab.Container defaultActiveKey="courses">
        <Nav variant="tabs" className="mb-4">
          <Nav.Item><Nav.Link eventKey="courses">Courses</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="overview">Overview</Nav.Link></Nav.Item>
        </Nav>

        <Tab.Content>
          {/* ─── Tab 1: Courses ─── */}
          <Tab.Pane eventKey="courses">
            <div className="d-flex justify-content-end mb-3 gap-2">
              <Button variant={viewMode === 'grid' ? 'danger' : 'outline-secondary'} size="sm"
                onClick={() => { setViewMode('grid'); setCurrentPage(1); }}>
                <GridFill size={15} />
              </Button>
              {/* List view sadece desktop'ta görünür */}
              <Button variant={viewMode === 'list' ? 'danger' : 'outline-secondary'} size="sm"
                className="d-none d-md-inline-flex"
                onClick={() => { setViewMode('list'); setCurrentPage(1); }}>
                <ListUl size={15} />
              </Button>
            </div>

            {courses.length === 0 ? (
              <Card className="shadow-sm border-0 text-center py-5">
                <Card.Body><h5 className="text-muted">No courses enrolled yet.</h5></Card.Body>
              </Card>
            ) : viewMode === 'grid' ? (
              <>
                <Row className="g-3">
                  {paginatedCourses.map((course) => {
                    const active = isActive(course.uuid);
                    return (
                      <Col md={6} lg={4} key={course.uuid}>
                        <Card
                          className={`shadow-sm course-card ${active ? 'active-course' : 'inactive-course'}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleCourseClick(course)}
                        >
                          <div style={{ height: '4px', background: active ? 'linear-gradient(90deg,#16a34a,#4ade80)' : 'linear-gradient(90deg,#dc2626,#f87171)' }} />
                          <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fw-bold" style={{ fontSize: '1rem' }}>{course.course_code}</span>
                                  {course.group_name && <Badge bg="secondary" style={{ fontSize: '10px' }}>Group {course.group_name}</Badge>}
                                </div>
                                <p className="text-muted mb-0" style={{ fontSize: '0.8rem', marginTop: '2px' }}>{course.course_name}</p>
                              </div>
                              {getStatusBadge(course.uuid)}
                            </div>
                            <hr className="my-2" />
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <PersonFill size={12} className="text-muted" />
                              <span className="small text-muted">{course.instructor_name}</span>
                            </div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <CalendarFill size={12} className="text-muted" />
                              <span className="small text-muted">{course.semester}</span>
                            </div>
                            {schedules[course.uuid]?.length > 0 && (
                              <div className="mt-2">
                                {schedules[course.uuid].map((s, i) => (
                                  <div key={i} className="d-flex align-items-center gap-2">
                                    <ClockFill size={11} className="text-muted" />
                                    <span className="small text-muted">{s.day}: {s.start_time.substring(0, 5)} – {s.end_time.substring(0, 5)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {(() => {
                              const stat = getCourseStat(course.course_code);
                              if (!stat) return null;
                              return (
                                <div className="mt-3">
                                  <div className="d-flex justify-content-between mb-1">
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Attendance</span>
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: stat.percentage >= stat.threshold ? '#16a34a' : '#dc2626' }}>
                                      {stat.percentage}%
                                    </span>
                                  </div>
                                  <ProgressBar now={stat.percentage} variant={stat.percentage >= stat.threshold ? 'success' : 'danger'} style={{ height: '5px', borderRadius: '3px' }} />
                                </div>
                              );
                            })()}
                          </Card.Body>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
                <PaginationBar />
              </>
            ) : (
              /* List view — sadece desktop */
              <>
                <Card className="shadow-sm border-0" style={{ borderRadius: '14px', overflow: 'hidden' }}>
                  <Card.Body className="p-0">
                    <Table hover className="mb-0">
                      <thead className="table-dark">
                        <tr>
                          <th>Course</th>
                          <th>Instructor</th>
                          <th>Schedule</th>
                          <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={handleAttendanceSort}>
                            <div className="d-flex align-items-center gap-1">
                              Attendance
                              <span style={{ opacity: attendanceSort ? 1 : 0.4 }}>
                                {attendanceSort === 'asc' ? '↑' : attendanceSort === 'desc' ? '↓' : '↕'}
                              </span>
                            </div>
                          </th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCourses.map((course) => {
                          const stat = getCourseStat(course.course_code);
                          return (
                            <tr key={course.uuid} style={{ cursor: 'pointer', opacity: isActive(course.uuid) ? 1 : 0.65 }} onClick={() => handleCourseClick(course)}>
                              <td>
                                <strong>{course.course_code}</strong>
                                {course.group_name && <Badge bg="secondary" className="ms-1" style={{ fontSize: '10px' }}>Group {course.group_name}</Badge>}
                                <div className="small text-muted">{course.course_name}</div>
                              </td>
                              <td className="small">{course.instructor_name}</td>
                              <td className="small">
                                {schedules[course.uuid]?.map((s, i) => (
                                  <div key={i}>{s.day}: {s.start_time.substring(0, 5)}–{s.end_time.substring(0, 5)}</div>
                                ))}
                              </td>
                              <td style={{ minWidth: '110px' }}>
                                {stat ? (
                                  <div>
                                    <div className="small fw-bold mb-1" style={{ color: stat.percentage >= stat.threshold ? '#16a34a' : '#dc2626' }}>
                                      {stat.percentage}%
                                    </div>
                                    <ProgressBar now={stat.percentage} variant={stat.percentage >= stat.threshold ? 'success' : 'danger'} style={{ height: '5px' }} />
                                  </div>
                                ) : <span className="text-muted small">—</span>}
                              </td>
                              <td>{getStatusBadge(course.uuid)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
                <PaginationBar />
              </>
            )}
          </Tab.Pane>

          {/* ─── Tab 2: Overview ─── */}
          <Tab.Pane eventKey="overview">
            {courses.length === 0 ? (
              <p className="text-muted">No courses enrolled yet.</p>
            ) : (
              <>
                {/* Course Selector */}
                <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '14px' }}>
                  <Card.Body className="p-4">
                    <p className="mb-2 fw-semibold" style={{
                      fontSize: '0.72rem', letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: '#dc2626'
                    }}>
                      Select Course
                    </p>
                    <Form.Select
                      className="course-select"
                      value={selectedCourseUUID}
                      onChange={e => setSelectedCourseUUID(e.target.value)}
                      style={{
                        borderRadius: '10px', fontWeight: 600,
                        fontSize: '0.95rem', borderColor: 'rgba(220,38,38,0.3)',
                        padding: '10px 14px', cursor: 'pointer'
                      }}
                    >
                      {courses.map(c => (
                        <option key={c.uuid} value={c.uuid}>{c.course_code} — {c.course_name}</option>
                      ))}
                    </Form.Select>
                  </Card.Body>
                </Card>

                {/* Detail Panel */}
                {selectedCourse && (() => {
                  const stat = selectedStat;
                  const sch = schedules[selectedCourse.uuid] || [];

                  const barData = stat ? [
                    { name: 'Attended', value: stat.attended_sessions, color: '#16a34a' },
                    { name: 'Missed', value: stat.total_sessions - stat.attended_sessions, color: '#dc2626' },
                  ] : [];

                  const rawHistory = sessionHistories[selectedCourse.uuid] || [];
                  const areaData = rawHistory.map((s) => {
                    const d = new Date(s.session_date);
                    return {
                      session: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
                      date: d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
                      attended: s.attended,
                      value: s.attended ? 100 : 0,
                      threshold: stat ? stat.threshold : 70
                    };
                  });

                  return (
                    <Card className="shadow-sm border-0" style={{ borderRadius: '14px' }}>
                      <div style={{ height: '4px', background: 'linear-gradient(90deg,#dc2626,#f87171,#dc2626)' }} />
                      <Card.Header className="border-0 pt-4 pb-0 px-4" style={{ background: 'transparent' }}>
                        <div className="d-flex align-items-start justify-content-between">
                          <div>
                            <h6 className="fw-bold mb-0">{selectedCourse.course_code} — {selectedCourse.course_name}</h6>
                            <div className="d-flex gap-3 mt-2 flex-wrap">
                              <span className="small text-muted d-flex align-items-center gap-1">
                                <PersonFill size={12} /> {selectedCourse.instructor_name}
                              </span>
                              <span className="small text-muted d-flex align-items-center gap-1">
                                <CalendarFill size={12} /> {selectedCourse.semester}
                              </span>
                            </div>
                          </div>
                          {getStatusBadge(selectedCourse.uuid)}
                        </div>
                        {sch.length > 0 && (
                          <div className="mt-2 d-flex gap-3 flex-wrap">
                            {sch.map((s, i) => (
                              <span key={i} className="small text-muted d-flex align-items-center gap-1">
                                <ClockFill size={11} /> {s.day}: {s.start_time.substring(0, 5)}–{s.end_time.substring(0, 5)}
                              </span>
                            ))}
                          </div>
                        )}
                      </Card.Header>

                      <Card.Body className="px-4 pb-4 pt-3">
                        {stat ? (
                          <>
                            <Row className="mb-4 g-3">
                              {[
                                { label: 'Attended', value: stat.attended_sessions, color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
                                { label: 'Total Sessions', value: stat.total_sessions, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
                                { label: 'Attendance Rate', value: `${stat.percentage}%`, color: stat.percentage >= stat.threshold ? '#16a34a' : '#dc2626', bg: stat.percentage >= stat.threshold ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)' },
                              ].map((item, i) => (
                                <Col md={4} xs={12} key={i}>
                                  <div style={{ background: item.bg, borderRadius: '12px', padding: '16px', textAlign: 'center', border: `1px solid ${item.color}20` }}>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: item.color, lineHeight: 1 }}>{item.value}</div>
                                    <div className="text-muted mt-1" style={{ fontSize: '0.78rem' }}>{item.label}</div>
                                  </div>
                                </Col>
                              ))}
                            </Row>

                            <div className="mb-4">
                              <div className="d-flex justify-content-between mb-2">
                                <span className="small fw-semibold">Attendance Progress</span>
                                <span className="small fw-bold" style={{ color: stat.percentage >= stat.threshold ? '#16a34a' : '#dc2626' }}>
                                  {stat.percentage}% / {stat.threshold}% required
                                </span>
                              </div>
                              <div style={{ background: 'var(--bs-border-color)', borderRadius: '8px', height: '10px', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', width: `${stat.percentage}%`,
                                  background: stat.percentage >= stat.threshold ? 'linear-gradient(90deg,#16a34a,#4ade80)' : 'linear-gradient(90deg,#dc2626,#f87171)',
                                  borderRadius: '8px', transition: 'width 0.6s ease'
                                }} />
                              </div>
                              {stat.percentage < stat.threshold && (
                                <p className="small text-danger mt-1 mb-0">⚠ You need {stat.threshold - stat.percentage}% more to meet the threshold.</p>
                              )}
                            </div>

                            <Row className="g-3">
                              <Col md={5} xs={12}>
                                <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '12px', padding: '16px' }}>
                                  <p className="small fw-semibold mb-3">Session Breakdown</p>
                                  <ResponsiveContainer width="100%" height={160} style={{ outline: 'none' }}>
                                    <BarChart data={barData} barSize={40} style={{ outline: 'none' }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                      <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                                      <YAxis tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {barData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </Col>
                              <Col md={7} xs={12}>
                                <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '12px', padding: '16px' }}>
                                  <p className="small fw-semibold mb-3">Session History</p>
                                  {areaData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={160} style={{ outline: 'none' }}>
                                      <AreaChart data={areaData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} style={{ outline: 'none' }}>
                                        <defs>
                                          <linearGradient id="gradAtt" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                                          </linearGradient>
                                          <linearGradient id="gradThr" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                          </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="session" tick={{ fontSize: 11, fill: 'var(--chart-axis)', fontWeight: 500 }} axisLine={false} tickLine={false} />
                                        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<SessionTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                                        <Area
                                          type="monotone" dataKey="value"
                                          stroke="#dc2626" strokeWidth={2}
                                          fill="url(#gradAtt)" name="Attendance"
                                          dot={(props) => {
                                            const { cx, cy, payload } = props;
                                            return <circle key={cx} cx={cx} cy={cy} r={5} fill={payload.attended ? '#16a34a' : '#dc2626'} stroke="#fff" strokeWidth={2} />;
                                          }}
                                          activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }}
                                        />
                                        <Area
                                          type="monotone" dataKey="threshold"
                                          stroke="#f59e0b" strokeWidth={2}
                                          strokeDasharray="5 4" fill="url(#gradThr)"
                                          name="Threshold %" dot={false}
                                        />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  ) : (
                                    <div className="text-center py-4 text-muted small">No session history yet.</div>
                                  )}
                                </div>
                              </Col>
                            </Row>
                          </>
                        ) : (
                          <div className="text-center py-5 text-muted">
                            <BookFill size={40} className="mb-3 opacity-50" />
                            <p className="mb-0">No attendance data yet for this course.</p>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  );
                })()}
              </>
            )}
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      <Modal show={popup.show} onHide={() => setPopup({ show: false, message: '' })} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '1rem' }}>Course Information</Modal.Title>
        </Modal.Header>
        <Modal.Body><p className="mb-0">{popup.message}</p></Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={() => setPopup({ show: false, message: '' })}>OK</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MyCourses;
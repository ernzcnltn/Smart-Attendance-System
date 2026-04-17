import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Modal, Button, Tab, Nav, Table, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getMyCourses } from '../../services/courseService';
import { getMyAttendanceStats } from '../../services/attendanceService';
import api from '../../services/api';
import { GridFill, ListUl } from 'react-bootstrap-icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MyCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState({ show: false, message: '' });
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, stats] = await Promise.all([
          getMyCourses(),
          getMyAttendanceStats()
        ]);
        setCourses(c);
        setAttendanceStats(stats);
        if (c.length > 0) setSelectedCourse(c[0]);

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
    const currentTime = now.toTimeString().split(' ')[0];

    const todaySchedules = courseSchedules.filter(s => s.day === todayName);
    if (todaySchedules.length === 0) return 'not_today';

    for (const s of todaySchedules) {
      const startTime = s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time;
      const endTime = s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time;
      if (currentTime >= startTime && currentTime <= endTime) return 'active';
      if (currentTime < startTime) return { status: 'upcoming', start_time: s.start_time.substring(0, 5), end_time: s.end_time.substring(0, 5) };
    }
    return 'ended';
  };

  const handleCourseClick = (course) => {
    const status = getCourseStatus(course.uuid);
    if (status === 'active') { navigate('/student/face-attendance'); return; }
    if (status === 'no_schedule') { setPopup({ show: true, message: 'No schedule has been set for this course yet.' }); return; }
    if (status === 'not_today') {
      const days = (schedules[course.uuid] || []).map(s => s.day).join(', ');
      setPopup({ show: true, message: `This course is not scheduled for today. Class days: ${days}` });
      return;
    }
    if (status === 'ended') { setPopup({ show: true, message: "Today's class for this course has already ended." }); return; }
    if (status?.status === 'upcoming') { setPopup({ show: true, message: `Class hasn't started yet. It will begin at ${status.start_time} and end at ${status.end_time}.` }); return; }
  };

  const getCardStyle = (courseUUID) => {
    const status = getCourseStatus(courseUUID);
    if (status === 'active') return { cursor: 'pointer', border: '2px solid #198754', opacity: 1, transition: 'transform 0.2s' };
    return { cursor: 'pointer', opacity: 0.5, border: '1px solid var(--bs-border-color)', transition: 'transform 0.2s' };
  };

  const getStatusBadge = (courseUUID) => {
    const status = getCourseStatus(courseUUID);
    if (status === 'active') return <Badge bg="success">Active</Badge>;
    if (status === 'no_schedule') return <Badge bg="secondary">No Schedule</Badge>;
    if (status === 'not_today') return <Badge bg="warning" text="dark">Not Today</Badge>;
    if (status === 'ended') return <Badge bg="danger">Ended</Badge>;
    if (status?.status === 'upcoming') return <Badge bg="info" text="dark">Starts {status.start_time}</Badge>;
    return null;
  };

  const getCourseStat = (courseCode) => {
    return attendanceStats.find(s => s.course_code === courseCode);
  };

  const getSelectedStat = () => {
    if (!selectedCourse) return null;
    return getCourseStat(selectedCourse.course_code);
  };

  const getChartData = () => {
    const stat = getSelectedStat();
    if (!stat) return [];
    return [
      { name: stat.course_code, attended: stat.attended_sessions, total: stat.total_sessions, percentage: stat.percentage }
    ];
  };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container>
      <h4 className="mb-4">My Courses</h4>
      {error && <Alert variant="danger">{error}</Alert>}

      <Tab.Container defaultActiveKey="courses">
        <Nav variant="tabs" className="mb-4">
          <Nav.Item>
            <Nav.Link eventKey="courses">Courses</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="overview">Overview</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          {/* Tab 1 — Courses */}
          <Tab.Pane eventKey="courses">
            <div className="d-flex justify-content-end mb-3 gap-2">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'outline-secondary'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <GridFill size={16} />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'outline-secondary'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <ListUl size={16} />
              </Button>
            </div>

            {courses.length === 0 ? (
              <Card className="shadow-sm border-0">
                <Card.Body className="text-center py-5">
                  <h5 className="text-muted">No courses enrolled yet.</h5>
                </Card.Body>
              </Card>
            ) : viewMode === 'grid' ? (
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
    <div className="d-flex align-items-center gap-2">
      <h6 className="fw-bold mb-0">{course.course_code}</h6>
      {course.group_name && <Badge bg="secondary" style={{ fontSize: '11px' }}>Group {course.group_name}</Badge>}
    </div>
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
            ) : (
              <Card className="shadow-sm border-0">
                <Card.Body className="p-0">
                  <Table responsive hover className="mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th>Course</th>
                        <th>Instructor</th>
                        <th>Semester</th>
                        <th>Schedule</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course) => (
                        <tr
                          key={course.uuid}
                          style={{ cursor: 'pointer', opacity: getCourseStatus(course.uuid) === 'active' ? 1 : 0.6 }}
                          onClick={() => handleCourseClick(course)}
                        >
                          <td>
  <strong>{course.course_code}</strong>
  {course.group_name && <Badge bg="secondary" className="ms-1" style={{ fontSize: '11px' }}>Group {course.group_name}</Badge>}
  <div className="small text-muted">{course.course_name}</div>
</td>
                          <td className="small">{course.instructor_name}</td>
                          <td className="small">{course.semester}</td>
                          <td className="small">
                            {schedules[course.uuid]?.map((s, i) => (
                              <div key={i}>{s.day}: {s.start_time.substring(0, 5)}-{s.end_time.substring(0, 5)}</div>
                            ))}
                          </td>
                          <td>{getStatusBadge(course.uuid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}
          </Tab.Pane>

          {/* Tab 2 — Overview */}
          <Tab.Pane eventKey="overview">
            {courses.length === 0 ? (
              <p className="text-muted">No courses enrolled yet.</p>
            ) : (
              <Row className="g-3">
                {/* Sol — Ders Listesi */}
                <Col md={3}>
                  <Card className="shadow-sm border-0">
                    <Card.Header className="border-bottom py-3">
                      <strong>Courses</strong>
                    </Card.Header>
                    <Card.Body className="p-0">
                      {courses.map((course) => (
                        <div
                          key={course.uuid}
                          onClick={() => setSelectedCourse(course)}
                          style={{
                            cursor: 'pointer',
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--bs-border-color)',
                            background: selectedCourse?.uuid === course.uuid ? 'var(--bs-primary)' : 'transparent',
                            color: selectedCourse?.uuid === course.uuid ? 'white' : 'inherit'
                          }}
                        >
                          <div className="fw-bold small">{course.course_code}</div>
                          <div className="small" style={{ opacity: 0.7 }}>{course.course_name}</div>
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>

                {/* Sağ — Seçilen Ders Detayı */}
                <Col md={9}>
                  {selectedCourse && (() => {
                    const stat = getSelectedStat();
                    return (
                      <Card className="shadow-sm border-0">
                        <Card.Header className="border-bottom py-3">
                          <strong>{selectedCourse.course_code} — {selectedCourse.course_name}</strong>
                        </Card.Header>
                        <Card.Body>
                          {stat ? (
                            <>
                              <Row className="mb-4 g-3">
                                <Col md={4}>
                                  <Card className="text-center border-0 shadow-sm">
                                    <Card.Body>
                                      <h3 className="text-primary">{stat.attended_sessions}</h3>
                                      <p className="text-muted small mb-0">Attended</p>
                                    </Card.Body>
                                  </Card>
                                </Col>
                                <Col md={4}>
                                  <Card className="text-center border-0 shadow-sm">
                                    <Card.Body>
                                      <h3 className="text-secondary">{stat.total_sessions}</h3>
                                      <p className="text-muted small mb-0">Total Sessions</p>
                                    </Card.Body>
                                  </Card>
                                </Col>
                                <Col md={4}>
                                  <Card className="text-center border-0 shadow-sm">
                                    <Card.Body>
                                      <h3 className={stat.percentage >= stat.threshold ? 'text-success' : 'text-danger'}>
                                        {stat.percentage}%
                                      </h3>
                                      <p className="text-muted small mb-0">Attendance</p>
                                    </Card.Body>
                                  </Card>
                                </Col>
                              </Row>

                              <div className="mb-4">
                                <div className="d-flex justify-content-between mb-1">
                                  <small>Attendance Rate</small>
                                  <small>{stat.percentage}% / {stat.threshold}% required</small>
                                </div>
                                <ProgressBar
                                  now={stat.percentage}
                                  variant={stat.percentage >= stat.threshold ? 'success' : 'danger'}
                                  style={{ height: '12px', borderRadius: '6px' }}
                                  label={`${stat.percentage}%`}
                                />
                                {stat.percentage < stat.threshold && (
                                  <small className="text-danger mt-1 d-block">
                                    ⚠ You need {stat.threshold - stat.percentage}% more attendance to meet the threshold.
                                  </small>
                                )}
                              </div>

                              <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={[
                                  { name: 'Attended', value: stat.attended_sessions },
                                  { name: 'Missed', value: stat.total_sessions - stat.attended_sessions },
                                  { name: 'Total', value: stat.total_sessions }
                                ]}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Line type="monotone" dataKey="value" stroke="#c0392b" strokeWidth={2} dot={{ r: 5 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </>
                          ) : (
                            <p className="text-muted text-center py-4">No attendance data yet for this course.</p>
                          )}
                        </Card.Body>
                      </Card>
                    );
                  })()}
                </Col>
              </Row>
            )}
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      <Modal show={popup.show} onHide={() => setPopup({ show: false, message: '' })} centered>
        <Modal.Header closeButton>
          <Modal.Title>Course Information</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{popup.message}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setPopup({ show: false, message: '' })}>OK</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MyCourses;
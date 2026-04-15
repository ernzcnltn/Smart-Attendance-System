import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Button } from 'react-bootstrap';
import { CameraFill, ClipboardDataFill, PersonCheckFill, ExclamationTriangleFill } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyCourses } from '../../services/courseService';
import { getMyNotifications, getMyAttendanceStats } from '../../services/attendanceService';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';



const COLORS = ['#c0392b', '#0f3460', '#533483', '#198754', '#ffc107', '#0dcaf0'];

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, s, n] = await Promise.all([
          getMyCourses(),
          getMyAttendanceStats(),
          getMyNotifications()
        ]);
        setCourses(c);
        setAttendanceStats(s);
        setNotifications(n);
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalAttendances = attendanceStats.reduce((acc, s) => acc + s.attended_sessions, 0);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const lineData = attendanceStats.map(s => ({
    course: s.course_code,
    percentage: s.percentage,
    threshold: s.threshold
  }));

  const pieData = attendanceStats.map(s => ({
  name: s.course_code,
  value: s.percentage
}));

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;

  return (
    <Container>
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 pb-3 border-bottom">
        <div>
          <h4 className="mb-0">Welcome back, <strong>{user?.full_name}</strong></h4>
          <p className="text-muted mt-1 mb-0 small">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button
          variant="danger"
          className="d-flex align-items-center gap-2"
          onClick={() => navigate('/student/face-attendance')}
        >
          <CameraFill size={16} />
          <span className="d-none d-sm-inline">Take Attendance</span>
        </Button>
      </div>

      {/* Stats */}
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
                <h2 className="mb-0 text-white">{totalAttendances}</h2>
                <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.7)' }}>Total Attendances</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card
            className="shadow-sm border-0 h-100"
            style={{ background: unreadCount > 0 ? 'linear-gradient(135deg, #c0392b, #e74c3c)' : 'linear-gradient(135deg, #1e3c72, #2a5298)', cursor: unreadCount > 0 ? 'pointer' : 'default' }}
            onClick={() => unreadCount > 0 && navigate('/student/notifications')}
          >
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

      {/* Charts */}
      {courses.length > 0 ? (
        <Row className="mb-4 g-3">
          <Col md={7}>
            <Card className="shadow-sm border-0 h-100">
              <Card.Header className="border-bottom py-3">
                <strong>Attendance Percentage by Course</strong>
              </Card.Header>
              <Card.Body>
                {lineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="course" />
                      <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Line type="monotone" dataKey="percentage" stroke="#c0392b" strokeWidth={2} name="Attendance %" dot={{ r: 5 }} />
                      <Line type="monotone" dataKey="threshold" stroke="#ffc107" strokeWidth={2} strokeDasharray="5 5" name="Threshold %" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-center py-4">No session data yet.</p>
                )}
              </Card.Body>
            </Card>
          </Col>

        <Col md={5}>
  <Card className="shadow-sm border-0 h-100">
    <Card.Header className="border-bottom py-3">
      <strong>Attendance Distribution</strong>
    </Card.Header>
   <Card.Body className="d-flex flex-column align-items-center justify-content-center">
  <ResponsiveContainer width="100%" height={200}>
    <PieChart>
      <Pie
        data={pieData.map(d => ({ ...d, value: d.value === 0 ? 0.1 : d.value }))}
        cx="50%"
        cy="50%"
        outerRadius={80}
        dataKey="value"
        label={false}
      >
        {pieData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip formatter={(value, name) => {
        const real = pieData.find(d => d.name === name);
        return [`${real ? real.value : value}%`, name];
      }} />
    </PieChart>
  </ResponsiveContainer>
  <div className="d-flex flex-wrap justify-content-center gap-2 mt-2">
    {pieData.map((entry, index) => (
      <div key={index} className="d-flex align-items-center gap-1">
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS[index % COLORS.length] }} />
        <small>{entry.name}: {entry.value}%</small>
      </div>
    ))}
  </div>
</Card.Body>
  </Card>
</Col>
        </Row>
      ) : (
        <Card className="shadow-sm border-0 mb-4">
          <Card.Body className="text-center py-5">
            <ClipboardDataFill size={48} className="text-muted mb-3" />
            <h5 className="text-muted">No courses enrolled yet</h5>
            <p className="text-muted small">Your attendance charts will appear here once you are enrolled in courses.</p>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default StudentDashboard;
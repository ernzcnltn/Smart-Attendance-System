import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Button } from 'react-bootstrap';
import { CameraFill, ClipboardDataFill, PersonCheckFill, ExclamationTriangleFill } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { getMyCourses } from '../../services/courseService';
import { getMyNotifications, getMyAttendanceStats } from '../../services/attendanceService';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

const COLORS = ['#ef4444', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16'];

const CustomLineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--tooltip-bg, rgba(15,15,20,0.95))', border: '1px solid var(--tooltip-border, rgba(255,255,255,0.1))', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
      <p style={{ color: 'var(--tooltip-label, #94a3b8)', margin: '0 0 6px', fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0', fontWeight: 500 }}>{p.name}: <strong>{p.value}%</strong></p>
      ))}
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const real = payload[0];
  return (
    <div style={{ background: 'var(--tooltip-bg, rgba(15,15,20,0.95))', border: `1px solid ${real.payload.fill}40`, borderRadius: '10px', padding: '8px 14px', fontSize: '13px', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
      <span style={{ color: real.payload.fill, fontWeight: 600 }}>{real.name}: </span>
      <strong style={{ color: 'var(--tooltip-value, #fff)' }}>{real.payload.realValue}%</strong>
    </div>
  );
};

const CustomLegend = ({ pieData }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px', marginTop: '12px', padding: '0 8px' }}>
    {pieData.map((entry, index) => (
      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[index % COLORS.length], boxShadow: `0 0 6px ${COLORS[index % COLORS.length]}80`, flexShrink: 0 }} />
        <span style={{ color: 'var(--legend-color, #64748b)', fontWeight: 500 }}>
          {entry.name}: <strong style={{ color: 'var(--legend-value, #1e293b)' }}>{entry.realValue}%</strong>
        </span>
      </div>
    ))}
  </div>
);

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, s, n] = await Promise.all([getMyCourses(), getMyAttendanceStats(), getMyNotifications()]);
        setCourses(c); setAttendanceStats(s); setNotifications(n);
      } catch { setError('Failed to load dashboard data.'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const totalAttendances = attendanceStats.reduce((acc, s) => acc + s.attended_sessions, 0);
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const lineData = attendanceStats.map(s => ({ course: s.course_code, percentage: s.percentage, threshold: s.threshold }));
  const pieData = attendanceStats.map(s => ({ name: s.course_code, value: s.percentage === 0 ? 0.1 : s.percentage, realValue: s.percentage }));

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" style={{ color: '#ef4444' }} /></Container>;

  const localeMap2 = { tr: 'tr-TR', fr: 'fr-FR', ar: 'ar-SA', ru: 'ru-RU', en: 'en-GB' };
  const today = new Date().toLocaleDateString(localeMap2[i18n.language] || 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Container fluid="lg">
      <style>{`
        :root { --tooltip-bg: rgba(15,15,20,0.95); --tooltip-border: rgba(255,255,255,0.1); --tooltip-label: #94a3b8; --tooltip-value: #fff; --legend-color: #64748b; --legend-value: #1e293b; --chart-grid: rgba(0,0,0,0.06); --chart-axis: #374151; }
        [data-bs-theme="dark"] { --tooltip-bg: rgba(10,10,16,0.97); --tooltip-border: rgba(255,255,255,0.08); --tooltip-label: #94a3b8; --tooltip-value: #f1f5f9; --legend-color: #94a3b8; --legend-value: #e2e8f0; --chart-grid: rgba(255,255,255,0.08); --chart-axis: #cbd5e1; }
        .stat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(220,38,38,0.25) !important; }
        .recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line { stroke: var(--chart-grid); }
        .recharts-text, .recharts-cartesian-axis-tick-value { fill: var(--chart-axis) !important; font-weight: 500 !important; }
        .recharts-wrapper, .recharts-surface, .recharts-wrapper *:focus, .recharts-surface *:focus { outline: none !important; box-shadow: none !important; }
      `}</style>

      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-3 border-bottom">
        <div>
          <h4 className="mb-0 fw-bold">{t('dashboard.welcomeBack')} <span style={{ color: '#ef4444' }}>{user?.full_name}</span></h4>
          <p className="text-muted mt-1 mb-0 small">{today}</p>
        </div>
        <Button variant="danger" className="d-flex align-items-center gap-2 px-4" style={{ borderRadius: '10px', fontWeight: 600 }} onClick={() => navigate('/student/courses')}>
          <CameraFill size={16} />
          <span>{t('dashboard.takeAttendance')}</span>
        </Button>
      </div>

      <Row className="mb-4 g-3">
        {[
          { icon: <PersonCheckFill size={26} color="white" />, value: courses.length, label: t('dashboard.enrolledCourses'), gradient: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)', glow: 'rgba(185,28,28,0.35)' },
          { icon: <ClipboardDataFill size={26} color="white" />, value: totalAttendances, label: t('dashboard.totalAttendances'), gradient: 'linear-gradient(135deg, #d32f2f 0%, #e53935 100%)', glow: 'rgba(211,47,47,0.35)' },
          { icon: <ExclamationTriangleFill size={26} color="white" />, value: unreadCount, label: t('dashboard.unreadAlerts'), gradient: unreadCount > 0 ? 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)' : 'linear-gradient(135deg, #e53935 0%, #ef5350 100%)', glow: 'rgba(153,27,27,0.35)', clickable: unreadCount > 0, onClick: () => unreadCount > 0 && navigate('/student/notifications') }
        ].map((item, i) => (
          <Col md={4} key={i}>
            <Card className="border-0 stat-card" style={{ background: item.gradient, boxShadow: `0 4px 24px ${item.glow}`, borderRadius: '16px', cursor: item.clickable ? 'pointer' : 'default' }} onClick={item.onClick}>
              <Card.Body className="d-flex align-items-center gap-3 py-4 px-4">
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '13px', backdropFilter: 'blur(4px)' }}>{item.icon}</div>
                <div>
                  <h2 className="mb-0 text-white fw-bold" style={{ fontSize: '2rem', lineHeight: 1 }}>{item.value}</h2>
                  <p className="mb-0 mt-1" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', fontWeight: 500 }}>{item.label}</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {courses.length > 0 ? (
        <Row className="mb-4 g-3">
          <Col md={8}>
            <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '16px' }}>
              <Card.Header className="border-0 pb-0 pt-4 px-4" style={{ background: 'transparent' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h6 className="mb-0 fw-bold" style={{ fontSize: '0.95rem' }}>{t('dashboard.attendanceBycourse')}</h6>
                    <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.78rem' }}>{t('dashboard.sessionVsThreshold')}</p>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 600, color: '#ef4444' }}>
                    {lineData.length} {t('dashboard.courses')}
                  </div>
                </div>
              </Card.Header>
              <Card.Body className="px-2 pb-3 pt-2">
                <ResponsiveContainer width="100%" height={280} style={{ outline: 'none' }}>
                  <AreaChart data={lineData} margin={{ top: 10, right: 20, left: -10, bottom: 50 }} style={{ outline: 'none' }}>
                    <defs>
                      <linearGradient id="gradAttendance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradThreshold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="course" tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--chart-axis)' }} angle={-35} textAnchor="end" interval={0} height={55} />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomLineTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '12px', fontWeight: 500 }} />
                    <Area type="monotone" dataKey="percentage" stroke="#ef4444" strokeWidth={2.5} fill="url(#gradAttendance)" name={t('dashboard.attendancePct')} dot={{ r: 5, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="threshold" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4" fill="url(#gradThreshold)" name={t('dashboard.thresholdPct')} dot={false} activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '16px' }}>
              <Card.Header className="border-0 pb-0 pt-4 px-4" style={{ background: 'transparent' }}>
                <h6 className="mb-0 fw-bold" style={{ fontSize: '0.95rem' }}>{t('dashboard.attendanceDistribution')}</h6>
                <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.78rem' }}>{t('dashboard.perCourseBreakdown')}</p>
              </Card.Header>
              <Card.Body className="d-flex flex-column align-items-center justify-content-center px-3 pb-4">
                <ResponsiveContainer width="100%" height={200} style={{ outline: 'none' }}>
                  <PieChart style={{ outline: 'none' }}>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value" label={false} strokeWidth={0}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ filter: `drop-shadow(0 0 4px ${COLORS[index % COLORS.length]}60)`, cursor: 'pointer' }} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <CustomLegend pieData={pieData} />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '16px' }}>
          <Card.Body className="text-center py-5">
            <ClipboardDataFill size={48} className="text-muted mb-3 opacity-50" />
            <h5 className="text-muted">{t('dashboard.noCoursesEnrolled')}</h5>
            <p className="text-muted small mb-0">{t('dashboard.chartsWillAppear')}</p>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default StudentDashboard;
import React, { useEffect, useRef, useState } from 'react';
import { Navbar, Nav, Container, Button, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { BellFill, SunFill, MoonFill } from 'react-bootstrap-icons';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/authService';
import { getMyNotifications, markNotificationRead } from '../services/attendanceService';

const AppNavbar = () => {
  const { user, logout: logoutContext } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
 const [darkMode, setDarkMode] = useState(() => {
  return sessionStorage.getItem('theme') === 'dark';
});
  const dropdownRef = useRef(null);

  useEffect(() => {
  document.documentElement.setAttribute('data-bs-theme', darkMode ? 'dark' : 'light');
  sessionStorage.setItem('theme', darkMode ? 'dark' : 'light');
}, [darkMode]);

  useEffect(() => {
    if (user?.role === 'student') {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getMyNotifications();
      setNotifications(data);
    } catch (err) {}
  };

  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      await markNotificationRead(n.id);
      setNotifications(notifications.map(notif => notif.id === n.id ? { ...notif, is_read: 1 } : notif));
    }
    setShowDropdown(false);
    navigate('/student/notifications');
  };

  const handleLogout = async () => {
  await logout(user?.role, user?.uuid);
  logoutContext();
  navigate('/login');
};

  const handleBrandClick = () => {
    if (!user) return navigate('/login');
    if (user.role === 'student') return navigate('/student');
    if (user.role === 'instructor') return navigate('/instructor');
    if (user.role === 'admin') return navigate('/admin');
  };

  const roleBadgeColor = {
    admin: 'danger',
    instructor: 'primary',
    student: 'success'
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
<Navbar
  variant="dark"
  expand="lg"
  className="mb-4"
  style={{
    backgroundColor: darkMode ? '#1a1a1a' : '#212529',
    borderBottom: darkMode ? '1px solid #333' : 'none'
  }}
>
        <Container>
        <Navbar.Brand style={{ cursor: 'pointer' }} onClick={handleBrandClick} className="d-flex align-items-center gap-2">
          <img src="/logo.png" alt="FIU Logo" height="32" style={{ objectFit: 'contain' }} />
          <span className="d-none d-md-inline">Smart Attendance System</span>
        </Navbar.Brand>

        <div className="d-flex align-items-center gap-1 ms-auto me-2 order-lg-last">
          {user && (
            <span className="text-light d-none d-lg-inline me-1">{user.full_name}</span>
          )}

          {user?.role === 'student' && (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <Button
                variant="outline-light"
                size="sm"
                style={{ position: 'relative' }}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <BellFill size={16} />
                {unreadCount > 0 && (
                  <Badge
                    bg="danger"
                    pill
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      fontSize: '10px'
                    }}
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>

              {showDropdown && (
                <div
                  style={{
                    position: 'fixed',
                    right: '10px',
                    top: '60px',
                    width: '300px',
                    maxWidth: 'calc(100vw - 20px)',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: 'var(--bs-body-bg)',
                    border: '1px solid var(--bs-border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 9999,
                    color: 'var(--bs-body-color)'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                    <strong>Notifications</strong>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0"
                      onClick={() => { setShowDropdown(false); navigate('/student/notifications'); }}
                    >
                      View all
                    </Button>
                  </div>

                  {notifications.filter(n => !n.is_read).length === 0 ? (
                    <div className="px-3 py-3 small" style={{ color: 'var(--bs-secondary-color)' }}>No new notifications</div>
                  ) : (
                    notifications.filter(n => !n.is_read).slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        style={{
                          cursor: 'pointer',
                          padding: '10px 16px',
                          borderBottom: '1px solid var(--bs-border-color)',
                          backgroundColor: 'var(--bs-warning-bg-subtle)',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bs-secondary-bg)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bs-warning-bg-subtle)'}
                      >
                        <p className="mb-1 small">{n.message}</p>
                        <div className="d-flex justify-content-between align-items-center">
                          <span style={{ fontSize: '11px', color: 'var(--bs-secondary-color)' }}>
                            {new Date(n.created_at).toLocaleDateString('en-GB')}
                          </span>
                          <Badge bg="warning" text="dark" style={{ fontSize: '10px' }}>New</Badge>
                        </div>
                      </div>
                    ))
                  )}

                  {notifications.filter(n => !n.is_read).length > 5 && (
                    <div
                      className="text-center py-2 small text-primary"
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setShowDropdown(false); navigate('/student/notifications'); }}
                    >
                      View all {notifications.filter(n => !n.is_read).length} notifications
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {user && (
            <>
              {user.role !== 'student' && (
                <Badge bg={roleBadgeColor[user.role]} className="d-none d-lg-inline">{user.role}</Badge>
              )}
              <Button
                variant="outline-light"
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? <SunFill size={16} /> : <MoonFill size={16} />}
              </Button>
              <Button variant="outline-light" size="sm" onClick={handleLogout}>Logout</Button>
            </>
          )}
        </div>

        {user && (
          <>
            <Navbar.Toggle />
            <Navbar.Collapse>
              <Nav className="me-auto">
                {user.role === 'student' && (
                  <>
                    <Nav.Link as={Link} to="/student">Dashboard</Nav.Link>
                    <Nav.Link as={Link} to="/student/attendance">My Attendance</Nav.Link>
                    <Nav.Link as={Link} to="/student/face-attendance">Take Attendance</Nav.Link>
                  </>
                )}
                {user.role === 'instructor' && (
                  <Nav.Link as={Link} to="/instructor">Dashboard</Nav.Link>
                )}
                {user.role === 'admin' && (
                  <Nav.Link as={Link} to="/admin">Dashboard</Nav.Link>
                )}
              </Nav>
              <Nav className="d-lg-none">
                <span className="text-light px-3 py-2">{user?.full_name}</span>
              </Nav>
            </Navbar.Collapse>
          </>
        )}
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
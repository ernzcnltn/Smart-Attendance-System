import React, { useEffect, useRef, useState } from 'react';
import { Badge, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import {
  BellFill, SunFill, MoonFill, List, X,
  HouseFill, ClipboardDataFill, PersonFill,
  CameraFill, BoxArrowRight, BookFill
} from 'react-bootstrap-icons';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/authService';
import { getMyNotifications, markNotificationRead } from '../services/attendanceService';

const AppNavbar = () => {
  const { user, logout: logoutContext } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return sessionStorage.getItem('theme') === 'dark';
  });
  const notificationRef = useRef(null);

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
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
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
    setShowNotifications(false);
    navigate('/student/notifications');
  };

  const handleLogout = async () => {
    await logout(user?.role);
    logoutContext();
    navigate('/login');
  };

  const handleBrandClick = () => {
    if (!user) return navigate('/login');
    if (user.role === 'student') return navigate('/student');
    if (user.role === 'instructor') return navigate('/instructor');
    if (user.role === 'admin') return navigate('/admin');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const studentLinks = [
    { to: '/student', icon: <HouseFill size={18} />, label: 'Dashboard' },
    { to: '/student/courses', icon: <BookFill size={18} />, label: 'My Courses' },
    { to: '/student/attendance', icon: <ClipboardDataFill size={18} />, label: 'My Attendance' },
    { to: '/student/face-attendance', icon: <CameraFill size={18} />, label: 'Take Attendance' },
    { to: '/student/profile', icon: <PersonFill size={18} />, label: 'Profile' },
  ];

  const instructorLinks = [
    { to: '/instructor', icon: <HouseFill size={18} />, label: 'Dashboard' },
  ];

  const adminLinks = [
    { to: '/admin', icon: <HouseFill size={18} />, label: 'Dashboard' },
  ];

  const links = user?.role === 'student' ? studentLinks : user?.role === 'instructor' ? instructorLinks : adminLinks;

  return (
    <>
      {/* Navbar */}
      <nav
        className="mb-4 px-3 d-flex align-items-center justify-content-between"
        style={{
          height: '60px',
          backgroundColor: darkMode ? '#1a1a1a' : '#212529',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}
      >
        {/* Sol: Hamburger + Logo */}
        <div className="d-flex align-items-center gap-3">
          {user && (
            <Button
              variant="link"
              className="p-0 text-white"
              onClick={() => setShowSidebar(true)}
            >
              <List size={26} />
            </Button>
          )}
          <div
            style={{ cursor: 'pointer' }}
            onClick={handleBrandClick}
            className="d-flex align-items-center gap-2"
          >
            <img src="/logo.png" alt="FIU Logo" height="32" style={{ objectFit: 'contain' }} />
            <span className="text-white fw-semibold d-none d-md-inline">Smart Attendance System</span>
          </div>
        </div>

        {/* Sağ: Bildirim + Dark Mode + Logout */}
        <div className="d-flex align-items-center gap-2">
          {user?.role === 'student' && (
            <>
              <div ref={notificationRef} style={{ position: 'relative' }}>
                <Button
                  variant="outline-light"
                  size="sm"
                  style={{ position: 'relative' }}
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <BellFill size={16} />
                  {unreadCount > 0 && (
                    <Badge bg="danger" pill style={{ position: 'absolute', top: '-6px', right: '-6px', fontSize: '10px' }}>
                      {unreadCount}
                    </Badge>
                  )}
                </Button>

                {showNotifications && (
                  <div style={{
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
                  }}>
                    <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                      <strong>Notifications</strong>
                      <Button variant="link" size="sm" className="p-0" onClick={() => { setShowNotifications(false); navigate('/student/notifications'); }}>
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
                  </div>
                )}
              </div>

              
            </>
          )}

          <Button
            variant="outline-light"
            size="sm"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <SunFill size={16} /> : <MoonFill size={16} />}
          </Button>

          <Button
            variant="outline-light"
            size="sm"
            onClick={handleLogout}
            title="Logout"
          >
            <BoxArrowRight size={16} />
          </Button>
        </div>
      </nav>

      {/* Sidebar Overlay */}
      {showSidebar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 2000
          }}
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: showSidebar ? 0 : '-280px',
          width: '280px',
          height: '100vh',
          background: darkMode ? '#1a1a1a' : '#212529',
          zIndex: 2001,
          transition: 'left 0.3s ease',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Sidebar Header */}
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-secondary">
          <div className="d-flex align-items-center gap-2">
            <img src="/logo.png" alt="FIU Logo" height="32" style={{ objectFit: 'contain' }} />
            <span className="text-white fw-semibold small">Smart Attendance</span>
          </div>
          <Button variant="link" className="p-0 text-white" onClick={() => setShowSidebar(false)}>
            <X size={22} />
          </Button>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-3 py-3 border-bottom border-secondary">
            <div className="d-flex align-items-center gap-2">
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: '#c0392b', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '16px'
              }}>
                {user.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-white fw-semibold small">{user.full_name}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{user.email}</div>
              </div>
            </div>
          </div>
        )}

        {/* Links */}
        <div className="flex-grow-1 py-2">
          {links.map((link, i) => (
            <Link
              key={i}
              to={link.to}
              onClick={() => setShowSidebar(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 20px',
                color: 'rgba(255,255,255,0.8)',
                textDecoration: 'none',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Sidebar Footer - Logout */}
        <div className="p-3 border-top border-secondary">
          <button
            onClick={() => { setShowSidebar(false); handleLogout(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 20px',
              color: '#e74c3c',
              background: 'none',
              border: 'none',
              width: '100%',
              cursor: 'pointer',
              borderRadius: '8px'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(231,76,60,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <BoxArrowRight size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default AppNavbar;
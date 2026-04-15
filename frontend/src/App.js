import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import AppNavbar from './components/Navbar';

import Login from './pages/auth/Login';
import StudentDashboard from './pages/student/StudentDashboard';
import MyAttendance from './pages/student/MyAttendance';
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import ManageCourse from './pages/instructor/ManageCourse';
import GenerateQR from './pages/instructor/GenerateQR';
import AdminDashboard from './pages/admin/AdminDashboard';
import ScanQR from './pages/student/ScanQR';
import SystemSettings from './pages/admin/SystemSettings';
import CreateCourse from './pages/instructor/CreateCourse';
import TimetableUpload from './pages/admin/TimetableUpload';
import Notifications from './pages/student/Notifications';
import FaceRegister from './pages/student/FaceRegister';
import FaceAttendance from './pages/student/FaceAttendance';
import CompleteRegistration from './pages/auth/CompleteRegistration';
import GoogleSuccess from './pages/auth/GoogleSuccess';
import Profile from './pages/student/Profile';
import MyCourses from './pages/student/MyCourses';


function AppContent() {
  const location = useLocation();
const hideNavbar = ['/login', '/auth/complete-registration', '/auth/google/success'].includes(location.pathname);
  return (
    <>
      {!hideNavbar && <AppNavbar />}
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route path="/auth/complete-registration" element={<CompleteRegistration />} />
        <Route path="/auth/google/success" element={<GoogleSuccess />} />


        <Route path="/student" element={
          <PrivateRoute roles={['student']}><StudentDashboard /></PrivateRoute>
        } />
        <Route path="/student/attendance" element={
          <PrivateRoute roles={['student']}><MyAttendance /></PrivateRoute>
        } />
        <Route path="/student/scan" element={
          <PrivateRoute roles={['student']}><ScanQR /></PrivateRoute>
        } />
        <Route path="/student/notifications" element={
          <PrivateRoute roles={['student']}><Notifications /></PrivateRoute>
        } />
        <Route path="/student/face-register" element={
          <PrivateRoute roles={['student']}><FaceRegister /></PrivateRoute>
        } />
        <Route path="/student/face-attendance" element={
          <PrivateRoute roles={['student']}><FaceAttendance /></PrivateRoute>
        } />

        <Route path="/student/profile" element={<PrivateRoute roles={['student']}><Profile /></PrivateRoute>} />

        <Route path="/student/courses" element={<PrivateRoute roles={['student']}><MyCourses /></PrivateRoute>} />

        <Route path="/instructor" element={
          <PrivateRoute roles={['instructor']}><InstructorDashboard /></PrivateRoute>
        } />
        <Route path="/instructor/courses/new" element={
          <PrivateRoute roles={['instructor']}><CreateCourse /></PrivateRoute>
        } />
        <Route path="/instructor/courses/:uuid" element={
          <PrivateRoute roles={['instructor']}><ManageCourse /></PrivateRoute>
        } />
        <Route path="/instructor/courses/:uuid/qr" element={
          <PrivateRoute roles={['instructor']}><GenerateQR /></PrivateRoute>
        } />

        <Route path="/admin" element={
          <PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>
        } />
        <Route path="/admin/timetable" element={
          <PrivateRoute roles={['admin']}><TimetableUpload /></PrivateRoute>
        } />
        <Route path="/admin/settings" element={
          <PrivateRoute roles={['admin']}><SystemSettings /></PrivateRoute>
        } />

        <Route path="/unauthorized" element={
          <div className="text-center mt-5">
            <h3>403 — Access Denied</h3>
            <p className="text-muted">You do not have permission to view this page.</p>
          </div>
        } />
        <Route path="*" element={
          <div className="text-center mt-5">
            <h3>404 — Page Not Found</h3>
          </div>
        } />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
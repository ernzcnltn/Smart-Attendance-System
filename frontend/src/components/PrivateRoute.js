import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, roles }) => {
  const { user, faceStatus } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;

  if (user.role === 'student' && faceStatus !== null) {
    const needsRegistration = !faceStatus.face_registered || faceStatus.needs_update;
    const isOnFaceRegisterPage = window.location.pathname === '/student/face-register';

    if (needsRegistration && !isOnFaceRegisterPage) {
      return <Navigate to="/student/face-register" replace />;
    }
  }

  return children;
};

export default PrivateRoute;
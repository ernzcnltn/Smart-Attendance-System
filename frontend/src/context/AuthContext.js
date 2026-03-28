import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUser, removeToken, removeUser } from '../utils/helpers';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [faceStatus, setFaceStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getUser();
    if (stored) {
      setUser(stored);
      if (stored.role === 'student') {
        checkFaceStatus();
      }
    }
    setLoading(false);
  }, []);

  const checkFaceStatus = async () => {
    try {
      const response = await api.get('/face/status');
      setFaceStatus(response.data.data);
    } catch (err) {}
  };

  const updateUser = (userData) => {
    setUser(userData);
    if (userData?.role === 'student') {
      checkFaceStatus();
    }
  };

  const logout = () => {
    removeToken();
    removeUser();
    setUser(null);
    setFaceStatus(null);
  };

  return (
    <AuthContext.Provider value={{ user, updateUser, logout, loading, faceStatus, checkFaceStatus }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
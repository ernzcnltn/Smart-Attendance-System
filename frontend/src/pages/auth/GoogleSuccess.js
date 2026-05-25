import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { setToken, setUser } from '../../utils/helpers';
import api from '../../services/api';

const GoogleSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return navigate('/login');

    const fetchUser = async () => {
      try {
        setToken(token);
        const response = await api.get('/auth/me');
        const user = response.data.data;
        setUser(user);
        updateUser(user);
        if (user.role === 'student') navigate('/student');
        else if (user.role === 'instructor') navigate('/instructor');
        else navigate('/admin');
      } catch (err) {
        navigate('/login?error=google_failed');
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="text-center mt-5">
      <div className="spinner-border text-primary" />
      <p className="mt-3">{t('login.signingIn')}</p>
    </div>
  );
};

export default GoogleSuccess;
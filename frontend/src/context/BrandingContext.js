import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const BrandingContext = createContext({});

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState({
    school_logo: '',
    app_favicon: '',
    university_name: 'Final International University'
  });

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const response = await api.get('/settings/public');
      const data = response.data.data;
      setBranding({
        school_logo: data.school_logo || '',
        app_favicon: data.app_favicon || '',
        university_name: data.university_name || 'Final International University'
      });

      // Favicon güncelle
      if (data.app_favicon) {
        const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
        link.rel = 'icon';
        link.href = data.app_favicon;
        document.head.appendChild(link);
      }
    } catch (err) {
      console.error('Branding fetch error:', err.message);
    }
  };

  const refreshBranding = () => fetchBranding();

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
import React, { createContext, useContext, useEffect, useState } from 'react';
import { cmsService } from '../services/cmsService';

const SettingsContext = createContext({
  settings: null,
  loading: true,
  refreshSettings: () => {},
});

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyThemeTokens = (data) => {
    if (!data) return;
    const root = document.documentElement;
    if (data.PrimaryColor) {
      root.style.setProperty('--primary-color', data.PrimaryColor);
    }
    if (data.SecondaryColor) {
      root.style.setProperty('--secondary-color', data.SecondaryColor);
    }
    if (data.AccentColor) {
      root.style.setProperty('--accent-color', data.AccentColor);
    }
    if (data.FontFamily) {
      root.style.setProperty('--font-family', data.FontFamily);
    }
    if (data.FaviconUrl) {
      const favEl = document.getElementById('site-favicon');
      if (favEl) favEl.href = data.FaviconUrl;
    }
  };

  const loadSettings = async () => {
    try {
      const data = await cmsService.getSettings();
      setSettings(data);
      applyThemeTokens(data);
    } catch (err) {
      console.warn('Could not load dynamic website settings, using default theme tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: loadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useWebsiteSettings = () => useContext(SettingsContext);


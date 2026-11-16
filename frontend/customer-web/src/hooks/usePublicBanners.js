import { useState, useEffect } from 'react';
import { cmsService } from '../services/cmsService';

export function usePublicBanners(location = 'HOME_HERO') {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    cmsService
      .getBanners(location)
      .then((data) => {
        if (isMounted) setBanners(data);
      })
      .catch((err) => {
        console.warn('Failed to load banners:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [location]);

  return { banners, loading };
}


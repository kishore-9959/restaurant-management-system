import { useState, useEffect } from 'react';
import { cmsService } from '../services/cmsService';

export function usePublicNavigation() {
  const [navigation, setNavigation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    cmsService
      .getNavigation()
      .then((data) => {
        if (isMounted) setNavigation(data);
      })
      .catch((err) => {
        console.warn('Failed to load navigation:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { navigation, loading };
}


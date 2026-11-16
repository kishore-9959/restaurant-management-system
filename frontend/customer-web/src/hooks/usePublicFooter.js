import { useState, useEffect } from 'react';
import { cmsService } from '../services/cmsService';

export function usePublicFooter() {
  const [footer, setFooter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    cmsService
      .getFooter()
      .then((data) => {
        if (isMounted) setFooter(data);
      })
      .catch((err) => {
        console.warn('Failed to load footer:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { footer, loading };
}


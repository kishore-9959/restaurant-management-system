import { useState, useEffect } from 'react';
import { cmsService } from '../services/cmsService';

export function usePublicPage(slug, preview = false) {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    cmsService
      .getPublicPage(slug, preview)
      .then((data) => {
        if (isMounted) setPageData(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.response?.data?.message || 'Failed to load page');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug, preview]);

  return { pageData, loading, error };
}


import { useState, useEffect } from 'react';
import { menuService } from '../services/menuService';

export function useMenuHighlights(branchId = 1) {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    menuService
      .getPublicCatalog(branchId)
      .then((data) => {
        if (isMounted) setCatalog(data);
      })
      .catch((err) => {
        console.warn('Failed to load menu highlights:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [branchId]);

  return { catalog, loading };
}


import { useState, useEffect } from 'react';
import { cmsService } from '../services/cmsService';

export function usePublicFAQs(category = null) {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    cmsService
      .getFAQs(category)
      .then((data) => {
        if (isMounted) setFaqs(data);
      })
      .catch((err) => {
        console.warn('Failed to load FAQs:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [category]);

  return { faqs, loading };
}


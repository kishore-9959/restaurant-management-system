import { useState, useEffect } from 'react';
import { cmsService } from '../services/cmsService';

export function usePublicTestimonials(featuredOnly = true) {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    cmsService
      .getTestimonials(featuredOnly)
      .then((data) => {
        if (isMounted) setTestimonials(data);
      })
      .catch((err) => {
        console.warn('Failed to load testimonials:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [featuredOnly]);

  return { testimonials, loading };
}


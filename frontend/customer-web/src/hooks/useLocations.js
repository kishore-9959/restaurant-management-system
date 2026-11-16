import { useState, useEffect } from 'react';
import { restaurantService } from '../services/restaurantService';

export function useLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    restaurantService
      .getBranches()
      .then((data) => {
        if (isMounted) setLocations(data);
      })
      .catch((err) => {
        console.warn('Failed to load branches:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { locations, loading };
}


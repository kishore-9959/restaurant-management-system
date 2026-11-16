import api from './api';

export const restaurantService = {
  async getBranches() {
    try {
      const res = await api.get('/restaurants/branches');
      return res.data.data || [];
    } catch {
      // Fallback location data if restaurant service is offline or unseeded
      return [
        {
          branchId: 1,
          branchName: 'Antigravity Bistro - Flagship Indiranagar',
          addressLine: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
          phone: '+91 80 4123 4567',
          email: 'indiranagar@antigravitybistro.com',
          openingHours: 'Mon - Sun: 12:00 PM - 11:30 PM',
          googleMapsUrl: 'https://maps.google.com/?q=Indiranagar+Bengaluru',
          imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
        },
        {
          branchId: 2,
          branchName: 'Antigravity Bistro - Whitefield Sky Lounge',
          addressLine: 'ITPL Main Road, Prestige Shantiniketan, Whitefield, Bengaluru, Karnataka 560048',
          phone: '+91 80 4987 6543',
          email: 'whitefield@antigravitybistro.com',
          openingHours: 'Tue - Sun: 1:00 PM - 12:00 AM',
          googleMapsUrl: 'https://maps.google.com/?q=Whitefield+Bengaluru',
          imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
        },
      ];
    }
  },
};


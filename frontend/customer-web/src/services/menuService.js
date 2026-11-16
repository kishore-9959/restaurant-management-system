import api from './api';

export const menuService = {
  async getPublicCatalog(branchId = 1) {
    try {
      const res = await api.get('/menu/public/catalog', { params: { branchId } });
      return res.data.data;
    } catch {
      // Fallback sample catalog if menu service is offline or catalog is unseeded
      return {
        categories: [
          {
            categoryId: 1,
            categoryName: 'Signature Starters',
            items: [
              {
                itemId: 101,
                name: 'Truffle Burrata & Heirloom Beets',
                description: 'Pugliese burrata, roasted golden beets, 12-year Modena balsamic, toasted pistachio crumble.',
                price: 850,
                imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?auto=format&fit=crop&w=600&q=80',
                isVegetarian: true,
                isChefSpecial: true,
              },
              {
                itemId: 102,
                name: 'Yellowfin Tuna Crudo',
                description: 'Hand-sliced sashimi grade tuna, yuzu ponzu, compressed watermelon, black sesame crisps.',
                price: 950,
                imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
                isVegetarian: false,
                isChefSpecial: true,
              },
            ],
          },
          {
            categoryId: 2,
            categoryName: 'Main Courses',
            items: [
              {
                itemId: 201,
                name: 'Handmade Tagliolini al Tartufo',
                description: 'Fresh artisanal pasta tossed in cultured mountain butter, aged Parmigiano Reggiano, and fresh winter truffles.',
                price: 1450,
                imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
                isVegetarian: true,
                isChefSpecial: true,
              },
              {
                itemId: 202,
                name: 'Wood-Fired Chilean Sea Bass',
                description: 'Miso-glazed sea bass, charred asparagus, saffron velouté, caviar pearls.',
                price: 2200,
                imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
                isVegetarian: false,
                isChefSpecial: true,
              },
            ],
          },
        ],
      };
    }
  },

  async getMenuItemById(id) {
    try {
      const res = await api.get(`/menu/public/items/${id}`);
      return res.data.data;
    } catch {
      return null;
    }
  },
};


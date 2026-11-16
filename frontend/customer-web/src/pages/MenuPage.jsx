import React, { useState, useEffect } from 'react';
import { Utensils, Search, Filter, Sparkles, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEOHelmet from '../components/SEOHelmet';
import { menuService } from '../services/menuService';
import LoadingSpinner from '../components/LoadingSpinner';

export default function MenuPage() {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [dietaryFilter, setDietaryFilter] = useState('ALL'); // ALL, VEG, NON_VEG
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchMenu() {
      try {
        setLoading(true);
        const data = await menuService.getPublicCatalog();
        setCatalog(data);
      } catch (err) {
        console.error('Failed to load menu catalog:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  const categories = catalog?.categories || [];

  // Flatten items for filtering
  const allItems = categories.flatMap((cat) =>
    (cat.items || []).map((item) => ({ ...item, categoryName: cat.categoryName, categoryId: cat.categoryId }))
  );

  const filteredItems = allItems.filter((item) => {
    const matchesCategory =
      selectedCategory === 'ALL' || String(item.categoryId) === String(selectedCategory);

    const matchesDietary =
      dietaryFilter === 'ALL' ||
      (dietaryFilter === 'VEG' && (item.isVegetarian || item.DietaryType === 'VEG')) ||
      (dietaryFilter === 'NON_VEG' && (!item.isVegetarian && item.DietaryType !== 'VEG'));

    const matchesSearch =
      !searchQuery ||
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesDietary && matchesSearch;
  });

  return (
    <>
      <SEOHelmet
        title="Epicurean Menu & Seasonal Catalog | RMS Dining"
        description="Explore our hand-crafted menu: artisanal starters, fresh handmade pasta, dry-aged meats, and decadent desserts."
      />

      {/* Hero Header */}
      <div className="pt-24 bg-stone-900 border-b border-stone-800 py-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Utensils className="w-3.5 h-3.5" />
            <span>Seasonal Culinary Catalog</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4">
            A Symphony of Taste
          </h1>
          <p className="text-stone-400 text-base sm:text-lg font-light max-w-2xl mx-auto">
            Each creation is an exquisite balance of sustainable local terroir, traditional techniques, and imaginative modern flair.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10 pb-6 border-b border-stone-800">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex-shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-900 text-stone-300 hover:bg-stone-800 border border-stone-800'
              }`}
            >
              All Courses
            </button>
            {categories.map((cat) => (
              <button
                key={cat.categoryId}
                onClick={() => setSelectedCategory(String(cat.categoryId))}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex-shrink-0 ${
                  String(selectedCategory) === String(cat.categoryId)
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-900 text-stone-300 hover:bg-stone-800 border border-stone-800'
                }`}
              >
                {cat.categoryName}
              </button>
            ))}
          </div>

          {/* Search & Dietary Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {/* Dietary toggle */}
            <select
              value={dietaryFilter}
              onChange={(e) => setDietaryFilter(e.target.value)}
              className="bg-stone-900 border border-stone-800 text-stone-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Diets</option>
              <option value="VEG">Vegetarian Only</option>
              <option value="NON_VEG">Non-Vegetarian</option>
            </select>

            {/* Search input */}
            <div className="relative flex-1 md:w-60">
              <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes..."
                className="w-full bg-stone-900 border border-stone-800 text-white text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-amber-500 placeholder-stone-500"
              />
            </div>
          </div>
        </div>

        {/* Catalog Items Grid */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" text="Curating culinary selection..." />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center text-stone-400">
            <AlertCircle className="w-12 h-12 mx-auto text-amber-500/60 mb-3" />
            <h3 className="text-xl font-serif text-white mb-1">No Dishes Found</h3>
            <p className="text-sm">Try adjusting your category filter or search keywords.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map((item) => (
              <div
                key={item.itemId || item.ItemId}
                className="group bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Item Image */}
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={
                        item.imageUrl ||
                        item.ImageUrl ||
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={item.name || item.Name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-stone-950/90 backdrop-blur-md px-3 py-1 rounded-full text-amber-400 font-bold text-sm border border-amber-500/30">
                      ₹{parseFloat(item.price || item.Price || 0).toFixed(2)}
                    </div>
                    {item.isChefSpecial && (
                      <div className="absolute top-3 left-3 bg-amber-600/90 backdrop-blur-sm text-white px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Chef Special</span>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      {item.isVegetarian ? (
                        <span className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          Veg
                        </span>
                      ) : (
                        <span className="bg-rose-950/80 border border-rose-500/50 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          Non-Veg
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Item Details */}
                  <div className="p-6">
                    <h3 className="text-xl font-serif font-semibold text-white group-hover:text-amber-400 transition-colors">
                      {item.name || item.Name}
                    </h3>
                    <p className="text-stone-400 text-sm mt-2 font-light line-clamp-3 leading-relaxed">
                      {item.description || item.Description}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0 border-t border-stone-800/60 mt-4 flex items-center justify-between">
                  <span className="text-xs text-stone-500 font-medium">
                    {item.categoryName}
                  </span>
                  <Link
                    to={`/menu/${item.itemId || item.ItemId}`}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                  >
                    View Details &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}


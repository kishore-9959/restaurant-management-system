import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Flame, Leaf, Utensils, CalendarCheck } from 'lucide-react';
import SEOHelmet from '../components/SEOHelmet';
import { menuService } from '../services/menuService';
import LoadingSpinner from '../components/LoadingSpinner';

export default function MenuItemDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchItem() {
      try {
        setLoading(true);
        const catalog = await menuService.getPublicCatalog();
        const allItems = (catalog?.categories || []).flatMap((c) =>
          (c.items || []).map((i) => ({ ...i, categoryName: c.categoryName }))
        );
        const found = allItems.find((i) => String(i.itemId || i.ItemId) === String(id));
        setItem(found || null);
      } catch (err) {
        console.error('Error fetching menu item:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchItem();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center pt-20">
        <LoadingSpinner size="lg" text="Retrieving culinary recipe details..." />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-xl mx-auto py-32 px-4 text-center">
        <h2 className="text-2xl font-serif font-bold text-white mb-4">Dish Not Found</h2>
        <p className="text-stone-400 mb-8">The requested menu selection may no longer be offered or is seasonal.</p>
        <Link
          to="/menu"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Menu</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <SEOHelmet
        title={`${item.name || item.Name} | RMS Menu`}
        description={item.description || item.Description}
        ogImage={item.imageUrl || item.ImageUrl}
      />

      <div className="pt-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-stone-400 hover:text-amber-400 text-sm font-medium mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Image */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden border border-stone-800 shadow-2xl">
              <img
                src={item.imageUrl || item.ImageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'}
                alt={item.name || item.Name}
                className="w-full h-[400px] sm:h-[480px] object-cover"
              />
              {item.isChefSpecial && (
                <div className="absolute top-4 left-4 bg-amber-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Chef's Masterpiece</span>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-6">
            <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold uppercase tracking-wider mb-2">
              <Utensils className="w-4 h-4" />
              <span>{item.categoryName || 'Culinary Specialty'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">
              {item.name || item.Name}
            </h1>

            <div className="text-3xl font-serif font-bold text-amber-400 mb-6">
              ₹{parseFloat(item.price || item.Price || 0).toFixed(2)}
            </div>

            <div className="flex items-center gap-3 mb-6">
              {item.isVegetarian ? (
                <span className="inline-flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full">
                  <Leaf className="w-3.5 h-3.5" />
                  <span>Vegetarian</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-rose-950/80 border border-rose-500/50 text-rose-400 text-xs font-semibold px-3 py-1 rounded-full">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Non-Vegetarian</span>
                </span>
              )}

              {item.DietaryType && (
                <span className="bg-stone-800 text-stone-300 text-xs font-semibold px-3 py-1 rounded-full border border-stone-700">
                  {item.DietaryType}
                </span>
              )}
            </div>

            <p className="text-stone-300 leading-relaxed font-light text-base mb-8">
              {item.description || item.Description}
            </p>

            {/* Savor this dish CTA */}
            <div className="p-6 bg-stone-900 border border-stone-800 rounded-2xl">
              <h4 className="text-base font-serif font-semibold text-white mb-2">
                Experience this Dish at Our Table
              </h4>
              <p className="text-xs text-stone-400 mb-4 font-light">
                Prepared freshly to order by our kitchen brigade using organic seasonal ingredients.
              </p>
              <Link
                to="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-md text-sm transition-transform active:scale-95"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Reserve a Dining Table</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


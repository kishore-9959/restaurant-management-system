import React from 'react';
import { Sparkles, Utensils, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMenuHighlights } from '../hooks/useMenuHighlights';

/**
 * FeaturedMenuSection Component (ComponentType: FEATURED_MENU)
 * Showcases highlighted and popular menu items fetched from Menu Service.
 */
export default function FeaturedMenuSection({ section }) {
  const { highlights, loading } = useMenuHighlights();

  let contentData = {};
  if (section?.Content) {
    try {
      contentData = typeof section.Content === 'string' ? JSON.parse(section.Content) : section.Content;
    } catch {
      contentData = {};
    }
  }

  const title = section?.Title || contentData.title || 'Signature Dishes';
  const subtitle = section?.Subtitle || contentData.subtitle || 'Handcrafted Flavors Selected by Our Master Chefs';

  return (
    <section className="py-20 bg-stone-950 text-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chef's Selection</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">
            {title}
          </h2>
          <p className="text-stone-400 text-base sm:text-lg font-light">
            {subtitle}
          </p>
        </div>

        {/* Dishes Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 bg-stone-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {highlights.map((dish) => (
              <div
                key={dish.ItemId || dish.id}
                className="group bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden hover:border-amber-500/50 transition-all duration-300 flex flex-col"
              >
                {/* Dish Image */}
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={dish.ImageUrl || dish.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'}
                    alt={dish.Name || dish.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-stone-900/90 backdrop-blur-md px-3 py-1 rounded-full text-amber-400 font-bold text-sm border border-amber-500/30">
                    ${parseFloat(dish.Price || dish.price || 0).toFixed(2)}
                  </div>
                  {dish.DietaryType && (
                    <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider text-stone-200">
                      {dish.DietaryType}
                    </div>
                  )}
                </div>

                {/* Dish Content */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-serif font-semibold text-white group-hover:text-amber-400 transition-colors">
                      {dish.Name || dish.name}
                    </h3>
                    <p className="text-stone-400 text-sm mt-2 font-light line-clamp-2">
                      {dish.Description || dish.description || 'Delicious culinary preparation cooked to perfection with seasonal ingredients.'}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-stone-800/80 flex items-center justify-between">
                    <span className="text-xs text-amber-500/80 font-medium">
                      {dish.CategoryName || 'Main Course'}
                    </span>
                    <Link
                      to={`/menu?item=${dish.ItemId || dish.id}`}
                      className="text-stone-300 hover:text-amber-400 text-xs font-semibold inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                    >
                      View Details &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View Full Menu CTA */}
        <div className="mt-14 text-center">
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-full shadow-lg transition-transform transform hover:scale-105"
          >
            <Utensils className="w-4 h-4" />
            <span>Explore Full Menu</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}


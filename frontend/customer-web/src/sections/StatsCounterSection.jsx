import React from 'react';
import { Users, Utensils, Award, Leaf } from 'lucide-react';

const DEFAULT_STATS = [
  { value: '150k+', label: 'Delighted Guests', icon: Users },
  { value: '45+', label: 'Signature Dishes', icon: Utensils },
  { value: '18', label: 'Culinary Awards', icon: Award },
  { value: '100%', label: 'Fresh & Organic', icon: Leaf }
];

/**
 * StatsCounterSection Component (ComponentType: STATS_COUNTER)
 * High-impact numerical counters showcasing key milestones and achievements.
 */
export default function StatsCounterSection({ section }) {
  let contentData = {};
  if (section?.Content) {
    try {
      contentData = typeof section.Content === 'string' ? JSON.parse(section.Content) : section.Content;
    } catch {
      contentData = {};
    }
  }

  const title = section?.Title || contentData.title || '';
  const stats = contentData.stats || DEFAULT_STATS;

  return (
    <section className="py-16 bg-gradient-to-r from-stone-900 via-amber-950/40 to-stone-900 border-y border-stone-800 text-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {title && (
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-center text-white mb-10">
            {title}
          </h2>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map((stat, idx) => {
            const IconComponent = typeof stat.icon === 'function' ? stat.icon : Award;
            return (
              <div key={idx} className="p-6">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-amber-500/10 rounded-full text-amber-400">
                    <IconComponent className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-amber-400 mb-1">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm uppercase tracking-wider text-stone-400 font-medium">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


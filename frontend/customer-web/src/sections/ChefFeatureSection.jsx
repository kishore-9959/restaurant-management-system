import React from 'react';
import { ChefHat, Quote, Sparkles } from 'lucide-react';

/**
 * ChefFeatureSection Component (ComponentType: CHEF_FEATURE)
 * Presents the Executive Chef profile, culinary credentials, and culinary philosophy.
 */
export default function ChefFeatureSection({ section }) {
  let contentData = {};
  if (section?.Content) {
    try {
      contentData = typeof section.Content === 'string' ? JSON.parse(section.Content) : section.Content;
    } catch {
      contentData = {};
    }
  }

  const chefName = contentData.name || 'Chef Antoine Laurent';
  const chefRole = contentData.role || 'Executive Chef & Culinary Director';
  const chefBio = contentData.bio || 'With over two decades spent in Michelin-starred dining rooms across Lyon, Paris, and New York, Chef Antoine crafts dining moments that honor timeless European traditions while celebrating modern, local terroir.';
  const chefQuote = contentData.quote || 'Cooking is an honest translation of emotion into flavor. Every plate should tell a story that lingers long after the meal has ended.';
  const chefImage = contentData.imageUrl || 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=800&q=80';
  const accolades = contentData.accolades || [
    'Michelin Guide Honoree 2024',
    'James Beard Award Nominee',
    'Certified Master Chef (CMC)'
  ];

  return (
    <section className="py-20 bg-stone-900 text-stone-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Chef Image */}
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="relative rounded-2xl overflow-hidden border-2 border-amber-900/40 shadow-2xl">
                <img
                  src={chefImage}
                  alt={chefName}
                  className="w-full h-[450px] sm:h-[520px] object-cover object-top hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-2xl font-serif font-bold text-white">{chefName}</p>
                  <p className="text-amber-400 text-sm font-medium">{chefRole}</p>
                </div>
              </div>

              {/* Decorative Accent */}
              <div className="absolute -top-4 -left-4 w-24 h-24 border-t-2 border-l-2 border-amber-500/50 rounded-tl-2xl pointer-events-none" />
            </div>
          </div>

          {/* Narrative & Accolades */}
          <div className="lg:col-span-7 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <ChefHat className="w-3.5 h-3.5" />
              <span>Culinary Leadership</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-2">
              Meet the Vision Behind the Flavor
            </h2>
            <p className="text-amber-500 font-light text-lg mb-6">
              {chefRole}
            </p>

            {/* Quote block */}
            <div className="relative bg-stone-800/60 border-l-4 border-amber-500 p-6 rounded-r-2xl mb-8">
              <Quote className="w-8 h-8 text-amber-500/30 absolute -top-3 right-4" />
              <p className="text-stone-200 italic font-serif text-lg leading-relaxed">
                "{chefQuote}"
              </p>
            </div>

            <p className="text-stone-300 leading-relaxed font-light mb-8">
              {chefBio}
            </p>

            {/* Accolades List */}
            <div>
              <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-400 mb-3">
                Recognitions & Honors
              </h4>
              <div className="space-y-2.5">
                {accolades.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-stone-200 text-sm">
                    <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


import React from 'react';
import { Wine, UtensilsCrossed, CalendarDays, Gift, Truck, Users } from 'lucide-react';

const DEFAULT_SERVICES = [
  {
    icon: UtensilsCrossed,
    title: 'Fine Dining Experience',
    description: 'Impeccable table-side service, candlelight ambiance, and meticulously crafted multi-course menus.'
  },
  {
    icon: CalendarDays,
    title: 'Private Events & Galas',
    description: 'Exclusive hire of our private dining salon for anniversaries, board dinners, and family celebrations.'
  },
  {
    icon: Wine,
    title: 'Sommelier Wine Pairings',
    description: 'Old-world vintages and rare biodynamic selections hand-paired with every course.'
  },
  {
    icon: Users,
    title: "Chef's Tasting Table",
    description: 'An intimate 8-seat culinary journey directly overlooking our master kitchen.'
  },
  {
    icon: Gift,
    title: 'Catering & Gatherings',
    description: 'Bespoke culinary catering brought directly to your residence or corporate venue.'
  },
  {
    icon: Truck,
    title: 'Gourmet Pickup & Delivery',
    description: 'Freshly prepared signature entrees packaged with care for exquisite dining at home.'
  }
];

/**
 * ServicesListSection Component (ComponentType: SERVICES_LIST)
 * Grid of dining, private events, catering, and concierge services.
 */
export default function ServicesListSection({ section }) {
  let contentData = {};
  if (section?.Content) {
    try {
      contentData = typeof section.Content === 'string' ? JSON.parse(section.Content) : section.Content;
    } catch {
      contentData = {};
    }
  }

  const title = section?.Title || contentData.title || 'Exceptional Services';
  const subtitle = section?.Subtitle || contentData.subtitle || 'Every Occasion Elevates into an Unforgettable Celebration';
  const services = contentData.services || DEFAULT_SERVICES;

  return (
    <section className="py-20 bg-stone-950 text-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">
            {title}
          </h2>
          <p className="text-stone-400 text-base sm:text-lg font-light">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((svc, idx) => {
            const IconComponent = typeof svc.icon === 'function' ? svc.icon : UtensilsCrossed;
            return (
              <div
                key={idx}
                className="p-8 rounded-2xl bg-stone-900 border border-stone-800 hover:border-amber-500/40 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-stone-950 transition-all duration-300">
                  <IconComponent className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-serif font-semibold text-white mb-3 group-hover:text-amber-400 transition-colors">
                  {svc.title}
                </h3>
                <p className="text-stone-400 text-sm font-light leading-relaxed">
                  {svc.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


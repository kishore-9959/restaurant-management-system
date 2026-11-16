import React from 'react';
import { Star, Quote, MessageSquare } from 'lucide-react';
import { usePublicTestimonials } from '../hooks/usePublicTestimonials';

/**
 * TestimonialsSection Component (ComponentType: TESTIMONIALS_GRID)
 * Customer reviews and critic ratings with star indicators.
 */
export default function TestimonialsSection({ section }) {
  const { testimonials, loading } = usePublicTestimonials();

  let contentData = {};
  if (section?.Content) {
    try {
      contentData = typeof section.Content === 'string' ? JSON.parse(section.Content) : section.Content;
    } catch {
      contentData = {};
    }
  }

  const title = section?.Title || contentData.title || 'Words from Our Guests';
  const subtitle = section?.Subtitle || contentData.subtitle || 'Memories shared by food connoisseurs and cherished patrons';

  const items = testimonials && testimonials.length > 0 ? testimonials.slice(0, 6) : [
    {
      CustomerName: 'Victoria Hastings',
      Rating: 5,
      Comment: 'An enchanting culinary experience. The tasting menu paired with heritage wines made our anniversary evening truly unforgettable.',
      Designation: 'Food Critic, Gourmet Gazette'
    },
    {
      CustomerName: 'Marcus Sterling',
      Rating: 5,
      Comment: 'Flawless service, sumptuous dishes, and an atmosphere that transports you straight to the heart of fine European dining.',
      Designation: 'Private Patron'
    },
    {
      CustomerName: 'Elena Rostova',
      Rating: 5,
      Comment: 'The chef’s attention to seasonal subtleties is extraordinary. Every dish is a symphony of delicate textures and bold aromas.',
      Designation: 'Culinary Enthusiast'
    }
  ];

  return (
    <section className="py-20 bg-stone-900 text-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Guest Praise</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">
            {title}
          </h2>
          <p className="text-stone-400 text-base sm:text-lg font-light">
            {subtitle}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 bg-stone-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((t, idx) => (
              <div
                key={t.TestimonialId || idx}
                className="relative bg-stone-950 p-8 rounded-2xl border border-stone-800 hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Star Rating */}
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= (t.Rating || 5)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-stone-700'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-stone-300 italic font-light text-sm sm:text-base leading-relaxed mb-6">
                    "{t.Comment || t.comment}"
                  </p>
                </div>

                {/* Author Info */}
                <div className="pt-4 border-t border-stone-800/80 flex items-center justify-between">
                  <div>
                    <h4 className="font-serif font-semibold text-white text-base">
                      {t.CustomerName || t.name}
                    </h4>
                    {(t.Designation || t.Location) && (
                      <p className="text-xs text-amber-500/80 font-medium">
                        {t.Designation || t.Location}
                      </p>
                    )}
                  </div>
                  <Quote className="w-6 h-6 text-stone-700 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}


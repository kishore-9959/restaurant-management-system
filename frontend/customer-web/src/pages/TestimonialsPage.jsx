import React from 'react';
import { Star, Quote, MessageSquare } from 'lucide-react';
import SEOHelmet from '../components/SEOHelmet';
import { usePublicTestimonials } from '../hooks/usePublicTestimonials';
import LoadingSpinner from '../components/LoadingSpinner';

export default function TestimonialsPage() {
  const { testimonials, loading } = usePublicTestimonials();

  const fallbackTestimonials = [
    {
      TestimonialId: 1,
      CustomerName: 'Lady Sophia Windham',
      Rating: 5,
      Comment: 'A tour de force of contemporary culinary brilliance. The handmade pasta and white truffle shavings were sublime beyond words.',
      Designation: 'Culinary Editor, Epicure Life',
      ReviewDate: '2026-10-14'
    },
    {
      TestimonialId: 2,
      CustomerName: 'Jonathan Hayes',
      Rating: 5,
      Comment: 'From the moment we walked through the bronze doors, the level of attentiveness was exemplary. Best dining experience in New York this year.',
      Designation: 'Private Patron',
      ReviewDate: '2026-10-28'
    },
    {
      TestimonialId: 3,
      CustomerName: 'Chef Clara Moreau',
      Rating: 5,
      Comment: 'Chef Antoine’s mastery of reduction sauces and precision cuisson is extraordinary. A restaurant operating at the zenith of its craft.',
      Designation: 'Master Pastry Chef, Paris',
      ReviewDate: '2026-11-02'
    },
    {
      TestimonialId: 4,
      CustomerName: 'David K. Rosenthal',
      Rating: 5,
      Comment: 'The private dining room provided an exquisite setting for our annual partner celebration. Wine cellar selection is world-class.',
      Designation: 'Managing Director, Sterling Capital',
      ReviewDate: '2026-11-05'
    }
  ];

  const items = testimonials && testimonials.length > 0 ? testimonials : fallbackTestimonials;

  return (
    <>
      <SEOHelmet
        title="Guest Reviews & Critic Praises | RMS Dining"
        description="Read real dining reviews, culinary critic critiques, and guest experiences from our restaurant."
      />

      <div className="pt-24 bg-stone-900 border-b border-stone-800 py-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Honors & Words</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4">
            Guest Testimonials
          </h1>
          <p className="text-stone-400 text-base sm:text-lg font-light max-w-2xl mx-auto">
            Cherished stories from culinary critics, epicures, and cherished diners.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" text="Retrieving guest accolades..." />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((t, idx) => (
              <div
                key={t.TestimonialId || idx}
                className="relative bg-stone-900 p-8 rounded-2xl border border-stone-800 hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
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

                  <p className="text-stone-300 italic font-light text-sm sm:text-base leading-relaxed mb-6">
                    "{t.Comment || t.comment}"
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
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
      </main>
    </>
  );
}


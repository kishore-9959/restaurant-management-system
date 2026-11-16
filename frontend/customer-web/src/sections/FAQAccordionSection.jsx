import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { usePublicFAQs } from '../hooks/usePublicFAQs';

/**
 * FAQAccordionSection Component (ComponentType: FAQ_ACCORDION)
 * Expandable question and answer accordion for customer inquiries.
 */
export default function FAQAccordionSection({ section }) {
  const { faqs, loading } = usePublicFAQs();
  const [openIndex, setOpenIndex] = useState(null);

  let contentData = {};
  if (section?.Content) {
    try {
      contentData = typeof section.Content === 'string' ? JSON.parse(section.Content) : section.Content;
    } catch {
      contentData = {};
    }
  }

  const title = section?.Title || contentData.title || 'Frequently Asked Questions';
  const subtitle = section?.Subtitle || contentData.subtitle || 'Helpful answers regarding our dining policies, dress code, reservations, and menus';

  const defaultFaqs = [
    {
      Question: 'Do I need to make a reservation in advance?',
      Answer: 'Reservations are highly recommended, especially for evening dinner service and weekends. We accept reservations up to 30 days in advance via our online portal or by phone.'
    },
    {
      Question: 'What is the dress code?',
      Answer: 'We observe an elegant smart casual dress code. We politely ask guests to refrain from wearing sportswear, athletic shorts, beachwear, or flip-flops.'
    },
    {
      Question: 'Can you accommodate dietary allergies and vegetarian/vegan requests?',
      Answer: 'Yes, absolutely. Our culinary team prepares specialized vegan, vegetarian, gluten-free, and nut-allergy menus. Please notify us upon reservation.'
    },
    {
      Question: 'Is parking available on site?',
      Answer: 'Complimentary valet parking is available at all our primary dining locations during dinner hours.'
    }
  ];

  const items = faqs && faqs.length > 0 ? faqs : defaultFaqs;

  const toggleAccordion = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="py-20 bg-stone-950 text-stone-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">
            {title}
          </h2>
          <p className="text-stone-400 text-base sm:text-lg font-light">
            {subtitle}
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-16 bg-stone-900 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={item.FaqId || idx}
                  className="border border-stone-800 rounded-xl overflow-hidden bg-stone-900/60 transition-colors"
                >
                  <button
                    onClick={() => toggleAccordion(idx)}
                    className="w-full py-5 px-6 flex items-center justify-between text-left focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <span className="font-serif font-medium text-base sm:text-lg text-white">
                      {item.Question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-amber-400 transition-transform duration-300 flex-shrink-0 ml-4 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-stone-300 font-light text-sm sm:text-base leading-relaxed border-t border-stone-800/60 animate-fadeIn">
                      {item.Answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}


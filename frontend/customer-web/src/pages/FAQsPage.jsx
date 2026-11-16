import React, { useState } from 'react';
import { HelpCircle, Search, ChevronDown, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEOHelmet from '../components/SEOHelmet';
import { usePublicFAQs } from '../hooks/usePublicFAQs';

export default function FAQsPage() {
  const { faqs, categories, loading } = usePublicFAQs();
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [openId, setOpenId] = useState(null);

  const fallbackFaqs = [
    {
      FaqId: 1,
      Category: 'Reservations',
      Question: 'How far in advance can I make a table reservation?',
      Answer: 'We accept online reservations up to 30 days in advance. For large parties (6+) or private dining buyouts, reservations may be requested up to 90 days in advance via our concierge desk.'
    },
    {
      FaqId: 2,
      Category: 'Reservations',
      Question: 'Is there a cancellation fee?',
      Answer: 'Cancellations made at least 24 hours prior to the reservation time incur no fee. For cancellations made within 24 hours or no-shows for chef tasting menus, a cancellation charge of $50 per guest applies.'
    },
    {
      FaqId: 3,
      Category: 'Dining & Attire',
      Question: 'What is the restaurant dress code?',
      Answer: 'We request elegant smart casual attire. Athletic apparel, beachwear, gym shorts, and flip-flops are politely not permitted in our main dining salon.'
    },
    {
      FaqId: 4,
      Category: 'Dining & Attire',
      Question: 'Do you cater to dietary restrictions and food allergies?',
      Answer: 'Yes. Our culinary brigade accommodates vegetarian, vegan, gluten-free, halal, and severe nut/shellfish allergies with advance notice.'
    },
    {
      FaqId: 5,
      Category: 'Private Events',
      Question: 'Can I host a private event or corporate dinner?',
      Answer: 'Yes, our private dining salon accommodates up to 32 seated guests, and full restaurant buyouts are available for receptions up to 120 guests.'
    }
  ];

  const items = faqs && faqs.length > 0 ? faqs : fallbackFaqs;

  const filteredFaqs = items.filter((faq) => {
    const matchesCat =
      selectedCat === 'ALL' || (faq.Category || faq.category) === selectedCat;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      (faq.Question || faq.question || '').toLowerCase().includes(query) ||
      (faq.Answer || faq.answer || '').toLowerCase().includes(query);

    return matchesCat && matchesSearch;
  });

  const availableCategories = ['ALL', ...new Set(items.map((i) => i.Category || i.category).filter(Boolean))];

  return (
    <>
      <SEOHelmet
        title="Frequently Asked Questions | RMS Dining"
        description="Find answers to all your questions about our reservations, dietary policies, dress code, and private events."
      />

      <div className="pt-24 bg-stone-900 border-b border-stone-800 py-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help Center</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-stone-400 text-base sm:text-lg font-light max-w-2xl mx-auto">
            Everything you need to know about your dining experience at RMS.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search & Category Pills */}
        <div className="space-y-6 mb-12">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-5 h-5 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search frequently asked questions..."
              className="w-full bg-stone-900 border border-stone-800 text-white text-sm rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-amber-500 placeholder-stone-500"
            />
          </div>

          {/* Category Tabs */}
          {availableCategories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex-shrink-0 ${
                    selectedCat === cat
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
                  }`}
                >
                  {cat === 'ALL' ? 'All Questions' : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* FAQs List */}
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-base">No matching questions found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFaqs.map((faq, idx) => {
              const id = faq.FaqId || idx;
              const isOpen = openId === id;
              return (
                <div
                  key={id}
                  className="border border-stone-800 rounded-xl overflow-hidden bg-stone-900/60 transition-colors"
                >
                  <button
                    onClick={() => setOpenId(isOpen ? null : id)}
                    className="w-full py-5 px-6 flex items-center justify-between text-left focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <span className="font-serif font-medium text-base sm:text-lg text-white">
                      {faq.Question || faq.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-amber-400 transition-transform duration-300 flex-shrink-0 ml-4 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-stone-300 font-light text-sm sm:text-base leading-relaxed border-t border-stone-800/60 animate-fadeIn">
                      {faq.Answer || faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Still have questions CTA */}
        <div className="mt-16 p-8 bg-stone-900 border border-stone-800 rounded-2xl text-center">
          <MessageSquare className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-xl font-serif font-bold text-white mb-2">
            Have a Specific Question?
          </h3>
          <p className="text-sm text-stone-400 max-w-md mx-auto mb-6 font-light">
            Our concierge team is available seven days a week to assist with any custom arrangements or inquiries.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-transform transform hover:scale-105"
          >
            Contact Maître d'
          </Link>
        </div>
      </main>
    </>
  );
}


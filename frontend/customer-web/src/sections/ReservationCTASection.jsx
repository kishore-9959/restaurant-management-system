import React, { useState } from 'react';
import { CalendarCheck, PhoneCall, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import ContactFormModal from '../components/ContactFormModal';

/**
 * ReservationCTASection Component (ComponentType: RESERVATION_CTA)
 * High-conversion call-to-action banner for table reservations and concierge inquiries.
 */
export default function ReservationCTASection({ section }) {
  const [modalOpen, setModalOpen] = useState(false);

  let contentData = {};
  if (section?.Content) {
    try {
      contentData = typeof section.Content === 'string' ? JSON.parse(section.Content) : section.Content;
    } catch {
      contentData = {};
    }
  }

  const title = section?.Title || contentData.title || 'Reserve Your Table Tonight';
  const subtitle = section?.Subtitle || contentData.subtitle || 'Immerse your senses in unforgettable gastronomic mastery. Bookings fill quickly for evening dinner service.';
  const phone = contentData.phone || '+1 (555) 234-5678';

  return (
    <section className="relative py-20 bg-stone-900 overflow-hidden text-white">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-950/40 via-stone-900 to-amber-950/40 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Intimate Dining & Special Celebrations</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white mb-6">
          {title}
        </h2>
        <p className="text-stone-300 text-base sm:text-xl font-light max-w-2xl mx-auto mb-10 leading-relaxed">
          {subtitle}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/reservations"
            className="px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-full shadow-xl transition-all transform hover:scale-105 flex items-center gap-2"
          >
            <CalendarCheck className="w-5 h-5" />
            <span>Book a Reservation</span>
          </Link>

          <button
            onClick={() => setModalOpen(true)}
            className="px-8 py-4 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white border border-stone-700 rounded-full font-semibold transition-all flex items-center gap-2"
          >
            <PhoneCall className="w-5 h-5 text-amber-400" />
            <span>Concierge Inquiry</span>
          </button>
        </div>

        <p className="mt-8 text-xs text-stone-400">
          Or speak directly with our maître d':{' '}
          <a href={`tel:${phone.replace(/\D/g, '')}`} className="text-amber-400 font-medium hover:underline">
            {phone}
          </a>
        </p>
      </div>

      <ContactFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}


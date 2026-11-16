import React, { useState } from 'react';
import { MapPin, Phone, Clock, Mail, ExternalLink } from 'lucide-react';
import { useLocations } from '../hooks/useLocations';

/**
 * MapContactSection Component (ComponentType: MAP_CONTACT)
 * Location information, opening hours, contact details, and map view.
 */
export default function MapContactSection({ section }) {
  const { locations, loading } = useLocations();
  const [selectedIdx, setSelectedIdx] = useState(0);

  let contentData = {};
  if (section?.Content) {
    try {
      contentData = typeof section.Content === 'string' ? JSON.parse(section.Content) : section.Content;
    } catch {
      contentData = {};
    }
  }

  const title = section?.Title || contentData.title || 'Our Locations & Hours';
  const subtitle = section?.Subtitle || contentData.subtitle || 'Visit us across our signature locations';

  const defaultLocations = [
    {
      RestaurantId: 1,
      Name: 'Downtown Flagship',
      Address: '124 Gourmet Boulevard, Suite 100, New York, NY 10001',
      Phone: '+1 (555) 234-5678',
      Email: 'downtown@rms-dining.com',
      OpeningHours: 'Mon - Sun: 11:30 AM – 11:00 PM',
      MapUrl: 'https://maps.google.com/maps?q=New+York+Fine+Dining&t=&z=13&ie=UTF8&iwloc=&output=embed'
    },
    {
      RestaurantId: 2,
      Name: 'Uptown Bistro',
      Address: '782 Madison Avenue, New York, NY 10065',
      Phone: '+1 (555) 876-5432',
      Email: 'uptown@rms-dining.com',
      OpeningHours: 'Tue - Sun: 5:00 PM – 11:30 PM',
      MapUrl: 'https://maps.google.com/maps?q=Madison+Avenue+Dining&t=&z=13&ie=UTF8&iwloc=&output=embed'
    }
  ];

  const activeLocations = locations && locations.length > 0 ? locations : defaultLocations;
  const currentLoc = activeLocations[selectedIdx] || activeLocations[0];

  return (
    <section className="py-20 bg-stone-950 text-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <MapPin className="w-3.5 h-3.5" />
            <span>Find Our Dining Rooms</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">
            {title}
          </h2>
          <p className="text-stone-400 text-base sm:text-lg font-light">
            {subtitle}
          </p>
        </div>

        {/* Location selector tabs if multiple locations */}
        {activeLocations.length > 1 && (
          <div className="flex justify-center gap-2 mb-10 overflow-x-auto pb-2">
            {activeLocations.map((loc, idx) => (
              <button
                key={loc.RestaurantId || idx}
                onClick={() => setSelectedIdx(idx)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                  selectedIdx === idx
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-stone-900 text-stone-300 hover:bg-stone-800 border border-stone-800'
                }`}
              >
                {loc.Name || loc.RestaurantName || `Location ${idx + 1}`}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Details Card */}
          <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-2xl p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-serif font-bold text-white mb-2">
                {currentLoc.Name || currentLoc.RestaurantName}
              </h3>
              <p className="text-amber-500 text-sm font-medium mb-6">
                {currentLoc.Description || 'Premier Dining Destination'}
              </p>

              <div className="space-y-4 text-stone-300 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-medium">Address</strong>
                    <span className="font-light">{currentLoc.Address || '124 Gourmet Boulevard, New York'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-medium">Opening Hours</strong>
                    <span className="font-light">{currentLoc.OpeningHours || 'Daily: 11:30 AM – 11:00 PM'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-medium">Phone & Reservations</strong>
                    <a
                      href={`tel:${(currentLoc.Phone || '').replace(/\D/g, '')}`}
                      className="font-light hover:text-amber-400 transition-colors"
                    >
                      {currentLoc.Phone || '+1 (555) 234-5678'}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-medium">Email</strong>
                    <a
                      href={`mailto:${currentLoc.Email || 'concierge@rms.com'}`}
                      className="font-light hover:text-amber-400 transition-colors"
                    >
                      {currentLoc.Email || 'concierge@rms.com'}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-stone-800">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(currentLoc.Address || currentLoc.Name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 font-medium"
              >
                <span>Get Driving Directions</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Map Embed or View */}
          <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden min-h-[350px]">
            <iframe
              title={`Map of ${currentLoc.Name || 'Restaurant'}`}
              src={currentLoc.MapUrl || 'https://maps.google.com/maps?q=New+York+City&t=&z=13&ie=UTF8&iwloc=&output=embed'}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '350px' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}


import React from 'react';
import SEOHelmet from '../components/SEOHelmet';
import MapContactSection from '../sections/MapContactSection';
import ReservationCTASection from '../sections/ReservationCTASection';

export default function LocationsPage() {
  return (
    <>
      <SEOHelmet
        title="Dining Locations & Opening Hours | RMS Restaurant"
        description="Find an RMS dining salon near you. View addresses, contact numbers, valet availability, and operating hours."
      />

      <div className="pt-24 bg-stone-900 border-b border-stone-800 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4">
          Our Dining Rooms
        </h1>
        <p className="text-stone-400 text-lg max-w-2xl mx-auto font-light">
          Experience timeless culinary craftsmanship across our signature dining locations.
        </p>
      </div>

      <main className="w-full">
        <MapContactSection />
        <ReservationCTASection />
      </main>
    </>
  );
}


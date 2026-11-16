import React from 'react';
import SEOHelmet from '../components/SEOHelmet';
import { usePublicPage } from '../hooks/usePublicPage';
import { DynamicSectionRenderer } from '../sections/SectionRegistry';
import AboutStorySection from '../sections/AboutStorySection';
import ChefFeatureSection from '../sections/ChefFeatureSection';
import StatsCounterSection from '../sections/StatsCounterSection';
import ServicesListSection from '../sections/ServicesListSection';
import ReservationCTASection from '../sections/ReservationCTASection';

export default function AboutPage() {
  const { page, sections } = usePublicPage('about');

  return (
    <>
      <SEOHelmet
        title={page?.MetaTitle || page?.Title || 'Our Heritage & Philosophy | About Us'}
        description={page?.MetaDescription || 'Discover the story behind our culinary philosophy, master chefs, and passion for unforgettable dining.'}
        keywords={page?.MetaKeywords}
        ogImage={page?.OgImageUrl}
      />

      <div className="pt-24 bg-stone-900 border-b border-stone-800 text-center py-16">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4">
          Our Heritage & Passion
        </h1>
        <p className="text-stone-400 text-lg max-w-2xl mx-auto font-light">
          A relentless pursuit of flavor, sustainability, and authentic hospitality.
        </p>
      </div>

      <main className="w-full">
        {sections && sections.length > 0 ? (
          sections.map((section) => (
            <DynamicSectionRenderer key={section.SectionId || section.SectionKey} section={section} />
          ))
        ) : (
          <>
            <AboutStorySection />
            <StatsCounterSection />
            <ChefFeatureSection />
            <ServicesListSection />
            <ReservationCTASection />
          </>
        )}
      </main>
    </>
  );
}


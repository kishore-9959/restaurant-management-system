import React from 'react';
import SEOHelmet from '../components/SEOHelmet';
import { usePublicPage } from '../hooks/usePublicPage';
import { DynamicSectionRenderer } from '../sections/SectionRegistry';
import HeroSliderSection from '../sections/HeroSliderSection';
import AboutStorySection from '../sections/AboutStorySection';
import FeaturedMenuSection from '../sections/FeaturedMenuSection';
import ChefFeatureSection from '../sections/ChefFeatureSection';
import StatsCounterSection from '../sections/StatsCounterSection';
import ServicesListSection from '../sections/ServicesListSection';
import TestimonialsSection from '../sections/TestimonialsSection';
import ReservationCTASection from '../sections/ReservationCTASection';
import NewsletterSection from '../sections/NewsletterSection';

export default function HomePage() {
  const { page, sections, loading } = usePublicPage('home');

  const pageTitle = page?.MetaTitle || page?.Title || 'Exquisite Fine Dining & Culinary Artistry';
  const pageDescription = page?.MetaDescription || 'Welcome to RMS Restaurant - where world-class gastronomy meets timeless hospitality.';

  return (
    <>
      <SEOHelmet
        title={pageTitle}
        description={pageDescription}
        keywords={page?.MetaKeywords}
        ogImage={page?.OgImageUrl}
      />

      <main className="w-full">
        {sections && sections.length > 0 ? (
          // Render dynamically configured CMS sections
          sections.map((section) => (
            <DynamicSectionRenderer key={section.SectionId || section.SectionKey} section={section} />
          ))
        ) : (
          // Standard curated presentation
          <>
            <HeroSliderSection />
            <AboutStorySection />
            <FeaturedMenuSection />
            <StatsCounterSection />
            <ChefFeatureSection />
            <ServicesListSection />
            <TestimonialsSection />
            <ReservationCTASection />
            <NewsletterSection />
          </>
        )}
      </main>
    </>
  );
}


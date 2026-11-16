import React from 'react';
import HeroSliderSection from './HeroSliderSection';
import AboutStorySection from './AboutStorySection';
import FeaturedMenuSection from './FeaturedMenuSection';
import ChefFeatureSection from './ChefFeatureSection';
import ServicesListSection from './ServicesListSection';
import StatsCounterSection from './StatsCounterSection';
import TestimonialsSection from './TestimonialsSection';
import FAQAccordionSection from './FAQAccordionSection';
import ReservationCTASection from './ReservationCTASection';
import NewsletterSection from './NewsletterSection';
import MapContactSection from './MapContactSection';
import CustomHtmlSection from './CustomHtmlSection';

export const SECTION_COMPONENTS = {
  HERO_SLIDER: HeroSliderSection,
  ABOUT_STORY: AboutStorySection,
  FEATURED_MENU: FeaturedMenuSection,
  CHEF_FEATURE: ChefFeatureSection,
  SERVICES_LIST: ServicesListSection,
  STATS_COUNTER: StatsCounterSection,
  TESTIMONIALS_GRID: TestimonialsSection,
  FAQ_ACCORDION: FAQAccordionSection,
  RESERVATION_CTA: ReservationCTASection,
  NEWSLETTER_FORM: NewsletterSection,
  MAP_CONTACT: MapContactSection,
  CUSTOM_HTML: CustomHtmlSection,
};

/**
 * Renders a dynamic page section by looking up its ComponentType in the registry.
 */
export function DynamicSectionRenderer({ section }) {
  if (!section || section.IsActive === false) {
    return null;
  }

  const Component = SECTION_COMPONENTS[section.ComponentType] || CustomHtmlSection;

  return (
    <div data-section-key={section.SectionKey} data-component-type={section.ComponentType}>
      <Component section={section} />
    </div>
  );
}

export default SECTION_COMPONENTS;


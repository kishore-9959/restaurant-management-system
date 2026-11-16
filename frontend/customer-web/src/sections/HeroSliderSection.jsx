import React from 'react';
import BannerCarousel from '../components/BannerCarousel';
import { usePublicBanners } from '../hooks/usePublicBanners';

/**
 * HeroSliderSection Component (ComponentType: HERO_SLIDER)
 * Renders hero banner slider or fallback presentation using CMS banners.
 */
export default function HeroSliderSection({ section }) {
  const { banners, loading } = usePublicBanners();

  // If section provides custom parsed content items, use them, otherwise use active public banners
  let customItems = null;
  if (section?.Content) {
    try {
      const parsed = typeof section.Content === 'string' ? JSON.parse(section.Content) : section.Content;
      if (Array.isArray(parsed?.slides) && parsed.slides.length > 0) {
        customItems = parsed.slides;
      }
    } catch {
      // Content is not JSON, proceed with banners
    }
  }

  const slides = customItems || banners;

  if (loading && (!slides || slides.length === 0)) {
    return (
      <div className="w-full h-[480px] md:h-[600px] bg-stone-900 animate-pulse flex items-center justify-center">
        <div className="text-amber-500 font-serif text-lg">Loading culinary experience...</div>
      </div>
    );
  }

  return (
    <section className="relative w-full overflow-hidden">
      <BannerCarousel banners={slides} />
    </section>
  );
}


import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * BannerCarousel Component
 * Displays dynamic hero banners with autoplay, navigation arrows, indicators, and CTA links.
 */
export default function BannerCarousel({ banners = [], autoPlayInterval = 6000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const activeBanners = banners.filter(b => b.IsActive !== false);

  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [activeBanners.length, isPaused, autoPlayInterval]);

  if (!activeBanners || activeBanners.length === 0) {
    return null;
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const current = activeBanners[currentIndex];

  return (
    <div 
      className="relative w-full h-[480px] md:h-[600px] overflow-hidden bg-gray-900 text-white select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Image / Overlay */}
      {activeBanners.map((banner, idx) => (
        <div
          key={banner.BannerId || idx}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          {banner.ImageUrl ? (
            <img
              src={banner.ImageUrl}
              alt={banner.Title || 'Banner'}
              className="w-full h-full object-cover brightness-[0.65]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-amber-900 via-stone-900 to-black" />
          )}

          {/* Content overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="max-w-4xl mx-auto px-6 text-center">
              {banner.Title && (
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold mb-4 drop-shadow-md text-amber-100 animate-fadeIn">
                  {banner.Title}
                </h1>
              )}
              {banner.Subtitle && (
                <p className="text-lg md:text-2xl text-stone-200 mb-8 max-w-2xl mx-auto font-light drop-shadow">
                  {banner.Subtitle}
                </p>
              )}
              {banner.CtaText && banner.CtaLink && (
                <div className="pt-2">
                  {banner.CtaLink.startsWith('http') ? (
                    <a
                      href={banner.CtaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-8 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-full shadow-lg transition-transform transform hover:scale-105"
                    >
                      <span>{banner.CtaText}</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <Link
                      to={banner.CtaLink}
                      className="inline-flex items-center gap-2 px-8 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-full shadow-lg transition-transform transform hover:scale-105"
                    >
                      {banner.CtaText}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Navigation arrows (shown when multiple banners exist) */}
      {activeBanners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            aria-label="Previous Slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white transition-opacity duration-300 opacity-80 group-hover:opacity-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            aria-label="Next Slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white transition-opacity duration-300 opacity-80 group-hover:opacity-100"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? 'w-8 bg-amber-500'
                    : 'bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}


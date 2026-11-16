import React from 'react';
import { Award, Utensils, HeartHandshake } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * AboutStorySection Component (ComponentType: ABOUT_STORY)
 * Highlights restaurant heritage, culinary philosophy, and core values.
 */
export default function AboutStorySection({ section }) {
  let contentData = {};
  if (section?.Content) {
    try {
      contentData = typeof section.Content === 'string' ? JSON.parse(section.Content) : section.Content;
    } catch {
      contentData = { text: section.Content };
    }
  }

  const title = section?.Title || contentData.title || 'Our Culinary Philosophy';
  const subtitle = section?.Subtitle || contentData.subtitle || 'Crafted with Passion & Authenticity';
  const text = contentData.text || 'At RMS Restaurant, we believe gastronomy is an art form. Founded on the principle of bringing uncompromising culinary artistry and warm hospitality to every guest, our kitchen sources the finest local produce and rare spices to craft unforgettable dining moments.';
  const imageUrl = contentData.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80';
  const yearsInBusiness = contentData.yearsInBusiness || '15+';

  return (
    <section className="py-20 bg-stone-900 text-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Visual Column */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-stone-800">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-[400px] md:h-[500px] object-cover hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>

            {/* Experience Badge */}
            <div className="absolute -bottom-6 -right-6 md:bottom-8 md:-right-8 bg-amber-600 text-white p-6 rounded-2xl shadow-xl flex items-center gap-4 border-2 border-stone-900">
              <Award className="w-10 h-10 text-amber-200" />
              <div>
                <p className="text-3xl font-serif font-bold">{yearsInBusiness}</p>
                <p className="text-xs uppercase tracking-wider text-amber-100">Years of Heritage</p>
              </div>
            </div>
          </div>

          {/* Text Narrative Column */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Utensils className="w-3.5 h-3.5" />
              <span>Heritage & Craft</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">
              {title}
            </h2>
            <p className="text-amber-500 text-lg font-light mb-6">
              {subtitle}
            </p>

            <div className="text-stone-300 space-y-4 leading-relaxed font-light text-base">
              {text.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-stone-800 pt-6">
              <div className="flex items-center gap-3">
                <HeartHandshake className="w-6 h-6 text-amber-500" />
                <span className="text-sm font-medium text-stone-200">Ethically Sourced</span>
              </div>
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-amber-500" />
                <span className="text-sm font-medium text-stone-200">Award-Winning Brigade</span>
              </div>
            </div>

            <div className="mt-8">
              <Link
                to="/about"
                className="inline-block px-6 py-3 bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-xl font-medium transition-colors"
              >
                Read Our Story &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


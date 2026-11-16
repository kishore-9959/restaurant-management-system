import { useEffect } from 'react';

export default function SEOHelmet({
  title = 'Antigravity Bistro | Modern Fine Dining',
  description = 'Experience extraordinary sensory gastronomy and seasonal culinary creations at Antigravity Bistro.',
  keywords = 'fine dining, michelin, restaurant, gastronomy, wine pairing',
  canonicalUrl = 'https://antigravitybistro.com',
  ogImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  structuredData = null,
}) {
  useEffect(() => {
    // 1. Page Title
    document.title = title;

    // 2. Helper to set or update meta tag
    const setMeta = (name, content, isProperty = false) => {
      if (!content) return;
      const attr = isProperty ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', description);
    setMeta('keywords', keywords);

    // OpenGraph
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('og:image', ogImage, true);
    setMeta('og:type', 'restaurant', true);

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', ogImage);

    // Canonical Link
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    // Schema.org JSON-LD script
    let scriptEl = document.getElementById('schema-jsonld');
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'schema-jsonld';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }

    const defaultSchema = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: 'Antigravity Bistro',
      image: ogImage,
      url: canonicalUrl,
      servesCuisine: 'Modern European & Contemporary Gastronomy',
      priceRange: '$$$$',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '100 Feet Road, Indiranagar',
        addressLocality: 'Bengaluru',
        addressRegion: 'Karnataka',
        postalCode: '560038',
        addressCountry: 'IN',
      },
    };

    scriptEl.textContent = JSON.stringify(structuredData || defaultSchema);
  }, [title, description, keywords, canonicalUrl, ogImage, structuredData]);

  return null;
}


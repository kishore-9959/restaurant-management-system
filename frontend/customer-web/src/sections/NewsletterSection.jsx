import React, { useState } from 'react';
import { Mail, CheckCircle, Loader2 } from 'lucide-react';

/**
 * NewsletterSection Component (ComponentType: NEWSLETTER_FORM)
 * Newsletter subscription form for seasonal menus, secret recipes, and special invitations.
 */
export default function NewsletterSection({ section }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  let contentData = {};
  if (section?.Content) {
    try {
      contentData = typeof section.Content === 'string' ? JSON.parse(section.Content) : section.Content;
    } catch {
      contentData = {};
    }
  }

  const title = section?.Title || contentData.title || 'Join the Epicurean Club';
  const subtitle = section?.Subtitle || contentData.subtitle || 'Subscribe to receive seasonal tasting menus, wine release notices, and invitation-only dining events.';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setEmail('');
    }, 800);
  };

  return (
    <section className="py-16 bg-stone-900 border-y border-stone-800 text-stone-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-3">
          {title}
        </h2>
        <p className="text-stone-400 text-sm sm:text-base max-w-xl mx-auto mb-8 font-light">
          {subtitle}
        </p>

        {submitted ? (
          <div className="inline-flex items-center gap-2 p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-sm font-medium animate-fadeIn">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>Thank you for subscribing! Your complimentary welcome guide has been dispatched.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..."
              required
              className="flex-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Subscribe</span>
                </>
              )}
            </button>
          </form>
        )}

        <p className="mt-4 text-xs text-stone-500">
          We respect your privacy. Unsubscribe at any time with a single click.
        </p>
      </div>
    </section>
  );
}


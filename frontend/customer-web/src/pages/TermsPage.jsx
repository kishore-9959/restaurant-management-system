import React from 'react';
import { FileText } from 'lucide-react';
import SEOHelmet from '../components/SEOHelmet';

export default function TermsPage() {
  return (
    <>
      <SEOHelmet
        title="Terms of Service & Dining Policy | RMS Dining"
        description="Review our guest terms, reservation guidelines, cancellation rules, and website usage policies."
      />

      <div className="pt-24 bg-stone-900 border-b border-stone-800 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <FileText className="w-3.5 h-3.5" />
          <span>Policies & Conditions</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4">
          Terms of Service
        </h1>
        <p className="text-stone-400 text-sm font-light">
          Last updated: November 2026
        </p>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-stone-300 leading-relaxed space-y-8 font-light text-sm sm:text-base">
        <section>
          <h2 className="text-xl font-serif font-bold text-white mb-3">1. Reservation Policies</h2>
          <p>
            Table bookings are held for a grace period of 15 minutes past the scheduled arrival time. If your party is delayed, please notify our maître d'. We cannot guarantee table availability for parties arriving more than 20 minutes past their reserved time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-white mb-3">2. Cancellations & No-Shows</h2>
          <p>
            Standard reservations may be cancelled without penalty up to 24 hours prior. For special tasting menus, holiday galas, or parties of 6 or more, cancellations within 24 hours or unnotified absences are subject to a cancellation fee of $50 per registered guest.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-white mb-3">3. Dress Code & Etiquette</h2>
          <p>
            To maintain our intimate dining ambiance, we maintain an elegant smart-casual dress standard. We reserve the right to decline entry to parties dressed in beachwear, athletic gym clothing, or distressed garments.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-white mb-3">4. Intellectual Property</h2>
          <p>
            All culinary photography, menu names, bespoke recipes, branding marks, and website content are the exclusive intellectual property of RMS Restaurant Management Systems. Unauthorized reproduction or commercial use is strictly prohibited.
          </p>
        </section>
      </main>
    </>
  );
}


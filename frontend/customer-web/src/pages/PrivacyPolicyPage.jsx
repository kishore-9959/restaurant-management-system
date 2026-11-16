import React from 'react';
import { ShieldCheck } from 'lucide-react';
import SEOHelmet from '../components/SEOHelmet';

export default function PrivacyPolicyPage() {
  return (
    <>
      <SEOHelmet
        title="Privacy Policy | RMS Dining"
        description="Learn how RMS Restaurant respects, manages, and protects your personal data and reservation information."
      />

      <div className="pt-24 bg-stone-900 border-b border-stone-800 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Trust & Confidentiality</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4">
          Privacy Policy
        </h1>
        <p className="text-stone-400 text-sm font-light">
          Last updated: November 2026
        </p>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-stone-300 leading-relaxed space-y-8 font-light text-sm sm:text-base">
        <section>
          <h2 className="text-xl font-serif font-bold text-white mb-3">1. Information We Collect</h2>
          <p>
            When you visit our website, submit a contact inquiry, make a dining reservation, or subscribe to our newsletter, we collect necessary personal details such as your full name, email address, phone number, and any special dietary or celebration preferences you disclose.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-white mb-3">2. How We Use Your Information</h2>
          <p>
            Your information is used strictly to confirm table bookings, personalize your gastronomic experience, dispatch reservation reminders, reply to inquiries, and—with your consent—send curated invitations to seasonal dining events.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-white mb-3">3. Data Protection & Security</h2>
          <p>
            We implement industry-standard encryption protocols (TLS/SSL) for all digital interactions. Financial payment processing is handled through certified PCI-DSS compliant gateways; we never store full payment card credentials on our servers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-white mb-3">4. Third-Party Sharing</h2>
          <p>
            We do not sell, rent, or trade your personal information. Data is shared exclusively with trusted infrastructure partners (such as transactional email and reservation dispatch services) strictly to fulfill dining service operations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-serif font-bold text-white mb-3">5. Contact Our Privacy Officer</h2>
          <p>
            For any inquiries regarding data protection, access requests, or deletion of your information, please reach out directly to privacy@rms-dining.com.
          </p>
        </section>
      </main>
    </>
  );
}


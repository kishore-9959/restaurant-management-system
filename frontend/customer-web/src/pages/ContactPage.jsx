import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import SEOHelmet from '../components/SEOHelmet';
import { cmsService } from '../services/cmsService';
import { useLocations } from '../hooks/useLocations';

export default function ContactPage() {
  const { locations } = useLocations();
  const primaryLocation = locations?.[0] || {
    Address: '124 Gourmet Boulevard, Suite 100, New York, NY 10001',
    Phone: '+1 (555) 234-5678',
    Email: 'concierge@rms-dining.com',
    OpeningHours: 'Mon - Sun: 11:30 AM – 11:00 PM'
  };

  const [formData, setFormData] = useState({
    Name: '',
    Email: '',
    Phone: '',
    Subject: '',
    Message: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.Name.trim() || !formData.Email.trim() || !formData.Message.trim()) {
      setError('Please provide your name, email, and a message.');
      return;
    }

    try {
      setLoading(true);
      await cmsService.submitContactMessage(formData);
      setSuccess(true);
      setFormData({ Name: '', Email: '', Phone: '', Subject: '', Message: '' });
    } catch (err) {
      console.error('Contact submission error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHelmet
        title="Contact Concierge & Reservations | RMS Dining"
        description="Reach out to our maître d' and events team for table bookings, private dining buyouts, and press inquiries."
      />

      <div className="pt-24 bg-stone-900 border-b border-stone-800 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4">
          Connect with Our Concierge
        </h1>
        <p className="text-stone-400 text-lg max-w-2xl mx-auto font-light">
          Whether planning an intimate dinner or a grand celebratory buyout, our team is at your service.
        </p>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Contact Information Cards */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-8">
              <h3 className="text-2xl font-serif font-bold text-white mb-6">
                Dining Inquiries
              </h3>

              <div className="space-y-6 text-stone-300 text-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Address</h4>
                    <p className="font-light mt-0.5">{primaryLocation.Address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Concierge Desk</h4>
                    <a
                      href={`tel:${primaryLocation.Phone.replace(/\D/g, '')}`}
                      className="font-light hover:text-amber-400 transition-colors block mt-0.5"
                    >
                      {primaryLocation.Phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Direct Email</h4>
                    <a
                      href={`mailto:${primaryLocation.Email}`}
                      className="font-light hover:text-amber-400 transition-colors block mt-0.5"
                    >
                      {primaryLocation.Email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Service Hours</h4>
                    <p className="font-light mt-0.5">{primaryLocation.OpeningHours}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-stone-900/60 border border-stone-800 rounded-2xl text-stone-400 text-xs font-light leading-relaxed">
              <strong className="text-white block font-medium mb-1">Private Dining & Events:</strong>
              For parties of 8 or more, please submit your event date, expected guest count, and catering preferences via the form. Our events director will respond within 24 hours.
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-2xl p-8 sm:p-10">
            <h2 className="text-2xl font-serif font-bold text-white mb-2">
              Send a Message
            </h2>
            <p className="text-stone-400 text-sm mb-8 font-light">
              We look forward to curating an exceptional culinary journey for you.
            </p>

            {success ? (
              <div className="py-16 text-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-bounce" />
                <h3 className="text-2xl font-serif font-bold text-white mb-2">Message Dispatched</h3>
                <p className="text-stone-300 text-sm max-w-md mx-auto mb-8 font-light">
                  Thank you for contacting us. A member of our hospitality team will be in touch shortly.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl flex items-center gap-3 text-red-200 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300 mb-1.5">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    name="Name"
                    value={formData.Name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Lord Julian Sterling"
                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300 mb-1.5">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="Email"
                      value={formData.Email}
                      onChange={handleChange}
                      required
                      placeholder="julian@domain.com"
                      className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="Phone"
                      value={formData.Phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300 mb-1.5">
                    Subject / Topic
                  </label>
                  <input
                    type="text"
                    name="Subject"
                    value={formData.Subject}
                    onChange={handleChange}
                    placeholder="Reservation inquiry, Private dining buyout, Feedback..."
                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300 mb-1.5">
                    Message Details *
                  </label>
                  <textarea
                    name="Message"
                    rows="5"
                    value={formData.Message}
                    onChange={handleChange}
                    required
                    placeholder="Please let us know how we can make your dining experience memorable..."
                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-8 py-3.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Dispatch Message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}


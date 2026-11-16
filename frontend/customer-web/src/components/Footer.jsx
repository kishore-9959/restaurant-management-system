import React from 'react';
import { Link } from 'react-router-dom';
import { useWebsiteSettings } from '../context/SettingsContext';
import { usePublicFooter } from '../hooks/usePublicFooter';
import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Youtube, Twitter } from 'lucide-react';

export default function Footer() {
  const { settings } = useWebsiteSettings();
  const { footer } = usePublicFooter();

  const brandTitle = settings?.SiteTitle || 'Antigravity Bistro';
  const tagline = settings?.Tagline || 'Modern European Gastronomy & Artisanal Mixology';
  const address = settings?.AddressLine || '100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038';
  const email = settings?.ContactEmail || 'concierge@antigravitybistro.com';
  const phone = settings?.ContactPhone || '+91 80 4123 4567';

  const footerSections = footer?.footerSections || [];
  const socialLinks = footer?.socialLinks || [];

  const getSocialIcon = (key) => {
    const k = (key || '').toLowerCase();
    if (k.includes('instagram')) return <Instagram size={18} />;
    if (k.includes('facebook')) return <Facebook size={18} />;
    if (k.includes('youtube')) return <Youtube size={18} />;
    return <Twitter size={18} />;
  };

  return (
    <footer style={{ backgroundColor: '#090d16', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '4rem', paddingBottom: '2rem' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2.5rem', marginBottom: '3.5rem' }}>
          {/* Column 1: Brand & Bio */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem' }}>
              {brandTitle}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              {tagline}
            </p>
            {/* Social Icons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {socialLinks.length > 0 ? (
                socialLinks.map((s) => (
                  <a
                    key={s.SocialLinkId}
                    href={s.PlatformUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#cbd5e1',
                      transition: 'all 0.2s',
                    }}
                    title={s.PlatformName}
                  >
                    {getSocialIcon(s.IconKey || s.PlatformName)}
                  </a>
                ))
              ) : (
                <>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><Instagram size={18} /></a>
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><Facebook size={18} /></a>
                </>
              )}
            </div>
          </div>

          {/* Dynamic Footer Sections from Database */}
          {footerSections.map((sec) => (
            <div key={sec.FooterSectionId}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {sec.SectionTitle}
              </h4>
              {sec.ContentHtml ? (
                <div
                  style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: sec.ContentHtml }}
                />
              ) : (
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <li><Link to="/menu" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Seasonal Menu</Link></li>
                  <li><Link to="/about" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Our Philosophy</Link></li>
                  <li><Link to="/locations" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Private Dining</Link></li>
                </ul>
              )}
            </div>
          ))}

          {/* Quick Links Column */}
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Explore
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li><Link to="/" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Home</Link></li>
              <li><Link to="/about" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Story & Chefs</Link></li>
              <li><Link to="/menu" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>A La Carte & Tasting</Link></li>
              <li><Link to="/locations" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Locations & Hours</Link></li>
              <li><Link to="/faqs" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Frequently Asked Questions</Link></li>
              <li><Link to="/testimonials" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Critic & Guest Reviews</Link></li>
              <li><Link to="/contact" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Contact & Concierge</Link></li>
            </ul>
          </div>

          {/* Column 4: Contact Coordinates */}
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Concierge
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#94a3b8', fontSize: '0.9rem' }}>
              <li style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <MapPin size={18} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{address}</span>
              </li>
              <li style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <Phone size={18} color="var(--primary-color)" style={{ flexShrink: 0 }} />
                <a href={`tel:${phone}`}>{phone}</a>
              </li>
              <li style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <Mail size={18} color="var(--primary-color)" style={{ flexShrink: 0 }} />
                <a href={`mailto:${email}`}>{email}</a>
              </li>
              <li style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <Clock size={18} color="var(--primary-color)" style={{ flexShrink: 0 }} />
                <span>Daily: 12:00 PM – 11:30 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Sub-Footer */}
        <div style={{ paddingTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
          <p>© {new Date().getFullYear()} {brandTitle}. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/privacy-policy" style={{ color: '#64748b' }}>Privacy Policy</Link>
            <Link to="/terms" style={{ color: '#64748b' }}>Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}


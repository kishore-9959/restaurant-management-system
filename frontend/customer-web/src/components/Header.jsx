import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWebsiteSettings } from '../context/SettingsContext';
import { usePublicNavigation } from '../hooks/usePublicNavigation';
import { Menu, X, UtensilsCrossed, Phone, ChevronDown } from 'lucide-react';

export default function Header() {
  const { settings } = useWebsiteSettings();
  const { navigation } = usePublicNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const brandTitle = settings?.SiteTitle || 'Antigravity Bistro';
  const logoUrl = settings?.HeaderLogoUrl || null;
  const contactPhone = settings?.ContactPhone || '+91 80 4123 4567';

  // Fallback nav links if DB navigation hasn't loaded yet
  const navLinks = (navigation && navigation.header && navigation.header.length > 0)
    ? navigation.header
    : [
        { MenuId: 1, Title: 'Home', TargetUrl: '/' },
        { MenuId: 2, Title: 'About Us', TargetUrl: '/about' },
        { MenuId: 3, Title: 'Menu', TargetUrl: '/menu' },
        { MenuId: 4, Title: 'Locations', TargetUrl: '/locations' },
        { MenuId: 5, Title: 'Reservations', TargetUrl: '/reservations' },
        { MenuId: 6, Title: 'FAQs', TargetUrl: '/faqs' },
        { MenuId: 7, Title: 'Reviews', TargetUrl: '/testimonials' },
        { MenuId: 8, Title: 'Contact', TargetUrl: '/contact' },
      ];

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '80px' }}>
        {/* Logo / Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {logoUrl ? (
            <img src={logoUrl} alt={brandTitle} style={{ height: '44px', width: 'auto', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UtensilsCrossed size={22} color="#ffffff" />
            </div>
          )}
          <div>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 700, letterSpacing: '0.02em', color: '#ffffff' }}>
              {brandTitle}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav style={{ display: 'none' }} className="desktop-nav">
          <ul style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', listStyle: 'none' }}>
            {navLinks.map((item) => {
              const isActive = location.pathname === item.TargetUrl;
              const hasChildren = item.children && item.children.length > 0;

              return (
                <li key={item.MenuId} style={{ position: 'relative' }} className="nav-item">
                  <Link
                    to={item.TargetUrl}
                    target={item.OpenInNewTab ? '_blank' : '_self'}
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--primary-color)' : '#cbd5e1',
                      transition: 'color 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    {item.Title}
                    {hasChildren && <ChevronDown size={14} />}
                  </Link>
                  {hasChildren && (
                    <ul className="dropdown-menu">
                      {item.children.map((child) => (
                        <li key={child.MenuId}>
                          <Link to={child.TargetUrl} target={child.OpenInNewTab ? '_blank' : '_self'}>
                            {child.Title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Actions / CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href={`tel:${contactPhone}`} style={{ display: 'none', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }} className="phone-link">
            <Phone size={16} color="var(--primary-color)" />
            <span>{contactPhone}</span>
          </a>
          <Link to="/reservations" className="btn-primary" style={{ padding: '0.6rem 1.4rem', fontSize: '0.9rem' }}>
            Reserve Table
          </Link>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: 'inline-flex', padding: '0.5rem', background: 'transparent', color: '#ffffff' }}
            className="mobile-toggle"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{ backgroundColor: '#0f172a', borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '1.5rem' }}>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {navLinks.map((item) => (
              <li key={item.MenuId}>
                <Link
                  to={item.TargetUrl}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ fontSize: '1.05rem', fontWeight: 500, color: location.pathname === item.TargetUrl ? 'var(--primary-color)' : '#e2e8f0', display: 'block' }}
                >
                  {item.Title}
                </Link>
              </li>
            ))}
            <li style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="btn-primary" style={{ width: '100%' }}>
                Book a Table
              </Link>
            </li>
          </ul>
        </div>
      )}

      <style>{`
        @media (min-width: 992px) {
          .desktop-nav { display: block !important; }
          .phone-link { display: inline-flex !important; }
          .mobile-toggle { display: none !important; }
        }
        .nav-item:hover .dropdown-menu { display: block; }
        .dropdown-menu {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          background-color: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          min-width: 180px;
          padding: 0.5rem 0;
          list-style: none;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .dropdown-menu a {
          display: block;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          color: #cbd5e1;
        }
        .dropdown-menu a:hover {
          background-color: rgba(255, 255, 255, 0.05);
          color: var(--primary-color);
        }
      `}</style>
    </header>
  );
}


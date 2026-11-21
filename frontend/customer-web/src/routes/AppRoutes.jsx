import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import HomePage from '../pages/HomePage';
import AboutPage from '../pages/AboutPage';
import MenuPage from '../pages/MenuPage';
import MenuItemDetailsPage from '../pages/MenuItemDetailsPage';
import LocationsPage from '../pages/LocationsPage';
import ContactPage from '../pages/ContactPage';
import FAQsPage from '../pages/FAQsPage';
import TestimonialsPage from '../pages/TestimonialsPage';
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage';
import TermsPage from '../pages/TermsPage';
import DynamicPage from '../pages/DynamicPage';
import ReservationPage from '../pages/ReservationPage';
import AdminAnalyticsDashboard from '../pages/AdminAnalyticsDashboard';
import NotFoundPage from '../pages/NotFoundPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Dedicated Executive Analytics Portal Route */}
      <Route path="/admin/analytics" element={<AdminAnalyticsDashboard />} />
      <Route path="/admin/reports" element={<AdminAnalyticsDashboard />} />

      {/* Public Customer Web Storefront */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="menu/:id" element={<MenuItemDetailsPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="faqs" element={<FAQsPage />} />
        <Route path="testimonials" element={<TestimonialsPage />} />
        <Route path="reservations" element={<ReservationPage />} />
        <Route path="privacy" element={<PrivacyPolicyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="pages/:slug" element={<DynamicPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}


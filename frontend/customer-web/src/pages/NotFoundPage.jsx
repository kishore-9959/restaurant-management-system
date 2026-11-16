import React from 'react';
import { Link } from 'react-router-dom';
import { Utensils, Home, ArrowLeft } from 'lucide-react';
import SEOHelmet from '../components/SEOHelmet';

export default function NotFoundPage({ message }) {
  return (
    <>
      <SEOHelmet
        title="Page Not Found | RMS Dining"
        description="The page you are looking for does not exist or has been moved."
      />

      <div className="min-h-[75vh] flex items-center justify-center px-4 py-24 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 bg-stone-900 border border-stone-800 rounded-full flex items-center justify-center text-amber-500">
            <Utensils className="w-10 h-10" />
          </div>

          <p className="text-amber-500 font-serif text-6xl font-bold mb-2">404</p>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-4">
            Course Not Found
          </h1>
          <p className="text-stone-400 text-sm font-light mb-8">
            {message || "We could not find the dining destination or page you were searching for."}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-transform active:scale-95 shadow-md"
            >
              <Home className="w-4 h-4" />
              <span>Return Home</span>
            </Link>
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 rounded-xl text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Explore Menu</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}


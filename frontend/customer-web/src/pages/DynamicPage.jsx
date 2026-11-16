import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import SEOHelmet from '../components/SEOHelmet';
import { usePublicPage } from '../hooks/usePublicPage';
import { DynamicSectionRenderer } from '../sections/SectionRegistry';
import LoadingSpinner from '../components/LoadingSpinner';
import NotFoundPage from './NotFoundPage';

export default function DynamicPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';

  const { page, sections, loading, error } = usePublicPage(slug);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center pt-20">
        <LoadingSpinner size="lg" text="Loading page experience..." />
      </div>
    );
  }

  if (error || !page) {
    return <NotFoundPage message={`The requested page "${slug}" could not be found.`} />;
  }

  return (
    <>
      <SEOHelmet
        title={page.MetaTitle || page.Title}
        description={page.MetaDescription}
        keywords={page.MetaKeywords}
        ogImage={page.OgImageUrl}
      />

      {/* Draft Preview Indicator Banner */}
      {isPreview && (
        <div className="bg-amber-600 text-stone-950 px-4 py-2 text-center text-xs font-bold uppercase tracking-widest sticky top-0 z-50 shadow-md">
          Draft Preview Mode — Content may not yet be published live
        </div>
      )}

      {/* Page Header (if configured) */}
      <div className="pt-24 bg-stone-900 border-b border-stone-800 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4">
          {page.Title}
        </h1>
        {page.Subtitle && (
          <p className="text-stone-400 text-base sm:text-lg max-w-2xl mx-auto font-light">
            {page.Subtitle}
          </p>
        )}
      </div>

      {/* Render Dynamic Sections */}
      <main className="w-full">
        {sections && sections.length > 0 ? (
          sections.map((section) => (
            <DynamicSectionRenderer key={section.SectionId || section.SectionKey} section={section} />
          ))
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-20 text-center text-stone-400">
            <p>This page currently has no active content sections.</p>
          </div>
        )}
      </main>
    </>
  );
}


import React from 'react';

/**
 * CustomHtmlSection Component (ComponentType: CUSTOM_HTML)
 * Renders arbitrary HTML or styled custom content created via the CMS rich editor.
 */
export default function CustomHtmlSection({ section }) {
  let contentHtml = '';
  if (section?.Content) {
    if (typeof section.Content === 'string') {
      try {
        const parsed = JSON.parse(section.Content);
        contentHtml = parsed.html || parsed.content || section.Content;
      } catch {
        contentHtml = section.Content;
      }
    } else if (typeof section.Content === 'object') {
      contentHtml = section.Content.html || section.Content.content || '';
    }
  }

  const title = section?.Title;
  const subtitle = section?.Subtitle;

  return (
    <section className="py-16 bg-stone-900 text-stone-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {(title || subtitle) && (
          <div className="text-center mb-10">
            {title && (
              <h2 className="text-3xl font-serif font-bold text-white mb-2">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-stone-400 font-light text-base">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div
          className="prose prose-invert prose-amber max-w-none leading-relaxed text-stone-300"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>
    </section>
  );
}


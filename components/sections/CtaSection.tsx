/**
 * CTA Section - Server Component
 *
 * Call-to-action block with button for custom landing sections.
 */

import { markdownToHtml } from '@/lib/markdown/server';
import type { CtaContent } from '@/lib/types/landing';

interface CtaSectionProps {
  id: string;
  title: string | null;
  subtitle: string | null;
  content: CtaContent | null;
}

export default async function CtaSection({
  id,
  title,
  subtitle,
  content,
}: CtaSectionProps) {
  if (!content?.button_text || !content?.button_url) return null;

  const htmlContent = content.body ? await markdownToHtml(content.body) : '';
  const isPrimary = content.style === 'primary';

  return (
    <section id={id} className="py-24 md:py-32 bg-surface/30 border-t border-border-light">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div className="glass-card rounded-theme-lg p-10 md:p-16 text-center shadow-soft">
          {title && (
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-xl text-secondary mb-6 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
          {htmlContent && (
            <div
              className="prose prose-lg max-w-2xl mx-auto text-secondary mb-10"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}
          <a
            href={content.button_url}
            className={`inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full transition-all hover:scale-105 active:scale-95 ${
              isPrimary
                ? 'text-white bg-primary hover:bg-primary-hover shadow-glow'
                : 'text-foreground bg-surface hover:bg-surface-hover border border-border'
            }`}
          >
            {content.button_text}
          </a>
        </div>
      </div>
    </section>
  );
}

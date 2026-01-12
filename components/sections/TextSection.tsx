/**
 * Text Section - Server Component
 *
 * Pure text content block with Markdown support for custom landing sections.
 */

import { markdownToHtml } from '@/lib/markdown/server';
import type { TextContent } from '@/lib/types/landing';

interface TextSectionProps {
  id: string;
  title: string | null;
  subtitle: string | null;
  content: TextContent | null;
}

export default async function TextSection({
  id,
  title,
  subtitle,
  content,
}: TextSectionProps) {
  if (!content?.body) return null;

  const htmlContent = await markdownToHtml(content.body);

  return (
    <section id={id} className="py-24 md:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {title && (
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight text-center">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-lg text-secondary mb-8 text-center">
              {subtitle}
            </p>
          )}
          <div
            className="prose prose-lg max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    </section>
  );
}

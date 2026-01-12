/**
 * Text Image Section - Server Component
 *
 * Split layout with text and image for custom landing sections.
 */

import Image from 'next/image';
import { markdownToHtml } from '@/lib/markdown/server';
import { toWebp } from '@/lib/utils/cloudinary-url';
import type { TextImageContent } from '@/lib/types/landing';

interface TextImageSectionProps {
  id: string;
  title: string | null;
  subtitle: string | null;
  content: TextImageContent | null;
}

export default async function TextImageSection({
  id,
  title,
  subtitle,
  content,
}: TextImageSectionProps) {
  if (!content) return null;

  const htmlContent = content.body ? await markdownToHtml(content.body) : '';
  const imagePosition = content.image_position || 'right';
  const imageUrl = content.image_url ? toWebp(content.image_url) : null;

  return (
    <section id={id} className="py-24 md:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center ${
          imagePosition === 'left' ? 'md:flex-row-reverse' : ''
        }`}>
          {/* Text Content */}
          <div className={`space-y-6 ${imagePosition === 'left' ? 'md:order-2' : 'md:order-1'}`}>
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-secondary">
                {subtitle}
              </p>
            )}
            {htmlContent && (
              <div
                className="prose prose-lg max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            )}
          </div>

          {/* Image */}
          {imageUrl && (
            <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden shadow-soft ${
              imagePosition === 'left' ? 'md:order-1' : 'md:order-2'
            }`}>
              <Image
                src={imageUrl}
                alt={content.image_alt || ''}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

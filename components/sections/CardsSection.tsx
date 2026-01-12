/**
 * Cards Section - Server Component
 *
 * Grid of cards for services, features, etc. in custom landing sections.
 */

import Image from 'next/image';
import Link from 'next/link';
import { toWebp } from '@/lib/utils/cloudinary-url';
import type { CardsContent } from '@/lib/types/landing';

interface CardsSectionProps {
  id: string;
  title: string | null;
  subtitle: string | null;
  content: CardsContent | null;
}

export default function CardsSection({
  id,
  title,
  subtitle,
  content,
}: CardsSectionProps) {
  if (!content?.items || content.items.length === 0) return null;

  const columns = content.columns || 3;
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }[columns] || 'md:grid-cols-3';

  const cardClassName = "group bg-surface-raised rounded-theme-lg p-8 border border-border/50 hover:border-primary/20 shadow-sm hover:shadow-soft transition-all duration-300 hover:-translate-y-1";

  return (
    <section id={id} className="py-24 md:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {(title || subtitle) && (
          <div className="max-w-3xl mx-auto text-center mb-16">
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-secondary">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Cards Grid */}
        <div className={`grid ${gridCols} gap-8`}>
          {content.items.map((item, index) => {
            const imageUrl = item.image_url ? toWebp(item.image_url) : null;

            const cardContent = (
              <>
                {imageUrl && (
                  <div className="relative aspect-[16/9] mb-6 rounded-lg overflow-hidden">
                    <Image
                      src={imageUrl}
                      alt={item.image_alt || item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}
                <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-secondary leading-relaxed">
                    {item.description}
                  </p>
                )}
                {item.link_url && (
                  <div className="mt-4 text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    Learn more
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                )}
              </>
            );

            if (item.link_url) {
              return (
                <Link key={index} href={item.link_url} className={cardClassName}>
                  {cardContent}
                </Link>
              );
            }

            return (
              <div key={index} className={cardClassName}>
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


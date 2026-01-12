import Image from 'next/image';

interface BlogCardProps {
  /** Pre-computed title (locale-specific) */
  title: string;
  /** Pre-computed excerpt (locale-specific) */
  excerpt: string | null;
  /** Pre-computed category name (locale-specific) */
  categoryName: string | null;
  /** Cover image URL */
  imageUrl: string | null;
  /** Pre-computed image alt text */
  imageAlt: string;
  /** Pre-formatted date string */
  formattedDate: string | null;
  /** Full URL to the post */
  postUrl: string;
  /** Current locale for styling adjustments */
  locale: string;
  /** Localized "Read More" label */
  readMoreLabel: string;
}

/**
 * BlogCard - Server Component for displaying blog post preview
 * 
 * Converted from client to server component for P1 performance optimization.
 * All locale-specific values are pre-computed by the parent server component.
 */
export default function BlogCard({
  title,
  excerpt,
  categoryName,
  imageUrl,
  imageAlt,
  formattedDate,
  postUrl,
  locale,
  readMoreLabel,
}: BlogCardProps) {
  return (
    <article className="group h-full bg-surface-raised rounded-theme-lg overflow-hidden border border-border/50 hover:border-primary/20 shadow-sm hover:shadow-soft transition-all duration-300 hover:-translate-y-1 flex flex-col">
      {/* Cover Image */}
      {imageUrl && (
        <a href={postUrl} className="block overflow-hidden relative h-48">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-foreground/5 group-hover:bg-transparent transition-colors"></div>
        </a>
      )}
      
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          {/* Category Badge - Minimalist */}
          {categoryName && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface text-secondary border border-border/50">
              {categoryName}
            </span>
          )}
          
          {/* Date */}
          {formattedDate && (
            <time className="text-xs font-medium text-secondary uppercase tracking-wider">
              {formattedDate}
            </time>
          )}
        </div>
        
        {/* Title */}
        <h2 className={`text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2 ${
          locale === 'zh' ? 'tracking-normal' : 'tracking-tight'
        }`}>
          <a href={postUrl}>
            {title}
          </a>
        </h2>
        
        {/* Excerpt */}
        {excerpt && (
          <p className={`text-secondary text-sm leading-relaxed line-clamp-3 mb-6 flex-1 ${
            locale === 'zh' ? 'tracking-wide' : ''
          }`}>
            {excerpt}
          </p>
        )}
        
        {/* Read More Link (Visual only since whole card title is link) */}
        <div className="mt-auto pt-4 border-t border-border/30 flex items-center text-primary font-semibold text-sm">
           <span>{readMoreLabel}</span>
           <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
           </svg>
        </div>
      </div>
    </article>
  );
}


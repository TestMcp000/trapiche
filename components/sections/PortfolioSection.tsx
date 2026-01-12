import type { PortfolioItem } from '@/lib/types/content';

interface PortfolioSectionProps {
  portfolioItems: PortfolioItem[];
  locale: string;
  labels: {
    title: string;
    intro: string;
    visit: string;
    inDevelopment: string;
  };
}

export default function PortfolioSection({ portfolioItems, locale, labels }: PortfolioSectionProps) {
  return (
    <section id="portfolio" className="py-24 md:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
           <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
              {labels.title}
           </h2>
           <p className="text-lg text-secondary">
              {labels.intro}
           </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {portfolioItems.map((item: PortfolioItem) => {
            return (
              <div
                key={item.id}
                className={`group relative bg-surface-raised rounded-theme-lg overflow-hidden border border-border/50 hover:border-border hover:shadow-lg transition-all duration-300 ${
                  item.is_featured ? 'md:col-span-2' : ''
                }`}
              >
                <div className="p-8 md:p-10">
                   <div className="flex items-start justify-between mb-6">
                      <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {locale === 'zh' ? item.title_zh : item.title_en}
                      </h3>
                      {item.status !== 'live' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface text-secondary border border-border">
                             {labels.inDevelopment}
                          </span>
                      )}
                   </div>
                   
                   <p className="text-secondary text-lg mb-8 line-clamp-3">
                      {locale === 'zh' ? item.description_zh : item.description_en}
                   </p>

                  {item.url && (
                     <div className="pt-4 mt-auto">
                       <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-primary font-semibold hover:gap-2 transition-all gap-1"
                       >
                          {labels.visit}
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                       </a>
                     </div>
                  )}
                </div>
                
                {/* Decorative gradient blob for hover effect */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none"></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

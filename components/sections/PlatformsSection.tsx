interface PlatformsContent {
  title: string;
  paragraph1: string;
  paragraph2: string;
  cardTitle: string;
  items: string[];
}

interface PlatformsSectionProps {
  platforms: PlatformsContent;
  locale: string;
}

export default function PlatformsSection({ platforms, locale }: PlatformsSectionProps) {
  return (
    <section id="platforms" className="py-24 md:py-32 bg-surface/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 glass-card p-10 rounded-theme-lg shadow-soft">
            <h3 className="text-2xl font-bold text-foreground mb-8">
              {platforms.cardTitle}
            </h3>
            <ul className="space-y-4">
              {platforms.items?.map((item, i) => (
                <li key={i} className="flex items-center p-3 rounded-lg hover:bg-surface-raised/50 transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary mr-4">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                         <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                  </div>
                  <span className="text-foreground font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 md:order-2">
            <h2 className={`text-3xl md:text-4xl font-bold text-foreground mb-6 ${
              locale === 'zh' ? 'tracking-normal' : 'tracking-tight'
            }`}>
              {platforms.title}
            </h2>
            <div className={`space-y-6 text-lg text-secondary ${
              locale === 'zh' ? 'leading-loose tracking-wide' : 'leading-relaxed'
            }`}>
               <p>{platforms.paragraph1}</p>
               <p>{platforms.paragraph2}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}



interface HeroContent {
  eyebrow: string;
  title: string;
  lead: string;
  cta: string;
  secondaryCta: string;
  cardTitle: string;
  cardItems: string[];
}

interface HeroSectionProps {
  hero: HeroContent;
  locale: string;
  emailAddress: string;
  githubUrl: string;
}

export default function HeroSection({ hero, locale, emailAddress, githubUrl }: HeroSectionProps) {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
      {/* Minimalist Hero - Focus on typography and whitespace */}
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
        <p className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-surface text-primary">
          {hero.eyebrow}
        </p>
        <h1 className={`text-5xl md:text-7xl font-bold text-foreground text-balance ${
          locale === 'zh' ? 'tracking-normal font-sans' : 'tracking-tight'
        }`}>
          {hero.title}
        </h1>
        <p className={`text-xl md:text-2xl text-secondary max-w-2xl mx-auto leading-relaxed text-balance ${
          locale === 'zh' ? 'tracking-wide' : ''
        }`}>
          {hero.lead}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <a
            href={`mailto:${emailAddress}`}
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full text-white bg-primary hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-glow"
          >
            {hero.cta}
          </a>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full text-foreground bg-surface hover:bg-surface-hover transition-all"
          >
            {hero.secondaryCta}
          </a>
        </div>
      </div>

      {/* Hero Card/Visual - Clean glass look */}
      <div className="mt-20 glass-card rounded-theme-lg p-8 md:p-12 max-w-5xl mx-auto shadow-soft">
        <h2 className="text-2xl font-bold text-foreground mb-8 text-left">
          {hero.cardTitle}
        </h2>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {hero.cardItems?.map((item, i) => (
            <li key={i} className="flex items-start group">
              <div className="mr-3 mt-1 text-primary group-hover:scale-110 transition-transform">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-foreground/80 font-medium">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

interface AboutContent {
  title: string;
  paragraph1: string;
  paragraph2: string;
  snapshot: string;
  founder: string;
  email: string;
  domain: string;
  focus: string;
  focusValue: string;
}

interface AboutSectionProps {
  about: AboutContent;
  locale: string;
  founderName: string;
  founderGithub: string;
  emailAddress: string;
  domainUrl: string;
}

export default function AboutSection({ 
  about, 
  locale, 
  founderName, 
  founderGithub, 
  emailAddress, 
  domainUrl 
}: AboutSectionProps) {
  return (
    <section id="about" className="py-24 md:py-32 bg-surface/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-start">
          <div className="space-y-6">
            <h2 className={`text-3xl md:text-4xl font-bold text-foreground ${
              locale === 'zh' ? 'tracking-normal' : 'tracking-tight'
            }`}>
              {about.title}
            </h2>
            <div className={`space-y-6 text-lg text-secondary leading-loose ${
              locale === 'zh' ? 'tracking-wide' : 'leading-relaxed'
            }`}>
              <p>{about.paragraph1}</p>
              <p>{about.paragraph2}</p>
            </div>
          </div>
          <div className="bg-surface-raised rounded-theme-lg p-8 shadow-soft border border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary rounded-full"></span>
              {about.snapshot}
            </h3>
            <dl className="grid gap-6">
              <div>
                <dt className="text-xs uppercase tracking-wider text-secondary font-medium mb-1">
                   Founder
                </dt>
                <dd className="text-foreground font-medium">
                  <a
                    href={founderGithub}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    {founderName}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-secondary font-medium mb-1">
                  Contact
                </dt>
                <dd className="text-foreground font-medium">
                  <a
                    href={`mailto:${emailAddress}`}
                    className="hover:text-primary transition-colors"
                  >
                    {emailAddress}
                  </a>
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <dt className="text-xs uppercase tracking-wider text-secondary font-medium mb-1">
                     Domain
                   </dt>
                   <dd className="text-foreground font-medium truncate">
                      {domainUrl}
                   </dd>
                </div>
                <div>
                   <dt className="text-xs uppercase tracking-wider text-secondary font-medium mb-1">
                     Focus
                   </dt>
                   <dd className="text-foreground font-medium">
                      {about.focusValue}
                   </dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

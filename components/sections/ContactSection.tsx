interface ContactContent {
  title: string;
  paragraph: string;
  email: string;
  github: string;
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
}

interface ContactSectionProps {
  contact: ContactContent;
  emailAddress: string;
  githubUrl: string;
}

export default function ContactSection({ contact, emailAddress, githubUrl }: ContactSectionProps) {
  return (
    <section id="contact" className="py-24 md:py-32 bg-surface/30 border-t border-border-light">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
         <div className="glass-card rounded-theme-lg p-10 md:p-16 text-center shadow-soft">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
               {contact.ctaTitle}
            </h2>
            <p className="text-xl text-secondary mb-10 max-w-2xl mx-auto">
               {contact.ctaText}
            </p>
            <a
              href={`mailto:${emailAddress}`}
              className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full text-white bg-primary hover:bg-primary-hover transition-all shadow-glow hover:scale-105 active:scale-95"
            >
              {contact.ctaButton}
            </a>
            
            <div className="mt-12 pt-8 border-t border-border/50 flex justify-center gap-8">
               <a href={`mailto:${emailAddress}`} className="text-secondary hover:text-primary transition-colors block text-sm">
                  {emailAddress}
               </a>
               <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-primary transition-colors block text-sm">
                  GitHub
               </a>
            </div>
         </div>
      </div>
    </section>
  );
}

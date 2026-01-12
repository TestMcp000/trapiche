import type { Service } from '@/lib/types/content';

interface ServicesSectionProps {
  services: Service[];
  locale: string;
  title: string;
}

export default function ServicesSection({ services, locale, title }: ServicesSectionProps) {
  return (
    <section id="services" className="py-24 md:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
           <h2 className={`text-3xl md:text-4xl font-bold text-foreground mb-4 ${
             locale === 'zh' ? 'tracking-normal' : 'tracking-tight'
           }`}>
             {title}
           </h2>
           <div className="w-20 h-1 bg-gradient-to-r from-primary/50 to-primary mx-auto rounded-full"></div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service: Service) => (
            <div
              key={service.id}
              className="group bg-surface-raised rounded-theme-lg p-8 border border-border/50 hover:border-primary/20 shadow-sm hover:shadow-soft transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                 {/* Placeholder Icon - could be dynamic based on service type */}
                 <div className="w-6 h-6 bg-primary/20 rounded-full group-hover:bg-primary transition-colors"></div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">
                {locale === 'zh' ? service.title_zh : service.title_en}
              </h3>
              <p className="text-secondary leading-relaxed">
                {locale === 'zh' ? service.description_zh : service.description_en}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

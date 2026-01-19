import { motion } from "motion/react";

interface ArticleCardProps {
  title: string;
  shape: "circle" | "square" | "triangle" | "blob";
  accentColor: string;
  onClick: () => void;
}

export function ArticleCard({ title, shape, accentColor, onClick }: ArticleCardProps) {
  const renderShape = () => {
    const shapeClasses = "absolute";
    
    switch (shape) {
      case "circle":
        return (
          <div
            className={`${shapeClasses} w-24 h-24 rounded-full top-8 right-8`}
            style={{ backgroundColor: accentColor }}
          />
        );
      case "square":
        return (
          <div
            className={`${shapeClasses} w-20 h-20 rotate-12 top-6 right-10`}
            style={{
              backgroundColor: accentColor,
              borderRadius: "20% 15% 18% 22%",
            }}
          />
        );
      case "triangle":
        return (
          <div
            className={`${shapeClasses} top-8 right-8`}
            style={{
              width: 0,
              height: 0,
              borderLeft: "50px solid transparent",
              borderRight: "50px solid transparent",
              borderBottom: `86px solid ${accentColor}`,
            }}
          />
        );
      case "blob":
        return (
          <div
            className={`${shapeClasses} w-28 h-28 top-6 right-6`}
            style={{
              backgroundColor: accentColor,
              borderRadius: "45% 55% 52% 48% / 48% 45% 55% 52%",
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <motion.button
      onClick={onClick}
      className="relative w-full h-64 bg-[#EEEBE3] rounded-3xl overflow-hidden group"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="absolute inset-0 shadow-[0_4px_16px_rgba(0,0,0,0.06)] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-shadow duration-200" />
      
      {/* Decorative shape */}
      <motion.div
        className="absolute inset-0"
        whileHover={{ x: 4, y: -4 }}
        transition={{ duration: 0.2 }}
      >
        {renderShape()}
      </motion.div>

      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h3 className="text-lg text-text-primary text-left leading-snug">
          {title}
        </h3>
      </div>
    </motion.button>
  );
}

interface SuggestSectionProps {
  articles: Array<{
    id: string;
    title: string;
    shape: "circle" | "square" | "triangle" | "blob";
    accentColor: string;
  }>;
  onArticleClick: (id: string) => void;
}

export function SuggestSection({ articles, onArticleClick }: SuggestSectionProps) {
  return (
    <section className="w-full py-16 md:py-24 px-4 md:px-8 bg-warm-gray">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xs uppercase tracking-[0.3em] text-text-secondary mb-12">
          Suggest
        </h2>

        {/* Desktop: Grid */}
        <div className="hidden md:grid md:grid-cols-4 gap-6">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              title={article.title}
              shape={article.shape}
              accentColor={article.accentColor}
              onClick={() => onArticleClick(article.id)}
            />
          ))}
        </div>

        {/* Mobile: Horizontal scroll */}
        <div className="md:hidden overflow-x-auto -mx-4 px-4">
          <div className="flex gap-4 pb-4" style={{ width: "max-content" }}>
            {articles.map((article) => (
              <div key={article.id} style={{ width: "280px" }}>
                <ArticleCard
                  title={article.title}
                  shape={article.shape}
                  accentColor={article.accentColor}
                  onClick={() => onArticleClick(article.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

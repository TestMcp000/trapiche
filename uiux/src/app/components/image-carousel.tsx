import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CarouselSlide {
  id: string;
  content: string;
  bgColor: string;
}

interface ImageCarouselProps {
  slides: CarouselSlide[];
  maxSlides?: number;
}

export function ImageCarousel({ slides, maxSlides = 10 }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const displaySlides = slides.slice(0, maxSlides);

  const handlePrevious = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? displaySlides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev === displaySlides.length - 1 ? 0 : prev + 1));
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="w-full bg-[#EEEBE3] rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
      <div className="relative" style={{ aspectRatio: "16/9" }}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute inset-0 flex items-center justify-center text-text-primary"
            style={{ backgroundColor: displaySlides[currentIndex].bgColor }}
          >
            <p className="text-2xl md:text-4xl">{displaySlides[currentIndex].content}</p>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-warm-gray/80 backdrop-blur-sm rounded-full hover:bg-warm-orange hover:text-white transition-all duration-200 shadow-lg"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-warm-gray/80 backdrop-blur-sm rounded-full hover:bg-warm-orange hover:text-white transition-all duration-200 shadow-lg"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Dots Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {displaySlides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`transition-all duration-200 rounded-full ${
                index === currentIndex
                  ? "w-8 h-2 bg-warm-orange"
                  : "w-2 h-2 bg-warm-gray/60 hover:bg-warm-gray"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Counter */}
        <div className="absolute top-4 right-4 px-3 py-1 bg-warm-gray/80 backdrop-blur-sm rounded-full text-sm text-text-secondary">
          {currentIndex + 1} / {displaySlides.length}
        </div>
      </div>
    </div>
  );
}
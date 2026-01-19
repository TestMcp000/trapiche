import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HeaderBarProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

export function HeaderBar({ onMenuToggle, isMenuOpen }: HeaderBarProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-warm-gray/95 backdrop-blur-sm border-b border-[#E5E1D9]">
      <div className="flex items-center justify-between h-16 px-4 md:px-8 max-w-[1440px] mx-auto">
        <button
          onClick={onMenuToggle}
          className="p-2 -ml-2 rounded-2xl hover:bg-warm-orange/10 transition-colors duration-200"
          aria-label="Toggle menu"
        >
          <AnimatePresence mode="wait">
            {isMenuOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-6 h-6 text-text-primary" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="w-6 h-6 text-text-primary" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        <div className="absolute left-1/2 -translate-x-1/2">
          <h1 className="text-lg tracking-wide text-text-primary">
            心理師の療癒空間
          </h1>
        </div>

        <div className="w-10" /> {/* Spacer for centering */}
      </div>
    </header>
  );
}

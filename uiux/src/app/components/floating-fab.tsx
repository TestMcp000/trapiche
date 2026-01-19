import { motion } from "motion/react";
import { Calendar, ExternalLink } from "lucide-react";
import { useState } from "react";

interface FloatingFABProps {
  isMobile?: boolean;
}

export function FloatingFAB({ isMobile = false }: FloatingFABProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isMobile) {
    return (
      <motion.div
        className="fixed bottom-6 left-6 z-30"
        initial={false}
        animate={isExpanded ? "expanded" : "collapsed"}
      >
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative bg-warm-orange hover:bg-[#E89D58] text-white rounded-full shadow-lg transition-colors duration-200"
          variants={{
            collapsed: { width: 56, height: 56 },
            expanded: { width: "auto", height: 56 },
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <motion.div
            className="flex items-center justify-center"
            variants={{
              collapsed: { padding: "0" },
              expanded: { padding: "0 24px" },
            }}
          >
            <Calendar className="w-6 h-6 shrink-0" />
            <motion.span
              className="ml-2 text-sm whitespace-nowrap overflow-hidden"
              variants={{
                collapsed: { width: 0, opacity: 0 },
                expanded: { width: "auto", opacity: 1 },
              }}
              transition={{ duration: 0.2 }}
            >
              講座邀請
            </motion.span>
          </motion.div>
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.a
      href="https://forms.google.com"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed left-8 bottom-1/4 z-30 group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative">
        <div className="bg-warm-orange hover:bg-[#E89D58] text-white px-6 py-4 rounded-full shadow-[0_8px_24px_rgba(243,174,105,0.3)] transition-all duration-200 flex items-center gap-3">
          <Calendar className="w-5 h-5" />
          <span className="text-sm">講座邀請</span>
          <ExternalLink className="w-4 h-4 opacity-60" />
        </div>
      </div>
    </motion.a>
  );
}

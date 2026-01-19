import { motion } from "motion/react";
import { useState } from "react";

interface MarqueeNoticeProps {
  text: string;
}

export function MarqueeNotice({ text }: MarqueeNoticeProps) {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="w-full overflow-hidden bg-[#EEEBE3] border-b border-[#E5E1D9]">
      <div className="flex items-center h-10 px-4 md:px-8">
        <div className="shrink-0 mr-6">
          <span className="text-xs tracking-wider uppercase text-text-secondary">
            Notice
          </span>
        </div>
        <div
          className="flex-1 overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <motion.div
            className="whitespace-nowrap text-sm text-text-primary"
            animate={{
              x: isPaused ? undefined : [0, -1000],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {text} • {text} • {text}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
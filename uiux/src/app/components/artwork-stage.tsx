import { motion } from "motion/react";
import { ReactNode } from "react";

interface MaterialPinProps {
  id: string;
  x: number; // percentage
  y: number; // percentage
  isActive: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function MaterialPin({
  x,
  y,
  isActive,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: MaterialPinProps) {
  return (
    <motion.button
      className="absolute cursor-pointer"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <motion.div
        className="relative w-8 h-8 md:w-10 md:h-10"
        animate={{
          backgroundColor: isActive ? "#F3AE69" : "#CC5544",
        }}
        transition={{ duration: 0.2 }}
        style={{
          borderRadius: "47% 53% 45% 55% / 52% 48% 52% 48%",
          boxShadow: isActive
            ? "0 4px 12px rgba(243, 174, 105, 0.3)"
            : "0 2px 8px rgba(204, 85, 68, 0.3)",
        }}
      >
        {/* Inner dot for depth */}
        <div
          className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white/40 rounded-full"
          style={{ transform: "translate(-50%, -50%)" }}
        />
      </motion.div>
    </motion.button>
  );
}

interface ArtworkStageProps {
  children: ReactNode;
}

export function ArtworkStage({ children }: ArtworkStageProps) {
  return (
    <div className="w-full py-12 md:py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Exhibition Wall */}
        <div className="relative bg-[#EEEBE3] rounded-[3rem] p-8 md:p-16 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          {/* Artwork Container with organic mask */}
          <div className="relative mx-auto" style={{ maxWidth: "900px" }}>
            <div
              className="relative overflow-hidden bg-gradient-to-br from-[#F5F2EA] to-[#E8E4DA] shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
              style={{
                aspectRatio: "4/3",
                borderRadius: "48% 52% 51% 49% / 45% 53% 47% 55%",
              }}
            >
              {/* Paper texture overlay */}
              <div
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' /%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noise)' opacity='0.5' /%3E%3C/svg%3E")`,
                  backgroundSize: "150px 150px",
                }}
              />
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
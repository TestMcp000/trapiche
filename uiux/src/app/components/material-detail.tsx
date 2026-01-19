import { motion, AnimatePresence } from "motion/react";
import { X, ExternalLink } from "lucide-react";

interface Material {
  id: string;
  name: string;
  preview: string;
  description: string;
  symbolism: string;
}

interface MaterialTooltipProps {
  material: Material;
  isVisible: boolean;
}

export function MaterialTooltip({ material, isVisible }: MaterialTooltipProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.2 }}
          className="absolute z-50 px-4 py-2 bg-warm-gray/90 backdrop-blur-md rounded-2xl shadow-lg pointer-events-none"
          style={{
            maxWidth: "200px",
          }}
        >
          <p className="text-sm text-text-primary">
            <span className="font-medium">{material.name}</span>
            <span className="text-text-secondary"> ｜ {material.preview}</span>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface MaterialDetailCardProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MaterialDetailCard({
  material,
  isOpen,
  onClose,
}: MaterialDetailCardProps) {
  if (!material) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-text-primary/20 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md"
          >
            <div className="bg-warm-gray/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-warm-orange/20">
              <div className="p-6 md:p-8">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl text-text-primary pr-8">
                    {material.name}
                  </h3>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-warm-orange/10 transition-colors duration-200"
                  >
                    <X className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm uppercase tracking-wider text-text-tertiary mb-2">
                      使用方式 / 觸感
                    </h4>
                    <p className="text-text-primary leading-relaxed">
                      {material.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm uppercase tracking-wider text-text-tertiary mb-2">
                      象徵意涵
                    </h4>
                    <p className="text-text-primary leading-relaxed">
                      {material.symbolism}
                    </p>
                  </div>
                </div>

                <button className="mt-6 flex items-center gap-2 text-sm text-warm-orange hover:text-[#E89D58] transition-colors duration-200">
                  <span>延伸閱讀</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
import { motion } from "motion/react";

interface HashtagPillProps {
  tag: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function HashtagPill({ tag, isActive = false, onClick }: HashtagPillProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
        isActive
          ? "bg-warm-orange text-white shadow-[0_2px_8px_rgba(243,174,105,0.3)]"
          : "bg-[#EEEBE3] text-text-secondary hover:bg-warm-orange/20 hover:text-text-primary"
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      #{tag}
    </motion.button>
  );
}

interface HashtagsProps {
  tags: string[];
  activeTags?: string[];
  onTagClick?: (tag: string) => void;
}

export function Hashtags({ tags, activeTags = [], onTagClick }: HashtagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <HashtagPill
          key={tag}
          tag={tag}
          isActive={activeTags.includes(tag)}
          onClick={() => onTagClick?.(tag)}
        />
      ))}
    </div>
  );
}

import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface SubItem {
  name: string;
  href: string;
}

interface Category {
  name: string;
  items: SubItem[];
}

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const categories: Category[] = [
  {
    name: "身心健康衛教",
    items: [
      { name: "情緒照顧", href: "#" },
      { name: "焦慮壓力", href: "#" },
      { name: "睡眠議題", href: "#" },
      { name: "關係界線", href: "#" },
      { name: "自我覺察", href: "#" },
    ],
  },
  {
    name: "書籍推薦",
    items: [
      { name: "情緒療癒", href: "#" },
      { name: "關係修復", href: "#" },
      { name: "自我成長", href: "#" },
      { name: "療癒書寫", href: "#" },
      { name: "親子教養", href: "#" },
    ],
  },
  {
    name: "講座／活動",
    items: [
      { name: "近期講座", href: "#" },
      { name: "合作邀請", href: "#" },
      { name: "療癒工作坊", href: "#" },
      { name: "企業內訓", href: "#" },
    ],
  },
  {
    name: "關於／聯絡",
    items: [
      { name: "心理師介紹", href: "#" },
      { name: "服務方式", href: "#" },
      { name: "常見問題", href: "#" },
      { name: "聯絡表單", href: "#" },
    ],
  },
];

export function SideNav({ isOpen, onClose }: SideNavProps) {
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);

  const toggleCategory = (index: number) => {
    setExpandedCategory(expandedCategory === index ? null : index);
  };

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-text-primary/20 backdrop-blur-sm"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Side Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed left-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] bg-warm-gray shadow-2xl overflow-y-auto"
          >
            <div className="p-8 pt-24">
              <nav className="space-y-2">
                {categories.map((category, index) => (
                  <div key={index} className="border-b border-[#E5E1D9] last:border-0">
                    <button
                      onClick={() => toggleCategory(index)}
                      className="w-full flex items-center justify-between py-4 text-left group hover:text-warm-orange transition-colors duration-200"
                    >
                      <span className="text-base text-text-primary group-hover:text-warm-orange transition-colors duration-200">
                        {category.name}
                      </span>
                      <motion.div
                        animate={{ rotate: expandedCategory === index ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-text-secondary group-hover:text-warm-orange transition-colors duration-200" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {expandedCategory === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pb-4 pl-4 space-y-2">
                            {category.items.map((item, itemIndex) => (
                              <a
                                key={itemIndex}
                                href={item.href}
                                className="block py-2 text-sm text-text-secondary hover:text-warm-orange transition-colors duration-200"
                              >
                                {item.name}
                              </a>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </nav>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
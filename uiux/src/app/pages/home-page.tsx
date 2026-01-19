import { useState } from "react";
import { MarqueeNotice } from "@/app/components/marquee-notice";
import { HeaderBar } from "@/app/components/header-bar";
import { SideNav } from "@/app/components/side-nav";
import { ArtworkStage, MaterialPin } from "@/app/components/artwork-stage";
import { MaterialDetailCard } from "@/app/components/material-detail";
import { FloatingFAB } from "@/app/components/floating-fab";
import { SuggestSection } from "@/app/components/suggest-section";

interface Material {
  id: string;
  name: string;
  preview: string;
  description: string;
  symbolism: string;
  x: number;
  y: number;
}

const materials: Material[] = [
  {
    id: "1",
    name: "粉彩",
    preview: "柔軟暈染，讓情緒有安全的出口",
    description: "粉彩質地柔軟，易於塗抹與混色，觸感溫柔。可以用手指輕柔推開，創造漸層與柔和的色彩過渡，適合表達細膩情緒。",
    symbolism: "象徵情緒的流動與釋放，讓內在感受透過色彩溫柔地被看見。",
    x: 20,
    y: 25,
  },
  {
    id: "2",
    name: "拼貼",
    preview: "把碎片重新排列，找回可掌握的秩序",
    description: "將不同材質、圖像剪裁後重新組合。可以選擇、移動、調整位置，在創作過程中重新建立掌控感。",
    symbolism: "代表重整破碎經驗，從混亂中創造新的意義與秩序。",
    x: 45,
    y: 35,
  },
  {
    id: "3",
    name: "壓克力",
    preview: "飽和色彩，承載強烈情緒的重量",
    description: "色彩濃烈、覆蓋性強，可以層層堆疊或快速揮灑。適合表達強烈、直接的情緒狀態。",
    symbolism: "象徵情緒的力量與強度，給予表達的勇氣。",
    x: 70,
    y: 30,
  },
  {
    id: "4",
    name: "水墨",
    preview: "留白與暈染，在不確定中找到平衡",
    description: "墨色在水中暈開，形態難以完全掌控。需要與材料對話，在流動與等待中尋找平衡。",
    symbolism: "代表接納不確定性，在失控與掌控之間找到共存的智慧。",
    x: 30,
    y: 60,
  },
  {
    id: "5",
    name: "布料與線材",
    preview: "編織連結，修補關係的裂痕",
    description: "透過縫補、編織、纏繞的動作，體驗連結與修復。觸覺溫暖，過程緩慢而具儀式感。",
    symbolism: "象徵關係的修復與重建，每一針都是對自己或他人的溫柔照顧。",
    x: 55,
    y: 65,
  },
  {
    id: "6",
    name: "自然素材",
    preview: "與大地連結，回到最初的安定",
    description: "使用樹葉、石頭、樹枝等自然材料創作。觸感真實，帶有生命的溫度與質地。",
    symbolism: "象徵回歸本質，與自然和內在重新連結，找回安定的根基。",
    x: 78,
    y: 70,
  },
  {
    id: "7",
    name: "蠟筆",
    preview: "童年的溫度，重返純真的表達",
    description: "色彩柔和，筆觸帶有手作溫度。使用過程喚起童年記憶，降低創作門檻。",
    symbolism: "象徵回到最初的自己，用純真的眼光重新看待內在世界。",
    x: 15,
    y: 75,
  },
];

const suggestedArticles = [
  {
    id: "1",
    title: "焦慮來時，身體在說什麼？",
    shape: "circle" as const,
    accentColor: "#F3AE69",
  },
  {
    id: "2",
    title: "建立界線：溫柔但清楚的練習",
    shape: "blob" as const,
    accentColor: "#E8C4A0",
  },
  {
    id: "3",
    title: "自我照顧的 3 個小方法",
    shape: "square" as const,
    accentColor: "#F3AE69",
  },
  {
    id: "4",
    title: "關係裡的安全感如何長出來？",
    shape: "triangle" as const,
    accentColor: "#DEB890",
  },
];

interface HomePageProps {
  onNavigateToArticle: (id: string) => void;
}

export function HomePage({ onNavigateToArticle }: HomePageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  const handlePinClick = (material: Material) => {
    setSelectedMaterial(material);
  };

  return (
    <div className="min-h-screen bg-warm-gray">
      <MarqueeNotice text="最新講座：2026/02/15「情緒的顏色」藝術療癒工作坊 開放報名中" />
      
      <HeaderBar
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        isMenuOpen={isMenuOpen}
      />

      <SideNav isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main>
        {/* Hero Section with Interactive Artwork */}
        <ArtworkStage>
          {/* Artwork Background - Paper Texture */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#F5F2EA] via-[#EBE7DE] to-[#E3DED2]">
            {/* Subtle texture overlay */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.3' /%3E%3C/svg%3E")`,
              }}
            />

            {/* Abstract art elements */}
            <div className="absolute top-[15%] left-[10%] w-32 h-32 rounded-full bg-warm-orange/20 blur-3xl" />
            <div className="absolute top-[40%] right-[15%] w-40 h-40 rounded-full bg-[#DEB890]/30 blur-3xl" />
            <div className="absolute bottom-[20%] left-[30%] w-48 h-48 rounded-full bg-warm-orange/15 blur-3xl" />
            
            {/* Organic shapes for art therapy feel */}
            <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M 50 100 Q 100 50, 150 100 T 250 100"
                stroke="#F3AE69"
                strokeWidth="2"
                fill="none"
                opacity="0.3"
              />
              <path
                d="M 200 50 Q 250 100, 300 50 T 400 50"
                stroke="#DEB890"
                strokeWidth="2"
                fill="none"
                opacity="0.3"
              />
              <circle cx="80" cy="80" r="30" fill="#F3AE69" opacity="0.1" />
              <circle cx="320" cy="200" r="40" fill="#E8C4A0" opacity="0.1" />
            </svg>
          </div>

          {/* Material Pins */}
          {materials.map((material) => (
            <MaterialPin
              key={material.id}
              id={material.id}
              x={material.x}
              y={material.y}
              isActive={selectedMaterial?.id === material.id}
              onClick={() => handlePinClick(material)}
              onMouseEnter={() => setHoveredPin(material.id)}
              onMouseLeave={() => setHoveredPin(null)}
            />
          ))}
        </ArtworkStage>

        {/* Material Detail Card */}
        <MaterialDetailCard
          material={selectedMaterial}
          isOpen={!!selectedMaterial}
          onClose={() => setSelectedMaterial(null)}
        />

        {/* Floating Action Button */}
        <div className="hidden md:block">
          <FloatingFAB />
        </div>
        <div className="md:hidden">
          <FloatingFAB isMobile />
        </div>

        {/* Suggested Articles Section */}
        <SuggestSection
          articles={suggestedArticles}
          onArticleClick={onNavigateToArticle}
        />
      </main>
    </div>
  );
}
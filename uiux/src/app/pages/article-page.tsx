import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MarqueeNotice } from "@/app/components/marquee-notice";
import { ImageCarousel } from "@/app/components/image-carousel";
import { Hashtags } from "@/app/components/hashtags";

interface ArticlePageProps {
  articleId: string;
  onBack: () => void;
}

const carouselSlides = [
  { id: "1", content: "封面：焦慮來時", bgColor: "#F3AE69" },
  { id: "2", content: "什麼是焦慮？", bgColor: "#E8C4A0" },
  { id: "3", content: "身體的訊號", bgColor: "#DEB890" },
  { id: "4", content: "呼吸練習", bgColor: "#F5E6D3" },
  { id: "5", content: "情緒地圖", bgColor: "#E8DDD0" },
  { id: "6", content: "自我對話", bgColor: "#F3D5B5" },
  { id: "7", content: "身體掃描", bgColor: "#E5C9A8" },
  { id: "8", content: "日常練習", bgColor: "#F0E0CA" },
  { id: "9", content: "尋求支持", bgColor: "#DCC8B0" },
  { id: "10", content: "延伸資源", bgColor: "#F2EFE7" },
];

const articleTags = [
  "情緒照顧",
  "身心健康",
  "焦慮壓力",
  "自我覺察",
  "呼吸練習",
];

export function ArticlePage({ articleId, onBack }: ArticlePageProps) {
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const handleTagClick = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="min-h-screen bg-warm-gray">
      <MarqueeNotice text="最新講座：2026/02/15「情緒的顏色」藝術療癒工作坊 開放報名中" />

      {/* Back Button */}
      <div className="sticky top-0 z-40 bg-warm-gray/95 backdrop-blur-sm border-b border-[#E5E1D9]">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-text-secondary hover:text-warm-orange transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">返回首頁</span>
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Carousel Section */}
        <div className="mb-12">
          <ImageCarousel slides={carouselSlides} maxSlides={10} />
        </div>

        {/* Article Meta */}
        <div className="mb-12 space-y-4">
          <h1 className="text-3xl md:text-5xl text-text-primary leading-tight">
            焦慮來時，身體在說什麼？
          </h1>
          <p className="text-sm text-text-tertiary">2026 年 1 月 10 日</p>
        </div>

        {/* Article Body */}
        <article className="max-w-none">
          <div className="space-y-8">
            {/* Introduction */}
            <section className="bg-[#EEEBE3] rounded-3xl p-6 md:p-8">
              <p className="text-base md:text-lg text-text-primary leading-relaxed">
                當焦慮湧現時，我們的身體往往比意識更早察覺。心跳加速、呼吸急促、肩頸緊繃⋯⋯這些都是身體試圖與我們溝通的方式。學會傾聽身體的語言，是照顧自己的第一步。
              </p>
            </section>

            {/* Section 1 */}
            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl text-text-primary">身體的警報系統</h2>
              <p className="text-base text-text-primary leading-relaxed">
                焦慮是人類演化而來的保護機制，當大腦偵測到潛在威脅時，會啟動「戰或逃」反應。交感神經系統被激活，釋放腎上腺素，讓我們做好應對危險的準備。
              </p>
              <p className="text-base text-text-primary leading-relaxed">
                然而在現代生活中，真正的生命威脅已經很少見，但我們的大腦仍會將工作壓力、人際衝突、未來的不確定性等，視為需要立即反應的「危險」。於是，身體持續處於高度警戒狀態，產生各種不適症狀。
              </p>
            </section>

            {/* Quote Section */}
            <section className="border-l-4 border-warm-orange bg-warm-orange/5 rounded-r-2xl p-6 md:p-8">
              <blockquote className="text-base md:text-lg text-text-primary italic leading-relaxed">
                「身體記得所有我們試圖遺忘的事情。當我們開始傾聽，療癒才真正開始。」
              </blockquote>
            </section>

            {/* Section 2 */}
            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl text-text-primary">常見的身體訊號</h2>
              <ul className="space-y-3 text-base text-text-primary">
                <li className="flex items-start gap-3">
                  <span className="text-warm-orange mt-1.5">•</span>
                  <span className="leading-relaxed">
                    <strong>呼吸系統：</strong>呼吸變淺、胸悶、感覺吸不到氣
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-warm-orange mt-1.5">•</span>
                  <span className="leading-relaxed">
                    <strong>心血管系統：</strong>心跳加速、心悸、血壓上升
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-warm-orange mt-1.5">•</span>
                  <span className="leading-relaxed">
                    <strong>肌肉系統：</strong>肩頸僵硬、下巴咬緊、全身緊繃
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-warm-orange mt-1.5">•</span>
                  <span className="leading-relaxed">
                    <strong>消化系統：</strong>胃痛、腹瀉、食慾改變
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-warm-orange mt-1.5">•</span>
                  <span className="leading-relaxed">
                    <strong>神經系統：</strong>手抖、盜汗、睡眠障礙
                  </span>
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-4">
              <h2 className="text-2xl md:text-3xl text-text-primary">開始練習：身體掃描</h2>
              <p className="text-base text-text-primary leading-relaxed">
                找一個安靜的空間，舒適地坐著或躺下。閉上眼睛，將注意力帶到呼吸上。然後，慢慢地從頭頂開始，一路向下掃描你的身體：
              </p>
              <div className="bg-[#EEEBE3] rounded-2xl p-6 space-y-3 text-base text-text-primary">
                <p>• 頭部和臉部有沒有緊繃的感覺？</p>
                <p>• 肩膀是不是往上聳起？</p>
                <p>• 胸口的感覺是開放的還是緊縮的？</p>
                <p>• 腹部是放鬆的還是緊繃的？</p>
                <p>• 雙手和雙腳的溫度如何？</p>
              </div>
              <p className="text-base text-text-primary leading-relaxed">
                不需要改變或批判任何感受，只是純粹地觀察與覺察。這個簡單的練習，可以幫助我們重新與身體建立連結。
              </p>
            </section>

            {/* Closing */}
            <section className="bg-warm-orange/10 rounded-3xl p-6 md:p-8">
              <p className="text-base md:text-lg text-text-primary leading-relaxed">
                記住，身體的訊號不是敵人，而是提醒我們慢下來、照顧自己的朋友。當我們學會傾聽與回應，焦慮就能轉化為自我覺察的契機。
              </p>
            </section>
          </div>
        </article>

        {/* Hashtags */}
        <div className="mt-16 pt-8 border-t border-[#E5E1D9]">
          <Hashtags
            tags={articleTags}
            activeTags={activeTags}
            onTagClick={handleTagClick}
          />
        </div>
      </main>

      {/* Bottom Marquee */}
      <div className="mt-20">
        <MarqueeNotice text="關注我們的 Instagram 獲取更多療癒內容 @healing.space" />
      </div>
    </div>
  );
}
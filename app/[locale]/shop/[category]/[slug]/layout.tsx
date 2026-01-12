/**
 * Shop product layout - loads KaTeX/Prism CSS only for markdown pages
 * P0 Performance: Scope CSS to pages that need it
 */
import 'katex/dist/katex.min.css';
import '@/app/markdown-prism.css';

export default function ShopProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import { useState } from "react";
import { HomePage } from "@/app/pages/home-page";
import { ArticlePage } from "@/app/pages/article-page";

type Page = "home" | "article";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");

  const handleNavigateToArticle = (articleId: string) => {
    setSelectedArticleId(articleId);
    setCurrentPage("article");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToHome = () => {
    setCurrentPage("home");
    setSelectedArticleId("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      {currentPage === "home" && (
        <HomePage onNavigateToArticle={handleNavigateToArticle} />
      )}
      {currentPage === "article" && (
        <ArticlePage articleId={selectedArticleId} onBack={handleBackToHome} />
      )}
    </div>
  );
}

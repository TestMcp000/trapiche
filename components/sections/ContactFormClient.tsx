"use client";

/**
 * Contact Form Client Component
 *
 * Interactive contact form with honeypot spam protection.
 *
 * @see lib/modules/contact/io.ts - Form submission
 * @see doc/meta/STEP_PLAN.md (PR-38)
 */

import { useState, useTransition } from "react";
import { submitContactFormAction } from "@/app/[locale]/contact/actions";

interface ContactFormClientProps {
  emailAddress: string;
  githubUrl: string;
  content: {
    ctaTitle: string;
    ctaText: string;
    ctaButton: string;
  };
}

export default function ContactFormClient({
  emailAddress,
  githubUrl,
  content,
}: ContactFormClientProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    honeypot: "", // Honeypot field - should remain empty
  });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const result = await submitContactFormAction({
          name: formData.name,
          email: formData.email,
          subject: formData.subject || undefined,
          message: formData.message,
          honeypot: formData.honeypot || undefined,
        });

        if (result.success) {
          setStatus("success");
          setFormData({
            name: "",
            email: "",
            subject: "",
            message: "",
            honeypot: "",
          });
        } else {
          setStatus("error");
          setErrorMessage(result.error || "發送失敗，請稍後再試");
        }
      } catch {
        setStatus("error");
        setErrorMessage("發送失敗，請稍後再試");
      }
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear status when user starts typing again
    if (status !== "idle") {
      setStatus("idle");
      setErrorMessage("");
    }
  };

  return (
    <section
      id="contact"
      className="py-24 md:py-32 bg-surface/30 border-t border-border-light">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="glass-card rounded-theme-lg p-8 md:p-12 shadow-soft">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
            {content.ctaTitle}
          </h2>
          <p className="text-lg text-secondary mb-8 text-center max-w-xl mx-auto">
            {content.ctaText}
          </p>

          {/* Success Message */}
          {status === "success" && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
              <p className="text-green-700 dark:text-green-400">
                ✓ 訊息已送出！我們會盡快回覆您。
              </p>
            </div>
          )}

          {/* Error Message */}
          {status === "error" && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
              <p className="text-red-700 dark:text-red-400">{errorMessage}</p>
            </div>
          )}

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot field - hidden from users, visible to bots */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="honeypot">請勿填寫此欄位</label>
              <input
                type="text"
                id="honeypot"
                name="honeypot"
                value={formData.honeypot}
                onChange={handleChange}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-foreground mb-1.5">
                姓名 *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                minLength={2}
                className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-foreground placeholder-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                placeholder="您的姓名"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-1.5">
                電子郵件 *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-foreground placeholder-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                placeholder="your@email.com"
              />
            </div>

            {/* Subject (optional) */}
            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-foreground mb-1.5">
                主旨
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-foreground placeholder-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                placeholder="訊息主旨（選填）"
              />
            </div>

            {/* Message */}
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-foreground mb-1.5">
                訊息內容 *
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                minLength={10}
                rows={5}
                className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-foreground placeholder-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
                placeholder="請輸入您想說的話..."
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full text-white bg-primary hover:bg-primary-hover transition-all shadow-glow hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                {isPending ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    發送中...
                  </>
                ) : (
                  content.ctaButton
                )}
              </button>
            </div>
          </form>

          {/* Alternative Contact */}
          <div className="mt-10 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 text-sm">
            <span className="text-secondary">或直接聯繫：</span>
            <a
              href={`mailto:${emailAddress}`}
              className="text-secondary hover:text-primary transition-colors">
              {emailAddress}
            </a>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-primary transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

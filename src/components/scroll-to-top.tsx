"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 700) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="sticky bottom-6 left-0 right-0 w-full flex justify-center pointer-events-none z-30 mt-6">
      <button
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className={`group pointer-events-auto inline-flex h-11 px-5 items-center justify-center gap-2 rounded-full border border-border/60 bg-card text-card-foreground font-bold text-xs shadow-[0_16px_36px_-12px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:shadow-none outline-none backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground active:scale-95 ${
          isVisible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        }`}
      >
        <ArrowUp className="h-3.5 w-3.5 stroke-[2.5] transition-transform duration-300 group-hover:-translate-y-0.5" />
        <span>Back to Top</span>
      </button>
    </div>
  );
}
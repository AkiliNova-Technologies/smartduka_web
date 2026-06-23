"use client";

import { useState, useEffect } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { mockDatabase } from "@/data/mockDatabase";

export function HeroSection() {
  const slides = mockDatabase.productCampaigns; 
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-advance loop timer tracking optimized directly for the React Compiler runtime
  useEffect(() => {
    if (isHovered || !slides || slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [isHovered, slides]);

  if (!slides || slides.length === 0) return null;

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length);
  };

  return (
    <section 
      className="relative h-[420px] sm:h-[480px] md:h-[500px] w-full rounded-[32px] overflow-hidden group bg-muted/30 border border-border/40 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] dark:border-zinc-800/80 dark:shadow-none transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {slides.map((slide, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <div className="relative w-full h-full">
              <Image
                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[6000ms] ease-out ${
                  isActive ? "scale-105" : "scale-100"
                }`}
                fill
                priority={index === 0}
                alt={`Marketplace slide ${slide.tag}`}
                src={slide.image}
                sizes="(max-w-1200px) 100vw, 80vw"
              />
            </div>
            
            {/* Ambient overlay vignette shadow framework */}
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/40 sm:via-zinc-950/20 to-transparent dark:from-black/90 dark:via-black/50" />

            {/* Content canvas layout box */}
            <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 md:px-16 max-w-xl md:max-w-2xl text-white select-none">
              <span 
                className={`inline-block px-3.5 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 self-start transform transition-all duration-700 ease-out delay-100 ${
                  isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                {slide.tag}
              </span>
              
              <h2 
                className={`text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 leading-[1.15] transform transition-all duration-700 ease-out delay-200 ${
                  isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                {slide.title}
              </h2>
              
              <p 
                className={`text-xs sm:text-sm md:text-base text-zinc-200/90 font-semibold max-w-xs sm:max-w-md mb-6 sm:mb-8 leading-relaxed transform transition-all duration-700 ease-out delay-300 ${
                  isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                {slide.description}
              </p>
              
              <button 
                className={`text-white font-bold text-xs uppercase tracking-wider px-6 sm:px-8 h-11 sm:h-12 rounded-full flex items-center gap-2.5 self-start transition-all ease-out active:scale-95 transform duration-700 delay-500 shadow-xs hover:shadow-md cursor-pointer group/btn bg-primary hover:bg-emerald-500 ${
                  isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                <span>{slide.ctaText || "Explore Drop"}</span>
                <div className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center transition-transform group-hover/btn:translate-x-0.5">
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            </div>
          </div>
        );
      })}

      {/* Slide Navigation Handles - Optimized breakpoints so they do not crowd mobile fits */}
      {slides.length > 1 && (
        <>
          <button 
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 md:group-hover:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
            aria-label="Previous Campaign"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 md:group-hover:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
            aria-label="Next Campaign"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </>
      )}

      {/* Pagination Dot Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, index) => {
            const isSelected = index === currentIndex;
            return (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                  isSelected ? "w-5 bg-white" : "w-1 bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
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
      className="relative h-[400px] md:h-[500px] rounded-[32px] overflow-hidden group bg-muted/30 border border-border/40 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none transition-colors duration-300"
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
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/70 via-zinc-950/30 to-transparent dark:from-black/80 dark:via-black/40" />

            {/* Content canvas layout layout box */}
            <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 max-w-2xl text-white">
              <span 
                className={`inline-block px-3.5 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 self-start transform transition-all duration-700 ease-out delay-100 ${
                  isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                {slide.tag}
              </span>
              
              <h2 
                className={`text-3xl md:text-5xl font-black tracking-tight mb-4 leading-[1.15] transform transition-all duration-700 ease-out delay-200 ${
                  isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                {slide.title}
              </h2>
              
              <p 
                className={`text-sm md:text-base text-zinc-200/90 font-medium max-w-md mb-8 leading-relaxed transform transition-all duration-700 ease-out delay-300 ${
                  isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                {slide.description}
              </p>
              
              <button 
                className={`text-white font-bold text-xs uppercase tracking-wider px-8 h-12 rounded-full flex items-center gap-2.5 self-start transition-all ease-out active:scale-95 transform duration-700 delay-500 hover:shadow-lg shadow-black/10 group/btn ${
                  isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                } ${slide.ctaColor || "bg-emerald-700 hover:bg-emerald-600"}`}
              >
                <span>{slide.ctaText}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Slide Navigation Handles */}
      {slides.length > 1 && (
        <>
          <button 
            onClick={prevSlide}
            className="absolute left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95 shadow-md"
            aria-label="Previous Campaign"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95 shadow-md"
            aria-label="Next Campaign"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.2]" />
          </button>
        </>
      )}

      {/* Pagination Dot Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-20">
          {slides.map((_, index) => {
            const isSelected = index === currentIndex;
            return (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isSelected ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
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
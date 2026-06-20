"use client";

import { useState } from "react";
import { Search, Package, Store, CreditCard, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { mockDatabase } from "@/data/mockDatabase";

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "All Topics", icon: HelpCircle, desc: "General platform guide" },
    { id: "orders", label: "Orders & Escrow", icon: Package, desc: "Delivery & buyer protection" },
    { id: "vendors", label: "Duka Inquiries", icon: Store, desc: "Merchant communication" },
    { id: "payments", label: "Mobile Money", icon: CreditCard, desc: "MTN & Airtel wallet sync" },
  ];

  const filteredFaqs = mockDatabase.faqs.filter(faq => {
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-12 text-foreground antialiased selection:bg-emerald-500/10 selection:text-emerald-700">
      
      {/* 1. HEADER HERO SECTION */}
      <div className="text-center space-y-5 max-w-xl mx-auto">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            SmartDuka Support Hub
          </h1>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 leading-relaxed">
            Find answers regarding your delivery tracking, local escrow parameters, or mobile money transaction statuses instantly.
          </p>
        </div>

        {/* Premium Search Input Box */}
        <div className="relative flex flex-row items-center max-w-md mx-auto pl-4 bg-muted/60 border border-border/40 rounded-full transition-all duration-300 focus-within:bg-card focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary">
          <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 select-none" />
          <Input 
            type="text"
            placeholder="Search topics, delivery terms, or policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-2.5 pr-4 h-11 text-xs font-semibold text-zinc-800 dark:text-zinc-100 bg-transparent dark:bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* 2. DYNAMIC VISUAL CARD FILTER BLOCKS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          const isSelected = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`p-4 rounded-[20px] text-left border transition-all duration-200 flex flex-col justify-between gap-4 relative overflow-hidden group active:scale-[0.98] cursor-pointer ${
                isSelected 
                  ? "bg-card border-primary ring-1 ring-primary/20 shadow-xs" 
                  : "bg-muted/40 border-border/60 hover:bg-card hover:border-border"
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-colors ${
                isSelected ? "bg-primary/10 border-primary/20 text-primary" : "bg-card border-border/60 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
              }`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">{cat.label}</h4>
                <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5 leading-tight">{cat.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. RE-ENGINEERED ACCORDION VIEWPORT */}
      <div className="bg-card text-card-foreground border border-border/60 rounded-[24px] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-border/60 bg-muted/20">
          <h3 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            {categories.find(c => c.id === activeCategory)?.label} Guidelines
          </h3>
        </div>

        <div className="px-6 divide-y divide-border/60">
          {filteredFaqs.length > 0 ? (
            <Accordion type="single" collapsible defaultValue={filteredFaqs[0].id} className="w-full">
              {filteredFaqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id} className="border-border/40 py-1">
                  <AccordionTrigger className="w-full flex items-center justify-between gap-4 text-left font-bold text-sm text-zinc-800 dark:text-zinc-200 hover:text-primary dark:hover:text-primary hover:no-underline py-4 transition-colors cursor-pointer">
                    <span>{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-4xl">
                      {faq.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="py-16 text-center text-xs font-semibold text-zinc-400 dark:text-zinc-500">
              No support articles found matching your criteria. Try adjustments or clear the filters.
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
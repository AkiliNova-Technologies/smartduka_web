"use client";

import { Check } from "lucide-react";
import { PLATFORM_PERSONALITIES, type PlatformPersonality } from "@/lib/appearance";
import { getPersonalityMessage } from "@/lib/personality-messages";
import { useAppearance } from "@/providers/AppearanceProvider";

const personalityDetails: Record<PlatformPersonality, { name: string; description: string }> = {
  LOVELY: { name: "Lovely", description: "Warm, cheerful and appreciative." },
  ELEGANT: { name: "Elegant", description: "Refined, composed and sophisticated." },
  PLAYFUL: { name: "Playful", description: "Cheerful, lively and a little trendy." },
  CLASSIC: { name: "Classic", description: "Neutral, clear and friendly." },
};

export function PersonalitySettings() {
  const { personality, saving, setPersonality } = useAppearance();

  return (
    <section className="mt-6 border-t pt-6" aria-labelledby="personality-heading">
      <div>
        <h3 id="personality-heading" className="text-sm font-medium">Platform personality</h3>
        <p className="mt-1 text-xs text-muted-foreground">Choose the tone Mwezora uses for friendly, noncritical messages.</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Platform personality">
        {PLATFORM_PERSONALITIES.map((option) => {
          const selected = personality === option;
          const detail = personalityDetails[option];
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={saving}
              onClick={() => setPersonality(option)}
              className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 ${selected ? "border-primary bg-primary/5" : "hover:bg-muted/60"}`}>
              <span className="flex items-center gap-2 text-sm font-semibold">
                {detail.name}
                {selected && <Check className="ml-auto size-4 text-primary" aria-hidden="true" />}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail.description}</span>
              <span className="mt-3 block rounded-lg bg-muted/60 px-3 py-2 text-xs text-foreground">“{getPersonalityMessage("home.welcome", option)}”</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

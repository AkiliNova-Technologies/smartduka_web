"use client";

import * as React from "react";
import { Download, Share, X } from "lucide-react";

const DISMISSED_KEY = "mwezora_install_guide_dismissed";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallGuide() {
  const [ios, setIos] = React.useState(false);
  const [installPrompt, setInstallPrompt] = React.useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY) === "true") return;
    let active = true;
    const iosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (iosDevice) {
      queueMicrotask(() => {
        if (!active) return;
        setIos(true);
        setVisible(true);
      });
    }
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", capturePrompt);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    else dismiss();
  };

  if (!visible) return null;

  return (
    <aside className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl border border-border/70 bg-card p-4 text-card-foreground shadow-sm md:inset-x-auto md:right-5 md:bottom-5" aria-label="Install Mwezora">
      <button type="button" onClick={dismiss} className="absolute right-2 top-2 rounded-full p-2 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring" aria-label="Dismiss install guidance">
        <X className="size-4" />
      </button>
      <div className="flex gap-3 pr-8">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {ios ? <Share className="size-4" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
        </span>
        <div>
          <p className="text-sm font-semibold">Add Mwezora to your Home Screen</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {ios ? "Open the Share menu, then choose Add to Home Screen." : "Install Mwezora for quick access from your device."}
          </p>
          {!ios && installPrompt ? (
            <button type="button" onClick={() => void install()} className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Install</button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

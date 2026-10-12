"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

const CRITICAL_PATHS = ["/checkout", "/payment"];

export function PwaManager() {
  const pathname = usePathname();
  const registrationRef = React.useRef<ServiceWorkerRegistration | null>(null);
  const promptedWorkerRef = React.useRef<ServiceWorker | null>(null);
  const dirtyFormRef = React.useRef(false);

  const offerUpdate = React.useCallback((registration: ServiceWorkerRegistration) => {
    const worker = registration.waiting;
    if (!worker || promptedWorkerRef.current === worker || dirtyFormRef.current || CRITICAL_PATHS.some((path) => pathname.startsWith(path))) return;
    promptedWorkerRef.current = worker;
    toast.info("A new version of Mwezora is available.", {
      duration: Infinity,
      action: {
        label: "Update now",
        onClick: () => worker.postMessage({ type: "SKIP_WAITING" }),
      },
    });
  }, [pathname]);

  React.useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    let reloading = false;
    const reloadOnControl = () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    };
    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then((registration) => {
        registrationRef.current = registration;
        offerUpdate(registration);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(registration);
          });
        });
      }).catch(() => {
        // The application remains fully network-capable if registration fails.
      });
    };
    window.addEventListener("load", register, { once: true });
    navigator.serviceWorker.addEventListener("controllerchange", reloadOnControl);
    return () => {
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", reloadOnControl);
    };
  }, [offerUpdate]);

  React.useEffect(() => {
    dirtyFormRef.current = false;
    const markDirty = (event: Event) => {
      if (event.target instanceof HTMLElement && event.target.closest("form")) dirtyFormRef.current = true;
    };
    document.addEventListener("input", markDirty, true);
    document.addEventListener("change", markDirty, true);
    return () => {
      document.removeEventListener("input", markDirty, true);
      document.removeEventListener("change", markDirty, true);
    };
  }, [pathname]);

  React.useEffect(() => {
    if (registrationRef.current) offerUpdate(registrationRef.current);
  }, [offerUpdate]);

  return null;
}

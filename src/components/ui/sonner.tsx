"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon aria-hidden="true" className="size-4 text-primary" />
        ),
        info: (
          <InfoIcon aria-hidden="true" className="size-4 text-primary" />
        ),
        warning: (
          <TriangleAlertIcon aria-hidden="true" className="size-4 text-muted-foreground" />
        ),
        error: (
          <OctagonXIcon aria-hidden="true" className="size-4 text-destructive" />
        ),
        loading: (
          <Loader2Icon aria-hidden="true" className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "calc(var(--radius) * 1.4)",
        } as React.CSSProperties
      }
      toastOptions={{
        closeButtonAriaLabel: "Dismiss notification",
        classNames: {
          toast: "border-border/70 bg-card text-card-foreground rounded-2xl px-4 py-3.5 shadow-sm",
          title: "text-sm font-semibold leading-5 text-foreground",
          description: "mt-0.5 text-xs leading-5 text-muted-foreground",
          actionButton: "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
          cancelButton: "rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
          closeButton: "rounded-full border-border/60 bg-card text-muted-foreground shadow-none hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          icon: "mt-0.5 self-start [&_svg]:size-4",
        },
      }}
      closeButton
      duration={4000}
      visibleToasts={4}
      gap={10}
      offset={{ top: "calc(env(safe-area-inset-top) + 16px)", right: "max(env(safe-area-inset-right), 16px)", bottom: "calc(env(safe-area-inset-bottom) + 16px)", left: "max(env(safe-area-inset-left), 16px)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 12px)", right: "max(env(safe-area-inset-right), 12px)", bottom: "calc(env(safe-area-inset-bottom) + 12px)", left: "max(env(safe-area-inset-left), 12px)" }}
      position="bottom-right"
      {...props}
    />
  )
}

export { Toaster }

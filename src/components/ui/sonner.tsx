"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { 
  CircleCheckIcon, 
  InfoIcon, 
  TriangleAlertIcon, 
  OctagonXIcon, 
  Loader2Icon 
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border/60 group-[.toaster]:shadow-lg group-[.toaster]:rounded-2xl group-[.toaster]:p-4",
          title: "group-[.toaster]:text-sm group-[.toaster]:font-medium group-[.toaster]:text-foreground",
          description: "group-[.toaster]:text-xs group-[.toaster]:text-muted-foreground group-[.toaster]:mt-1",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-full group-[.toast]:px-3 group-[.toast]:py-1 group-[.toast]:text-xs group-[.toast]:font-medium",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-full group-[.toast]:px-3 group-[.toast]:py-1 group-[.toast]:text-xs group-[.toast]:font-medium",
          closeButton: "group-[.toaster]:bg-muted/50 group-[.toaster]:hover:bg-muted group-[.toaster]:rounded-lg group-[.toaster]:p-1",
          icon: "group-[.toaster]:[&_svg]:size-4",
        },
      }}
      closeButton
      richColors
      duration={4000}
      visibleToasts={4}
      position="bottom-right"
      {...props}
    />
  )
}

export { Toaster }
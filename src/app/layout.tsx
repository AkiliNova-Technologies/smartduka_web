import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/providers/AuthProvider";
import { PublicCatalogProvider } from "@/providers/PublicCatalogProvider";
import { UserDataProvider } from "@/providers/UserDataProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartDuka - Multi-Vendor Marketplace",
  description:
    "Discover stores, buy products, and manage vendor spaces seamlessly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased selection:bg-primary/10",
        geistSans.variable,
        geistMono.variable,
        inter.variable,
        "font-sans",
      )}>
      <body className="min-h-full bg-background text-foreground flex flex-col">
        <AuthProvider>
          <UserDataProvider>
            <PublicCatalogProvider>
              <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
              <Toaster position="top-right" closeButton={false} />
            </PublicCatalogProvider>
          </UserDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

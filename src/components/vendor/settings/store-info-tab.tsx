"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail, Phone, Globe, MapPin, Building2, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { updateStoreProfile } from "@/actions/vendor-settings";
import type { VendorProfile, Document } from "@prisma/client";

type FullVendorProfile = VendorProfile & {
  documents: Document[];
  _count: { products: number; subOrders: number };
};

interface StoreInfoTabProps {
  profile: FullVendorProfile;
}

export function StoreInfoTab({ profile }: StoreInfoTabProps) {
  const [isPending, startTransition] = useTransition();

  const [storeName, setStoreName] = useState(profile.storeName);
  const [description, setDescription] = useState(profile.description || "");
  const [email, setEmail] = useState(profile.email || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [website, setWebsite] = useState(profile.website || "");
  const [address, setAddress] = useState(profile.address || "");
  const [city, setCity] = useState(profile.city || "");
  const [country, setCountry] = useState(profile.country || "Uganda");

  const hasChanges =
    storeName !== profile.storeName ||
    description !== (profile.description || "") ||
    email !== (profile.email || "") ||
    phone !== (profile.phone || "") ||
    website !== (profile.website || "") ||
    address !== (profile.address || "") ||
    city !== (profile.city || "") ||
    country !== (profile.country || "Uganda");

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateStoreProfile({
        storeName,
        description,
        email,
        phone,
        website,
        address,
        city,
        country,
      });

      if (result.success) {
        toast.success("Store profile updated successfully");
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    });
  };

  return (
    <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden animate-in fade-in-50 duration-200">
      <div className="p-6 border-b border-border/60 bg-muted/30">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
          Store Information
        </h3>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Update your store details — this information is displayed on your public storefront.
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Store Name */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">
            Store Name
          </label>
          <Input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full text-xs font-semibold rounded-full h-10 px-4"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">
            Store Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="text-[10px] resize-none rounded-2xl"
            placeholder="Tell customers about your store, what you sell, and what makes you unique..."
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {description.length}/500
          </p>
        </div>

        <Separator />

        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight flex items-center gap-1.5">
              <Mail className="w-3 h-3" />
              Business Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs font-semibold rounded-full h-10 px-4"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight flex items-center gap-1.5">
              <Phone className="w-3 h-3" />
              Business Phone
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs font-semibold rounded-full h-10 px-4"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight flex items-center gap-1.5">
            <Globe className="w-3 h-3" />
            Website
          </label>
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full text-xs font-semibold rounded-full h-10 px-4"
            placeholder="https://yourstore.com"
          />
        </div>

        <Separator />

        {/* Address */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            Street Address
          </label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full text-xs font-semibold rounded-full h-10 px-4"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight flex items-center gap-1.5">
              <Building2 className="w-3 h-3" />
              City
            </label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full text-xs font-semibold rounded-full h-10 px-4"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">
              Country
            </label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full text-xs font-semibold rounded-full h-10 px-4"
            />
          </div>
        </div>

        <Separator />

        {/* Stats + Save */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3 h-3" />
            {profile._count.products} products · {profile._count.subOrders} orders
          </div>
          <button
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            className="px-5 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-primary dark:hover:bg-primary dark:hover:text-white text-xs font-bold rounded-full active:scale-95 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            ) : (
              "Save Profile Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
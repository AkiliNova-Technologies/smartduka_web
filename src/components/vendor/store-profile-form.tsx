"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { 
  Store, Camera, Upload, Globe, Phone, Mail, MapPin, 
  Building2, FileText, Loader2, CheckCircle2,
  ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { uploadImageToSupabase } from "@/lib/supabase/upload-image";
import { 
  updateStoreProfile, 
  updateStoreLogo, 
  updateStoreBanner 
} from "@/actions/vendor-settings";
import type { VendorProfile, Document } from "@prisma/client";

type FullVendorProfile = VendorProfile & {
  documents: Document[];
  _count: { products: number; subOrders: number };
};

interface StoreProfileFormProps {
  profile: FullVendorProfile;
}

export function StoreProfileForm({ profile }: StoreProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  // Form state
  const [storeName, setStoreName] = useState(profile.storeName);
  const [description, setDescription] = useState(profile.description || "");
  const [email, setEmail] = useState(profile.email || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [website, setWebsite] = useState(profile.website || "");
  const [address, setAddress] = useState(profile.address || "");
  const [city, setCity] = useState(profile.city || "");
  const [country, setCountry] = useState(profile.country || "Uganda");

  // Preview state
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl || "");
  const [bannerUrl, setBannerUrl] = useState(profile.bannerUrl || "");

  const handleSaveProfile = () => {
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    try {
      const result = await uploadImageToSupabase({
        file,
        bucket: "vendor-assets",
        folder: `vendors/${profile.id}/logo`,
        maxSizeInMB: 2,
      });

      if (result.success && result.url) {
        const updateResult = await updateStoreLogo(result.url);
        if (updateResult.success) {
          setLogoUrl(result.url);
          toast.success("Store logo updated");
        } else {
          toast.error("Failed to save logo");
        }
      } else {
        toast.error(result.error || "Upload failed");
      }
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBannerUploading(true);
    try {
      const result = await uploadImageToSupabase({
        file,
        bucket: "vendor-assets",
        folder: `vendors/${profile.id}/banner`,
        maxSizeInMB: 5,
      });

      if (result.success && result.url) {
        const updateResult = await updateStoreBanner(result.url);
        if (updateResult.success) {
          setBannerUrl(result.url);
          toast.success("Store banner updated");
        } else {
          toast.error("Failed to save banner");
        }
      } else {
        toast.error(result.error || "Upload failed");
      }
    } catch {
      toast.error("Failed to upload banner");
    } finally {
      setBannerUploading(false);
    }
  };

  const hasChanges = 
    storeName !== profile.storeName ||
    description !== (profile.description || "") ||
    email !== (profile.email || "") ||
    phone !== (profile.phone || "") ||
    website !== (profile.website || "") ||
    address !== (profile.address || "") ||
    city !== (profile.city || "") ||
    country !== (profile.country || "Uganda");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Store Branding
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customize how your shop appears to customers on the marketplace
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Store className="w-3 h-3" />
          {profile.slug}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Visual Branding */}
        <div className="space-y-6">
          {/* Banner Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Store Banner</CardTitle>
              <CardDescription className="text-[11px]">
                Appears at the top of your store page (1200×400 recommended)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="aspect-[3/1] rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-border/40 relative group">
                {bannerUrl ? (
                  <Image
                    src={bannerUrl}
                    alt="Store banner"
                    fill
                    className="object-cover"
                    sizes="400px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                    <ImageIcon className="w-8 h-8 opacity-40" />
                  </div>
                )}
                <label className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center cursor-pointer">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-zinc-900/90 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <Upload className="w-3 h-3" />
                    Change Banner
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    disabled={bannerUploading}
                    className="hidden"
                  />
                </label>
              </div>
              {bannerUploading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Uploading...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logo Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Store Logo</CardTitle>
              <CardDescription className="text-[11px]">
                Square image, appears on product cards & store listings (500×500 recommended)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="w-32 h-32 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-border/40 relative group mx-auto">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="Store logo"
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                    <Store className="w-10 h-10 opacity-40" />
                  </div>
                )}
                <label className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center cursor-pointer">
                  <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={logoUploading}
                    className="hidden"
                  />
                </label>
              </div>
              {logoUploading && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Uploading...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Preview Link */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary">Live Storefront</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Changes appear instantly on your public store page
              </p>
              <a
                href={`/brands/${profile.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                View your store
                <Globe className="w-3 h-3" />
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Store Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Store Information</CardTitle>
              <CardDescription className="text-[11px]">
                This information is displayed on your public store profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Store Name */}
              <div className="space-y-2">
                <Label htmlFor="storeName" className="text-xs font-bold">
                  Store Name
                </Label>
                <Input
                  id="storeName"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-bold">
                  Store Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                  placeholder="Tell customers about your store, what you sell, and what makes you unique..."
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {description.length}/500
                </p>
              </div>

              <Separator />

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold flex items-center gap-1.5">
                    <Mail className="w-3 h-3" />
                    Business Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-bold flex items-center gap-1.5">
                    <Phone className="w-3 h-3" />
                    Business Phone
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-xs font-bold flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />
                  Website
                </Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="h-10 text-sm"
                  placeholder="https://yourstore.com"
                />
              </div>

              <Separator />

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-xs font-bold flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  Street Address
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-xs font-bold flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" />
                    City
                  </Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-xs font-bold">
                    Country
                  </Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <Separator />

              {/* Save Button */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="w-3 h-3" />
                  {profile._count.products} products · {profile._count.subOrders} orders
                </div>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isPending || !hasChanges}
                  size="sm"
                  className="rounded-full px-6"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
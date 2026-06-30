"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  UploadCloud,
  ChevronRight,
  Check,
  Info,
} from "lucide-react";
import { mockDatabase } from "@/data/mockDatabase";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Mock structure for dynamic category arrays (simulating database responses)
const mockCategoriesData = [
  {
    id: "cat-1",
    name: "Footwear & Sportswear",
    sizingType: "shoes" as const,
    subCategories: [
      { id: "sub-1-1", name: "Casual Shoes" },
      { id: "sub-1-2", name: "Gym Shoes" },
      { id: "sub-1-3", name: "Open Shoes / Sandals" },
    ],
  },
  {
    id: "cat-2",
    name: "Apparel & Clothing",
    sizingType: "clothes" as const,
    subCategories: [
      { id: "sub-2-1", name: "T-Shirts & Tops" },
      { id: "sub-2-2", name: "Tracksuits & Pants" },
      { id: "sub-2-3", name: "Shorts" },
    ],
  },
  {
    id: "cat-3",
    name: "Fashion Accessories",
    sizingType: "accessories" as const,
    subCategories: [
      { id: "sub-3-1", name: "Caps & Hats" },
      { id: "sub-3-2", name: "Sports Bags" },
      { id: "sub-3-3", name: "Socks & Wristbands" },
    ],
  },
];

const sizePresets = {
  shoes: ["38", "39", "40", "41", "42", "43", "44"],
  clothes: ["XS", "S", "M", "L", "XL", "XXL"],
  accessories: ["One Size / Regular", "Adjustable Strap", "Slim Fit"],
};

export default function VendorProductFormPage() {
  const router = useRouter();
  const params = useParams();
  const isEditMode = params.id && params.id !== "new";

  const [currentStep, setCurrentStep] = React.useState(1);

  // Dynamic Category Selection States
  const existingProduct = isEditMode && typeof params.id === 'string' 
  ? mockDatabase.products.find((p) => p.id === params.id) 
  : null;

// Then initialize state with the existing product data directly:
const [selectedCategoryId, setSelectedCategoryId] = React.useState(
  existingProduct ? "cat-1" : ""
);
const [selectedSubCategoryId, setSelectedSubCategoryId] = React.useState(
  existingProduct ? "sub-1-2" : ""
);

const [formData, setFormData] = React.useState({
  title: existingProduct?.title || "",
  brand: existingProduct?.brand || "",
  price: existingProduct?.price?.toString() || "",
  originalPrice: existingProduct?.originalPrice?.toString() || "",
  inventoryCount: existingProduct?.inventoryCount?.toString() || "0",
  description: existingProduct ? "Premium fashion line item with advanced configuration metrics." : "",
  materialSpec: existingProduct ? "Mixed High-Grade Compounds" : "",
  originSpec: existingProduct ? "Imported Hub Matrix" : "",
  selectedSizes: existingProduct ? ["40", "41"] : [] as string[],
  images: existingProduct 
    ? [existingProduct.image, "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=500&q=85", "", ""] 
    : ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80", "", "", ""],
});

  // Automatically resolve active subcategories list based on selected parent category
  const activeCategory = mockCategoriesData.find(
    (c) => c.id === selectedCategoryId,
  );
  const availableSubCategories = activeCategory
    ? activeCategory.subCategories
    : [];
  const sizingSystem = activeCategory ? activeCategory.sizingType : "clothes";


  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubCategoryId("");
    setFormData((prev) => ({ ...prev, selectedSizes: [] }));
  };

  const toggleSize = (size: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedSizes: prev.selectedSizes.includes(size)
        ? prev.selectedSizes.filter((s) => s !== size)
        : [...prev.selectedSizes, size],
    }));
  };

  const handleNextStep = () => {
    if (
      currentStep === 1 &&
      (!formData.title ||
        !formData.price ||
        !selectedCategoryId ||
        !selectedSubCategoryId)
    ) {
      toast.error(
        "Please fill in title, price, category and sub-category parameters.",
      );
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(
      isEditMode
        ? "Catalog parameters updated successfully."
        : "New product published successfully.",
    );
    router.push("/vendor/products");
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 select-none">
        <div className="flex items-center gap-3">
          <Link
            href="/vendor/products"
            className="p-2 border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-medium tracking-tight text-foreground">
            {isEditMode ? "Modify Stock Record" : "Launch New Listing"}
          </h1>
        </div>
      </div>

      {/* 2. PREMIUM DRIBBBLE-STYLE STEPPER NAVIGATION */}
      <div className="bg-muted/10 border border-border/40 rounded-full p-4 flex items-center justify-center select-none shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-4 max-w-2xl w-full justify-between">
          {[
            { step: 1, label: "Core Details" },
            { step: 2, label: "Sizing Options" },
            { step: 3, label: "Specifications" },
          ].map((item, index, arr) => {
            const isCompleted = currentStep > item.step;
            const isActive = currentStep === item.step;

            return (
              <React.Fragment key={item.step}>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={item.step > currentStep && !formData.title}
                    onClick={() => setCurrentStep(item.step)}
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all border cursor-pointer",
                      isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : isActive
                          ? "bg-primary border-primary text-primary-foreground shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]"
                          : "bg-background border-border/80 text-muted-foreground/70",
                    )}>
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      item.step
                    )}
                  </button>
                  <span
                    className={cn(
                      "text-xs font-medium tracking-tight transition-colors",
                      isActive
                        ? "text-primary font-medium"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground/60",
                    )}>
                    {item.label}
                  </span>
                </div>

                {/* Alternating Connecting Tracks (Solid vs Dotted) based on current step placement parameters */}
                {index < arr.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-px mx-2 transition-all duration-300",
                      currentStep > item.step
                        ? "bg-primary border-t border-primary"
                        : "border-t border-dashed border-border/80",
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 3. CORE TWO-COLUMN CONTENT GRID */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COMPONENT CANVAS BOX */}
        <div className="lg:col-span-7 bg-card border border-border/60 rounded-2xl p-6 space-y-6 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
          {/* STEP 1: CORE DETAILS & DYNAMIC CATEGORIES */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-2">
                <Label
                  htmlFor="title"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Product Title *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g. Nike Air Pegasus Run"
                  className="h-10 border-border/60 rounded-xl bg-background font-medium"
                />
              </div>

              {/* Dynamic Dependent Category Selection Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Main Category *
                  </Label>
                  <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="w-full h-10 rounded-xl text-xs font-semibold border-border/60 bg-background">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/60 p-1">
                      <SelectGroup>
                        {mockCategoriesData.map((cat) => (
                          <SelectItem
                            key={cat.id}
                            value={cat.id}
                            className="rounded-lg text-xs font-medium py-2">
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Sub-Category *
                  </Label>
                  <Select
                    value={selectedSubCategoryId}
                    onValueChange={handleCategoryChange}
                    disabled={!selectedCategoryId}>
                    <SelectTrigger className="w-full h-10 rounded-xl text-xs font-semibold border-border/60 bg-background disabled:opacity-50">
                      <SelectValue
                        placeholder={
                          selectedCategoryId
                            ? "Select Sub-Category"
                            : "Choose Main Category First"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/60 p-1">
                      <SelectGroup>
                        {availableSubCategories.map((sub) => (
                          <SelectItem
                            key={sub.id}
                            value={sub.id}
                            className="rounded-lg text-xs font-medium py-2">
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="brand"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Brand Manufacturer
                  </Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    placeholder="e.g. Nike"
                    className="h-10 border-border/60 rounded-xl bg-background font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="inventoryCount"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Opening Stock Count *
                  </Label>
                  <Input
                    id="inventoryCount"
                    type="number"
                    value={formData.inventoryCount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        inventoryCount: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="h-10 border-border/60 rounded-xl bg-background font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="price"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Selling Price (UGX) *
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    placeholder="e.g. 180000"
                    className="h-10 border-border/60 rounded-xl bg-background font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="originalPrice"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Strikethrough Price (UGX)
                  </Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    value={formData.originalPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        originalPrice: e.target.value,
                      })
                    }
                    placeholder="e.g. 240000"
                    className="h-10 border-border/60 rounded-xl bg-background text-muted-foreground font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="h-10 px-5 bg-primary text-primary-foreground text-xs font-medium rounded-full hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
                  <span>Next: Select Size Options</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SIZING MATRIX */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-[11px] font-medium uppercase tracking-wider">
                    Dynamic Active Grid:
                  </span>
                  <span className="text-xs font-extrabold text-foreground bg-muted border border-border/60 px-2.5 py-0.5 rounded-md capitalize">
                    {sizingSystem} Sizes
                  </span>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-2">
                  {sizePresets[sizingSystem].map((size) => {
                    const isSelected = formData.selectedSizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={cn(
                          "h-11 px-4 text-xs font-medium rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 min-w-[54px] justify-center",
                          isSelected
                            ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950"
                            : "border-border/60 bg-background text-foreground hover:bg-muted",
                        )}>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        )}
                        <span>{size}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 flex justify-between select-none">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="h-10 px-4 border border-border/60 hover:bg-muted text-xs font-medium rounded-xl transition-all">
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="h-10 px-5 bg-primary text-primary-foreground text-xs font-medium rounded-xl hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
                  <span>Next: Add Specifications</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SPECIFICATIONS */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Product Description
                </Label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe details regarding fit, texture, and care parameters..."
                  className="w-full border border-border/60 rounded-xl p-3 text-xs font-medium text-foreground placeholder-muted-foreground/70 bg-background focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="material"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Primary Material
                  </Label>
                  <Input
                    id="material"
                    value={formData.materialSpec}
                    onChange={(e) =>
                      setFormData({ ...formData, materialSpec: e.target.value })
                    }
                    placeholder="e.g. Stretchable Cotton Denim"
                    className="h-10 border-border/60 rounded-xl bg-background text-xs font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="origin"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Product Origin
                  </Label>
                  <Input
                    id="origin"
                    value={formData.originSpec}
                    onChange={(e) =>
                      setFormData({ ...formData, originSpec: e.target.value })
                    }
                    placeholder="e.g. Imported Matrix"
                    className="h-10 border-border/60 rounded-xl bg-background text-xs font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 flex justify-between select-none">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="h-10 px-4 border border-border/60 hover:bg-muted text-xs font-medium rounded-xl transition-all">
                  Back
                </button>
                <button
                  type="submit"
                  className="h-10 px-6 bg-primary hover:bg-emerald-600 text-primary-foreground text-xs font-medium rounded-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
                  <Save className="w-4 h-4" />
                  <span>Publish Complete Catalog Listing</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: 4-SLOT MEDIA VAULT */}
        <div className="lg:col-span-5 space-y-4 select-none">
          <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
              Media Asset Vault (Up to 4 Slots)
            </Label>

            {/* Main Primary Card Display */}
            <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-muted border border-border/40 group">
              {formData.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={formData.images[0]}
                  alt="Primary product thumbnail"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-1.5">
                  <UploadCloud className="w-7 h-7 opacity-40" />
                  <span className="text-[10px] font-medium">
                    Primary placeholder empty
                  </span>
                </div>
              )}
            </div>

            {/* 3 Auxiliary Slots */}
            <div className="grid grid-cols-3 gap-3">
              {formData.images.slice(1, 4).map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="aspect-square bg-muted/40 border border-border/60 rounded-xl overflow-hidden relative flex flex-col items-center justify-center text-muted-foreground group hover:border-zinc-400 transition-colors cursor-pointer">
                  {imgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 opacity-50 group-hover:text-primary" />
                      <span className="text-[8px] font-medium mt-1 opacity-60">
                        Slot {idx + 2}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-muted/40 rounded-xl p-3 border border-border/40 flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed">
                Dynamic categories link directly into sub-tables. The sizing
                matrix updates instantly based on your category selection.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

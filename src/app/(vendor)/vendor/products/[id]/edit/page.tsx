"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Check,
  Info,
  Plus,
  X,
  ImageIcon,
  Package,
  Ruler,
  Palette,
  Settings,
  FolderTree,
  Layers,
  Star,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/image-upload";
import { ImageUploadMini } from "@/components/image-upload-mini";
import { useCategories } from "@/hooks/use-categories";
import { useProducts } from "@/hooks/use-products";
import { useVendor } from "@/hooks/use-vendor";
import type { CategoryTree, Product, ProductSpec } from "@/types/marketplace";
import Image from "next/image";

interface SubCategoryItem {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
}

interface ProductFormData {
  title: string;
  slug: string;
  brand: string;
  price: string;
  compareAtPrice: string;
  image: string;
  images: string[];
  categoryId: string;
  subCategoryId: string;
  tags: string[];
  tagInput: string;
  inventoryCount: string;
  sku: string;
  description: string;
  sizes: string[];
  colors: string[];
  colorInput: string;
  manufacturer: string;
  material: string;
  cushioning: string;
  origin: string;
  weight: string;
  outsole: string;
}

function EditFormSkeleton() {
  return (
    <div className="space-y-8 w-full max-w-8xl mx-auto">
      <div className="flex items-center gap-3 border-b border-border/40 pb-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-3 w-36 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-5">
          <Skeleton className="h-10 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full rounded-full" />
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full rounded-full" />
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
        <div className="lg:col-span-5">
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

const emptyFormData = (): ProductFormData => ({
  title: "",
  slug: "",
  brand: "",
  price: "",
  compareAtPrice: "",
  image: "",
  images: ["", "", "", ""],
  categoryId: "",
  subCategoryId: "",
  tags: [],
  tagInput: "",
  inventoryCount: "0",
  sku: "",
  description: "",
  sizes: [],
  colors: [],
  colorInput: "",
  manufacturer: "",
  material: "",
  cushioning: "",
  origin: "",
  weight: "",
  outsole: "",
});

const extractImageUrl = (img: unknown): string => {
  if (!img) return "";
  if (typeof img === "string") return img;
  if (typeof img === "object" && img !== null && "url" in img) {
    return (img as { url: string }).url || "";
  }
  return "";
};

const extractSpecValue = (
  specs: ProductSpec[] | undefined,
  name: string,
): string => {
  if (!specs || !Array.isArray(specs)) return "";
  return specs.find((s) => s.name === name)?.value || "";
};

const extractStringArray = (value: unknown): string[] => {
  if (Array.isArray(value))
    return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string")
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
};

const buildFormDataFromProduct = (product: Product | null): ProductFormData => {
  if (!product) return emptyFormData();

  const primaryImage =
    product.image ||
    (product.images && product.images.length > 0
      ? extractImageUrl(product.images[0])
      : "");

  const galleryImages = product.images?.length
    ? [
        ...product.images.map(extractImageUrl),
        ...Array(Math.max(0, 4 - (product.images?.length || 0))).fill(""),
      ].slice(0, 4)
    : ["", "", "", ""];

  const specs = (product.specs as ProductSpec[] | undefined) || [];

  return {
    title: product.name || "",
    slug: product.slug || "",
    brand: product.brand || "",
    price: String(product.basePrice || ""),
    compareAtPrice: product.compareAtPrice
      ? String(product.compareAtPrice)
      : "",
    image: primaryImage,
    images: galleryImages,
    categoryId: product.categoryId || "",
    subCategoryId: product.subCategoryId || "",
    tags: extractStringArray(product.tags),
    tagInput: "",
    inventoryCount: String(product.inventoryCount ?? 0),
    sku: product.sku || "",
    description: product.description || "",
    sizes: extractStringArray(product.sizes),
    colors: extractStringArray(product.colors),
    colorInput: "",
    manufacturer: extractSpecValue(specs, "Manufacturer"),
    material: extractSpecValue(specs, "Primary Material"),
    cushioning: extractSpecValue(specs, "Cushioning Tech"),
    origin: extractSpecValue(specs, "Origin"),
    weight: extractSpecValue(specs, "Weight"),
    outsole: extractSpecValue(specs, "Outsole Grip"),
  };
};

const generateSlug = (val: string) =>
  val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export default function VendorProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const productId = typeof params.id === "string" ? params.id : null;
  const isEditMode = Boolean(productId);

  const { profile } = useVendor();
  const vendorId = profile?.id;
  const { categories } = useCategories();
  const { createProduct, updateProduct, fetchProductById } = useProducts();

  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [existingProduct, setExistingProduct] = React.useState<Product | null>(
    null,
  );
  const [formData, setFormData] = React.useState<ProductFormData | null>(null);
  const fetchedRef = React.useRef(false);

  React.useEffect(() => {
    if (!isEditMode || !productId || fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const product = await fetchProductById!(productId);
        setExistingProduct(product);
      } catch {
        toast.error("Failed to load product data");
      }
    })();
  }, [isEditMode, productId, fetchProductById]);

  React.useEffect(() => {
    queueMicrotask(() => {
      if (!isEditMode) {
        setFormData(emptyFormData());
      } else if (
        existingProduct &&
        categories &&
        (categories as CategoryTree[]).length > 0
      ) {
        setFormData(buildFormDataFromProduct(existingProduct));
      }
    });
  }, [isEditMode, existingProduct, categories]);

  const categoryId = formData?.categoryId;

  const availableSubCategories = React.useMemo<SubCategoryItem[]>(() => {
    if (!categoryId || !categories || !Array.isArray(categories)) return [];
    const selectedCategory = (categories as CategoryTree[]).find(
      (cat) => cat.id === categoryId,
    );
    return (selectedCategory?.subCategories as SubCategoryItem[]) || [];
  }, [categoryId, categories]);

  if (!fetchProductById || !createProduct || !updateProduct) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">
          Product management requires VendorCatalogProvider.
        </p>
      </div>
    );
  }

  if (!formData) {
    return <EditFormSkeleton />;
  }

  const updateField = (field: string, value: string | string[]) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      if (field === "title" && !isEditMode) {
        updated.slug = generateSlug(value as string);
      }
      return updated;
    });
  };

  const handleCategoryChange = (categoryId: string) => {
    updateField("categoryId", categoryId);
    updateField("subCategoryId", "");
  };

  const toggleSize = (size: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sizes: prev.sizes.includes(size)
          ? prev.sizes.filter((s) => s !== size)
          : [...prev.sizes, size],
      };
    });
  };

  const addColor = () => {
    if (!formData.colorInput.trim()) return;
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        colors: [...prev.colors, prev.colorInput.trim()],
        colorInput: "",
      };
    });
  };

  const removeColor = (index: number) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, colors: prev.colors.filter((_, i) => i !== index) };
    });
  };

  const addTag = () => {
    if (!formData.tagInput.trim()) return;
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tags: [...prev.tags, prev.tagInput.trim().toLowerCase()],
        tagInput: "",
      };
    });
  };

  const removeTag = (index: number) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, tags: prev.tags.filter((_, i) => i !== index) };
    });
  };

  const handleNextStep = () => {
    if (
      currentStep === 1 &&
      (!formData.title || !formData.price || !formData.categoryId)
    ) {
      toast.error("Please fill in product title, price, and category.");
      return;
    }
    if (currentStep === 2 && !formData.image) {
      toast.error("Please upload a primary product image.");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditMode && !vendorId) {
      toast.error("Vendor profile not loaded.");
      return;
    }
    setIsSubmitting(true);
    try {
      const specs = [
        formData.manufacturer && {
          name: "Manufacturer",
          value: formData.manufacturer,
        },
        formData.material && {
          name: "Primary Material",
          value: formData.material,
        },
        formData.cushioning && {
          name: "Cushioning Tech",
          value: formData.cushioning,
        },
        formData.origin && { name: "Origin", value: formData.origin },
        formData.weight && { name: "Weight", value: formData.weight },
        formData.outsole && { name: "Outsole Grip", value: formData.outsole },
      ].filter(Boolean) as { name: string; value: string }[];

      const images = [
        { url: formData.image, isFeatured: true, sortOrder: 0 },
        ...formData.images
          .filter(
            (img): img is string =>
              typeof img === "string" && img.trim() !== "",
          )
          .map((url, index) => ({
            url,
            isFeatured: false,
            sortOrder: index + 1,
          })),
      ];

      if (isEditMode && productId) {
        const result = await updateProduct!(productId, {
          name: formData.title,
          slug: formData.slug,
          brand: formData.brand,
          description: formData.description,
          basePrice: Number(formData.price),
          compareAtPrice: formData.compareAtPrice
            ? Number(formData.compareAtPrice)
            : null,
          categoryId: formData.categoryId,
          subCategoryId: formData.subCategoryId || null,
          inventoryCount: Number(formData.inventoryCount),
          sku: formData.sku,
          sizes: formData.sizes,
          colors: formData.colors,
          specs,
          tags: formData.tags,
        });
        if (result.success) {
          toast.success("Product updated successfully!");
          router.push("/vendor/products");
        } else {
          toast.error(result.error || "Failed to update product.");
        }
      } else {
        const result = await createProduct!({
          vendorId: vendorId!,
          name: formData.title,
          slug: formData.slug || generateSlug(formData.title),
          brand: formData.brand,
          description: formData.description,
          basePrice: Number(formData.price),
          compareAtPrice: formData.compareAtPrice
            ? Number(formData.compareAtPrice)
            : undefined,
          categoryId: formData.categoryId,
          subCategoryId: formData.subCategoryId || undefined,
          inventoryCount: Number(formData.inventoryCount),
          sku: formData.sku,
          status: "PUBLISHED" as const,
          sizes: formData.sizes,
          colors: formData.colors,
          specs,
          tags: formData.tags,
          images,
        });
        if (result.success) {
          toast.success("Product published successfully!");
          router.push("/vendor/products");
        } else {
          toast.error(result.error || "Failed to publish product.");
        }
      }
    } catch {
      toast.error("Failed to save product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-border/40 pb-4 select-none">
        <div className="flex items-center gap-3">
          <Link
            href="/vendor/products"
            className="p-2 border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-medium tracking-tight text-foreground">
              {isEditMode ? "Edit Product" : "New Product Listing"}
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {isEditMode
                ? `Editing: ${formData.title}`
                : "Fill in all details to create a complete product page"}
            </p>
          </div>
        </div>
        {isEditMode && productId && (
          <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border/40">
            {productId.slice(0, 8)}
          </span>
        )}
      </div>

      <div className="bg-muted/10 border border-border/40 rounded-full p-4 flex items-center justify-center select-none">
        <div className="flex items-center gap-4 max-w-3xl w-full justify-between">
          {[
            { step: 1, label: "Basic Info", icon: Package },
            { step: 2, label: "Media", icon: ImageIcon },
            { step: 3, label: "Variants", icon: Ruler },
            { step: 4, label: "Specs", icon: Settings },
          ].map((item, index, arr) => {
            const isCompleted = currentStep > item.step;
            const isActive = currentStep === item.step;
            return (
              <React.Fragment key={item.step}>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(item.step)}
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all border cursor-pointer",
                      isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : isActive
                          ? "bg-primary border-primary text-primary-foreground"
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
                      "text-xs font-medium tracking-tight transition-colors hidden sm:inline",
                      isActive
                        ? "text-primary"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground/60",
                    )}>
                    {item.label}
                  </span>
                </div>
                {index < arr.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-px mx-2 transition-all duration-300",
                      currentStep > item.step
                        ? "bg-primary"
                        : "border-t border-dashed border-border/80",
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-card border border-border/60 rounded-2xl p-6 space-y-6 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Product Title *
                </Label>
                <Input
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. Nike Air Max 270 React"
                  className="h-10 border-border/60 rounded-full bg-background font-medium text-xs"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Brand *
                  </Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => updateField("brand", e.target.value)}
                    placeholder="e.g. Nike"
                    className="h-10 border-border/60 rounded-full bg-background font-medium text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Main Category *
                  </Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={handleCategoryChange}>
                    <SelectTrigger className="w-full h-10 rounded-full text-xs font-semibold border-border/60 bg-background">
                      <SelectValue placeholder="Select Main Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/60 p-1">
                      <SelectGroup>
                        {(categories as CategoryTree[]).map((cat) => (
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
              </div>
              {availableSubCategories.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Subcategory *
                  </Label>
                  <Select
                    value={formData.subCategoryId}
                    onValueChange={(val) => updateField("subCategoryId", val)}>
                    <SelectTrigger className="w-full h-10 rounded-full text-xs font-semibold border-border/60 bg-background">
                      <SelectValue placeholder="Select Subcategory" />
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
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted/50 border border-border/40 rounded-full">
                      <FolderTree className="w-3 h-3" />
                      {(categories as CategoryTree[]).find(
                        (c) => c.id === formData.categoryId,
                      )?.name || "Category"}
                    </span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/5 border border-purple-500/10 text-purple-600 rounded-full">
                      <Layers className="w-3 h-3" />
                      {availableSubCategories.find(
                        (s) => s.id === formData.subCategoryId,
                      )?.name || "Select subcategory"}
                    </span>
                  </div>
                </div>
              )}
              {formData.categoryId && availableSubCategories.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border/40 rounded-xl">
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground font-medium">
                    This product will be listed directly under{" "}
                    <strong className="text-foreground">
                      {
                        categories.find(
                          (c: CategoryTree) => c.id === formData.categoryId,
                        )?.name
                      }
                    </strong>
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Selling Price (UGX) *
                  </Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => updateField("price", e.target.value)}
                    placeholder="e.g. 180000"
                    className="h-10 border-border/60 rounded-full bg-background font-medium text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Original Price (UGX)
                  </Label>
                  <Input
                    type="number"
                    value={formData.compareAtPrice}
                    onChange={(e) =>
                      updateField("compareAtPrice", e.target.value)
                    }
                    placeholder="e.g. 240000"
                    className="h-10 border-border/60 rounded-full bg-background font-medium text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Stock Quantity *
                  </Label>
                  <Input
                    type="number"
                    value={formData.inventoryCount}
                    onChange={(e) =>
                      updateField("inventoryCount", e.target.value)
                    }
                    placeholder="0"
                    className="h-10 border-border/60 rounded-full bg-background font-medium text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>SKU Code</span>
                  </Label>
                  <div className="relative">
                    <Input
                      value={formData.sku}
                      onChange={(e) => updateField("sku", e.target.value)}
                      placeholder="Auto-generated"
                      className={cn(
                        "h-10 border-border/60 rounded-full bg-background font-mono text-xs font-medium pr-10",
                        formData.sku && "bg-muted/30",
                      )}
                    />
                    {formData.sku && (
                      <button
                        type="button"
                        onClick={() => {
                          const brandPrefix = formData.brand
                            .replace(/[^a-zA-Z0-9]/g, "")
                            .substring(0, 3)
                            .toUpperCase();
                          const titlePrefix = formData.title
                            .replace(/[^a-zA-Z0-9]/g, "")
                            .substring(0, 4)
                            .toUpperCase();
                          const timestamp = Date.now().toString().slice(-4);
                          updateField(
                            "sku",
                            `${brandPrefix}-${titlePrefix}-${timestamp}`,
                          );
                          toast.success("SKU regenerated");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-full transition-colors cursor-pointer"
                        title="Regenerate SKU">
                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Search Tags
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.tagInput}
                    onChange={(e) => updateField("tagInput", e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addTag())
                    }
                    placeholder="Add tag and press Enter"
                    className="flex-1 h-10 border-border/60 rounded-full bg-background font-medium text-xs"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-primary text-white rounded-full text-xs font-medium hover:bg-emerald-600 transition-colors cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formData.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted/50 border border-border/40 rounded-full text-[10px] font-medium text-foreground">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(i)}
                          className="hover:text-rose-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-border/40 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="h-10 px-5 bg-primary text-primary-foreground text-xs font-medium rounded-full hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
                  <span>Next: Media Assets</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Primary Product Image *
                </Label>
                <ImageUpload
                  value={formData.image}
                  onChange={(url) => updateField("image", url)}
                  bucket="marketplace-images"
                  folder="products"
                  maxSizeInMB={5}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Gallery Images (Up to 4)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {formData.images.map((img, i) => (
                    <ImageUploadMini
                      key={i}
                      value={typeof img === "string" ? img : ""}
                      onChange={(url) => {
                        const newImages = [...formData.images];
                        newImages[i] = url;
                        updateField("images", newImages);
                      }}
                      bucket="marketplace-images"
                      folder="products/gallery"
                      maxSizeInMB={3}
                    />
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-border/40 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="h-10 px-4 border border-border/60 hover:bg-muted text-xs font-medium rounded-full transition-all cursor-pointer">
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="h-10 px-5 bg-primary text-primary-foreground text-xs font-medium rounded-full hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
                  <span>Next: Variants</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-2.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Ruler className="w-3.5 h-3.5" /> Available Sizes
                </Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "XS",
                    "S",
                    "M",
                    "L",
                    "XL",
                    "XXL",
                    "38",
                    "39",
                    "40",
                    "41",
                    "42",
                    "43",
                    "44",
                    "One Size",
                  ].map((size) => {
                    const isSelected = formData.sizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={cn(
                          "h-10 px-4 text-xs font-medium rounded-full border transition-all active:scale-95 cursor-pointer",
                          isSelected
                            ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950"
                            : "border-border/60 bg-background text-foreground hover:bg-muted",
                        )}>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 stroke-[2.5] inline mr-1" />
                        )}
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5" /> Available Colors
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.colorInput}
                    onChange={(e) => updateField("colorInput", e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addColor())
                    }
                    placeholder="e.g. Black/White"
                    className="flex-1 h-10 border-border/60 rounded-full bg-background font-medium text-xs"
                  />
                  <button
                    type="button"
                    onClick={addColor}
                    className="px-4 py-2 bg-primary text-white rounded-full text-xs font-medium hover:bg-emerald-600 transition-colors cursor-pointer">
                    Add
                  </button>
                </div>
                {formData.colors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formData.colors.map((color, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted/50 border border-border/40 rounded-full text-[10px] font-medium text-foreground">
                        {color}
                        <button
                          type="button"
                          onClick={() => removeColor(i)}
                          className="hover:text-rose-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-border/40 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="h-10 px-4 border border-border/60 hover:bg-muted text-xs font-medium rounded-full transition-all cursor-pointer">
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="h-10 px-5 bg-primary text-primary-foreground text-xs font-medium rounded-full hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
                  <span>Next: Specifications</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Product Description *
                </Label>
                <Textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Describe the product in detail..."
                  className="w-full border border-border/60 rounded-2xl p-3 text-xs font-medium bg-background resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    field: "manufacturer" as const,
                    label: "Manufacturer",
                    placeholder: "e.g. Nike International",
                  },
                  {
                    field: "material" as const,
                    label: "Primary Material",
                    placeholder: "e.g. Dura-Mesh Fabric",
                  },
                  {
                    field: "cushioning" as const,
                    label: "Cushioning Tech",
                    placeholder: "e.g. Air Max Alpha Foam",
                  },
                  {
                    field: "origin" as const,
                    label: "Origin",
                    placeholder: "e.g. Made in Vietnam",
                  },
                  {
                    field: "weight" as const,
                    label: "Weight",
                    placeholder: "e.g. 340g per unit",
                  },
                  {
                    field: "outsole" as const,
                    label: "Outsole Grip",
                    placeholder: "e.g. High-traction rubber",
                  },
                ].map(({ field, label, placeholder }) => {
                  const valueMap: Record<string, string> = {
                    manufacturer: formData.manufacturer,
                    material: formData.material,
                    cushioning: formData.cushioning,
                    origin: formData.origin,
                    weight: formData.weight,
                    outsole: formData.outsole,
                  };
                  return (
                    <div key={field} className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {label}
                      </Label>
                      <Input
                        value={valueMap[field]}
                        onChange={(e) => updateField(field, e.target.value)}
                        placeholder={placeholder}
                        className="h-10 border-border/60 rounded-full bg-background font-medium text-xs"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="pt-4 border-t border-border/40 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="h-10 px-4 border border-border/60 hover:bg-muted text-xs font-medium rounded-full transition-all cursor-pointer">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 px-6 bg-primary hover:bg-emerald-600 text-primary-foreground text-xs font-medium rounded-full active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                  <span>
                    {isSubmitting
                      ? "Saving..."
                      : isEditMode
                        ? "Update Product"
                        : "Publish Product"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4 select-none">
          <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] sticky top-6">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Live Preview
              </Label>
              {formData.title && (
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                  Draft
                </span>
              )}
            </div>
            <div className="flex flex-row items-center">
              <div className="relative aspect-square w-full max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-muted border border-border/40 group">
                {formData.image ? (
                  <>
                    <Image
                      src={formData.image}
                      alt="Product preview"
                      fill
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {formData.compareAtPrice &&
                      formData.price &&
                      Number(formData.compareAtPrice) >
                        Number(formData.price) && (
                        <span className="absolute top-3 left-3 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {Math.round(
                            ((Number(formData.compareAtPrice) -
                              Number(formData.price)) /
                              Number(formData.compareAtPrice)) *
                              100,
                          )}
                          % OFF
                        </span>
                      )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-4">
                    <div className="p-3 rounded-full bg-muted/50">
                      <ImageIcon className="w-6 h-6 opacity-30" />
                    </div>
                    <span className="text-[10px] font-medium text-center">
                      Upload a product image
                      <br />
                      to see preview
                    </span>
                  </div>
                )}
              </div>
              {formData.images.some((img) => img) && (
                <div className="flex flex-col justify-center gap-2">
                  {formData.images
                    .filter((img) => img)
                    .slice(0, 4)
                    .map((img, i) => (
                      <div
                        key={i}
                        className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-border/60 bg-muted hover:border-primary/50 transition-all cursor-pointer">
                        <Image
                          src={typeof img === "string" ? img : ""}
                          alt={`Preview ${i + 2}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  {Array.from({
                    length: Math.max(
                      0,
                      4 - formData.images.filter((img) => img).length,
                    ),
                  }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="w-14 h-14 rounded-xl border-2 border-dashed border-border/40 bg-muted/30 flex items-center justify-center">
                      <ImageIcon className="w-3.5 h-3.5 text-muted-foreground/30" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-muted/30 border border-border/40 rounded-xl p-4 space-y-3">
              <div className="space-y-1">
                {formData.brand && (
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {formData.brand}
                  </span>
                )}
                {formData.title ? (
                  <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                    {formData.title}
                  </h3>
                ) : (
                  <h3 className="text-sm font-bold text-muted-foreground/40 italic">
                    Product name will appear here
                  </h3>
                )}
              </div>
              {formData.title && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-3 h-3 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    (0 reviews)
                  </span>
                </div>
              )}
              <div className="flex items-baseline gap-2 pt-1 border-t border-border/30">
                {formData.price ? (
                  <>
                    <span className="text-lg font-bold text-foreground tracking-tight">
                      UGX {Number(formData.price).toLocaleString()}
                    </span>
                    {formData.compareAtPrice && (
                      <span className="text-xs text-muted-foreground line-through font-medium">
                        UGX {Number(formData.compareAtPrice).toLocaleString()}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground/40 font-medium italic">
                    UGX 0
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {formData.sizes.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                      Sizes
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {formData.sizes.slice(0, 5).map((size) => (
                        <span
                          key={size}
                          className="px-2 py-0.5 bg-background border border-border/60 rounded-md text-[10px] font-medium text-foreground">
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {formData.colors.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                      Colors
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {formData.colors.slice(0, 3).map((color, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-background border border-border/60 rounded-md text-[10px] font-medium text-foreground">
                          {color}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30">
                {formData.inventoryCount && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                      Stock:{" "}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-bold",
                        Number(formData.inventoryCount) > 0
                          ? "text-emerald-600"
                          : "text-rose-500",
                      )}>
                      {Number(formData.inventoryCount) > 0
                        ? `${formData.inventoryCount} units`
                        : "Out of stock"}
                    </span>
                  </div>
                )}
                {formData.categoryId && (
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                      Category
                    </span>
                    <span className="text-[11px] font-medium text-foreground truncate block">
                      {categories.find(
                        (c: CategoryTree) => c.id === formData.categoryId,
                      )?.name || "Selected"}
                    </span>
                  </div>
                )}
              </div>
              {formData.tags.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-border/30">
                  <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.slice(0, 3).map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-primary/5 border border-primary/10 rounded-full text-[10px] font-medium text-primary">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  Profile completeness
                </span>
                <span className="font-bold text-foreground">
                  {[
                    formData.title,
                    formData.price,
                    formData.image,
                    formData.categoryId,
                    formData.description,
                  ].filter(Boolean).length * 20}
                  %
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{
                    width: `${[formData.title, formData.price, formData.image, formData.categoryId, formData.description].filter(Boolean).length * 20}%`,
                  }}
                />
              </div>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 border border-border/40 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                This preview shows how your product will appear to customers.
                Complete all sections for the best results.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

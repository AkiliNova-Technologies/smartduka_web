"use client";

import * as React from "react";
import {
  Plus,
  Edit2,
  Trash2,
  FolderTree,
  Layers,
  ShoppingBag,
} from "lucide-react";
import Image from "next/image";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DeleteDialog } from "@/components/alert-dialog";
import { useCategories } from "@/hooks/use-categories";
import { useDeleteDialog } from "@/hooks/use-delete-dialog";
import { ImageUpload } from "@/components/image-upload";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadMini } from "@/components/image-upload-mini";
import { Category } from "@/types/marketplace";

interface SubCategoryFormState {
  name: string;
  slug: string;
  image: string;
}

export default function AdminCategoriesPage() {
  const {
    categories,
    isLoading,
    isMutating,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories({ mode: "flat" });

  // Delete dialog hook
  const {
    isOpen: isDeleteOpen,
    isDeleting,
    itemToDelete,
    openDeleteDialog,
    closeDeleteDialog,
    handleDelete,
  } = useDeleteDialog(async (id) => {
    const result = await deleteCategory(id);
    return { success: !result.error, error: result.error };
  });

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);

  // Step 1 States (Main Category)
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [image, setImage] = React.useState("");

  // Step 2 States (Subcategories Configuration)
  const [step, setStep] = React.useState<1 | 2>(1);
  const [subCategories, setSubCategories] = React.useState<SubCategoryFormState[]>([]);
  const [newSubName, setNewSubName] = React.useState("");
  const [newSubImage, setNewSubImage] = React.useState("");

  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  };

  const handleSheetOpenChange = (open: boolean) => {
    setDrawerOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const resetForm = () => {
    setStep(1);
    setName("");
    setSlug("");
    setDescription("");
    setImage("");
    setSubCategories([]);
    setNewSubName("");
    setNewSubImage("");
    setEditingCategory(null);
  };

  // Open sheet for editing
  const handleEditCategory = React.useCallback((category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setSlug(category.slug);
    setDescription(category.description || "");
    setImage(category.image || "");
    
    // Find existing subcategories (children of this category)
    const children = categories.filter(c => c.parentId === category.id);
    setSubCategories(
      children.map(child => ({
        name: child.name,
        slug: child.slug,
        image: child.image || fallbackImage,
      }))
    );
    
    setDrawerOpen(true);
    
  }, [categories]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      setSlug(generateSlug(val));
    }
  };

  const addSubCategory = () => {
    if (!newSubName.trim()) return;
    setSubCategories([
      ...subCategories,
      {
        name: newSubName.trim(),
        slug: generateSlug(newSubName),
        image: newSubImage || fallbackImage,
      },
    ]);
    setNewSubName("");
    setNewSubImage("");
  };

  const removeSubCategory = (index: number) => {
    setSubCategories(subCategories.filter((_, i) => i !== index));
  };

  const fallbackImage =
    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80";

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;

    let result;
    
    if (editingCategory) {
      // Update existing category
      result = await updateCategory({
        id: editingCategory.id,
        name,
        slug,
        description: description || "No description provided.",
        image: image || fallbackImage,
        parentId: editingCategory.parentId || null,
      });
      
      // TODO: Handle subcategory updates here
      // You might want to create new subcategories and delete removed ones
    } else {
      // Create new category
      result = await createCategory({
        name,
        slug,
        description: description || "No description provided.",
        image: image || fallbackImage,
        subCategories: subCategories.map((sub) => ({
          name: sub.name,
          slug: sub.slug,
          image: sub.image,
        })),
      });
    }

    if (result.success) {
      handleSheetOpenChange(false);
    }
  };

  // ==========================================
  // COLUMNS DEFINITION
  // ==========================================
  const columns = React.useMemo<ColumnDef<Category, unknown>[]>(
    () => [
      {
        accessorKey: "image",
        header: "Photo",
        cell: ({ row }) => (
          <div className="relative size-10 rounded-xl bg-muted border border-border/40 overflow-hidden shrink-0 select-none">
            <Image
              src={row.original.image || fallbackImage}
              alt={row.original.name}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: "Category Info",
        cell: ({ row }) => (
          <div className="space-y-0.5 max-w-[240px]">
            <span className="font-medium text-foreground block tracking-tight truncate">
              {row.original.name}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="text-[11px] text-muted-foreground text-wrap block line-clamp-1">
            {row.original.description}
          </span>
        ),
      },
      {
        accessorKey: "parentId",
        header: "Hierarchy Level",
        cell: ({ row }) => {
          const parent = categories.find((c) => c.id === row.original.parentId);
          return parent ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 bg-purple-500/5 border border-purple-500/10 px-2.5 py-0.5 rounded-md">
              <FolderTree className="w-3 h-3" />
              <span>Child of: {parent.name}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-0.5 rounded-md">
              <Layers className="w-3 h-3" />
              <span>
                Main Group ({row.original._count?.subCategories || 0} sub-items)
              </span>
            </span>
          );
        },
      },
      {
        id: "productsCount",
        header: "Total Products",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <ShoppingBag className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>{row.original._count?.products ?? 0} items</span>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => handleEditCategory(row.original)}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md border border-border/40 hover:bg-muted transition-colors cursor-pointer"
              title="Edit Category"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => openDeleteDialog(row.original.id, {
                itemName: row.original.name,
                itemType: "category",
                title: "Delete Category",
              })}
              className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-md border border-border/40 hover:bg-rose-500/5 transition-colors cursor-pointer"
              title="Delete Category"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [categories, openDeleteDialog, handleEditCategory],
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1 select-none">
        <h2 className="text-xl font-medium tracking-tight text-foreground">
          Item Categories
        </h2>
        <p className="text-xs font-semibold text-muted-foreground">
          Group items with tracking for descriptions, custom images, and
          structural inventory visibility.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-medium">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={categories}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        renderTabs={
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground select-none flex items-center gap-2">
            <span>Marketplace Catalog Structure</span>
          </div>
        }
        toolbarActions={
          <Sheet open={drawerOpen} onOpenChange={handleSheetOpenChange}>
            <SheetTrigger asChild>
              <Button
                size="sm"
                disabled={isMutating}
                onClick={resetForm}
                className="h-9 rounded-full text-xs font-medium gap-1.5 cursor-pointer bg-primary hover:bg-emerald-600 text-white transition-colors disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </Button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-full sm:max-w-md bg-card border-l border-border/60 p-6 flex flex-col justify-between">
              <div className="space-y-5 overflow-y-auto max-h-[82vh] pr-1">
                <SheetHeader className="text-left select-none px-0">
                  <SheetTitle className="text-base font-medium text-foreground">
                    {editingCategory
                      ? step === 1
                        ? "Edit Category Details"
                        : "Edit Subcategory Details"
                      : step === 1
                      ? "Step 1: Parent Group Info"
                      : "Step 2: Nested Subcategories"}
                  </SheetTitle>
                  <SheetDescription className="text-xs font-medium text-muted-foreground leading-normal">
                    {editingCategory
                      ? `Editing "${editingCategory.name}"`
                      : step === 1
                      ? "Set up the high-level group parameters and indexing overview."
                      : `Assign specific sub-items to "${name}" alongside distinctive thumbnail references.`}
                  </SheetDescription>
                </SheetHeader>

                {/* STEP 1: MAIN DETAILS WITH DESCRIPTION */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="cat-name"
                        className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Category Name
                      </Label>
                      <Input
                        id="cat-name"
                        required
                        placeholder="e.g., Household Electronics"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="h-10 border-border/60 rounded-full bg-muted/30 font-medium text-xs focus-visible:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="cat-desc"
                        className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Description
                      </Label>
                      <Textarea
                        id="cat-desc"
                        rows={5}
                        placeholder="Brief overview explaining what products drop into this group..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 text-xs font-medium border border-border/60 rounded-2xl bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 resize-none text-foreground"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Group Banner / Photo
                      </Label>
                      <ImageUpload
                        value={image}
                        onChange={setImage}
                        bucket="marketplace-images"
                        folder="categories"
                        maxSizeInMB={5}
                        placeholder="Upload category image"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: MULTIPLE SUBCATEGORIES WITH INDIVIDUAL IMAGES */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted/40 border border-border/50 rounded-2xl space-y-3">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="sub-name"
                          className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Subcategory Name
                        </Label>
                        <Input
                          id="sub-name"
                          placeholder="e.g., Audio Equipment"
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                          className="h-10 border-border/60 rounded-full bg-background text-xs focus-visible:ring-primary/20"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Subcategory Thumbnail Image
                        </Label>
                        <ImageUploadMini
                          value={newSubImage}
                          onChange={setNewSubImage}
                          bucket="marketplace-images"
                          folder="subcategories"
                          maxSizeInMB={2}
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={addSubCategory}
                        variant="default"
                        className="w-full h-9 rounded-full text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                        Add to Stack
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                        Subcategory Stack ({subCategories.length})
                      </Label>

                      {subCategories.length === 0 ? (
                        <div className="text-xs border border-border/40 border-dashed rounded-2xl p-6 text-center text-muted-foreground/70 bg-muted/10">
                          Empty stack. Create nested configurations above.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {subCategories.map((sub, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-muted/50 rounded-xl border border-border/40 text-xs gap-3">
                              <div className="relative size-8 rounded-lg overflow-hidden border border-border shrink-0 bg-background">
                                <Image
                                  src={sub.image}
                                  alt={sub.name}
                                  fill
                                  className="object-cover"
                                  sizes="32px"
                                />
                              </div>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="font-medium text-foreground truncate">
                                  {sub.name}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => removeSubCategory(index)}
                                className="size-7 p-0 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* CONTROLS */}
              <div className="flex gap-3 border-t border-border/40 pt-4 mt-auto">
                {step === 1 ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSheetOpenChange(false)}
                      className="flex-1 h-10 rounded-full text-xs font-medium border-border/70 cursor-pointer">
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={!name.trim()}
                      onClick={() => setStep(2)}
                      className="flex-1 h-10 rounded-full text-xs font-medium bg-primary hover:bg-emerald-600 text-white cursor-pointer disabled:opacity-50">
                      {editingCategory ? "Edit Subcategories" : "Add SubCategories"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="h-10 rounded-full text-xs font-medium border-border/70 cursor-pointer px-4">
                      Back
                    </Button>
                    <Button
                      type="button"
                      disabled={isMutating}
                      onClick={handleSaveCategory}
                      className="flex-1 h-10 rounded-full text-xs font-medium bg-primary hover:bg-emerald-600 text-white cursor-pointer disabled:opacity-50">
                      {isMutating ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        }
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={isDeleteOpen}
        onOpenChange={(open) => !open && closeDeleteDialog()}
        title={itemToDelete?.config.title}
        description={itemToDelete?.config.description}
        itemName={itemToDelete?.config.itemName}
        itemType={itemToDelete?.config.itemType}
        variant={itemToDelete?.config.variant}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
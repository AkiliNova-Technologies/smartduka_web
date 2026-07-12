"use client";

import * as React from "react";
import { toast } from "sonner";

interface DeleteConfig {
  itemName?: string;
  itemType?: string;
  title?: string;
  description?: string;
  variant?: "danger" | "warning";
}

interface DeleteResult {
  success: boolean;
  error?: string;
}

export function useDeleteDialog(
  onDelete: (id: string) => Promise<DeleteResult>,
) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<{
    id: string;
    config: DeleteConfig;
  } | null>(null);

  const openDeleteDialog = (id: string, config: DeleteConfig) => {
    setItemToDelete({ id, config });
    setIsOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsOpen(false);
    setTimeout(() => {
      setItemToDelete(null);
    }, 200);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    
    const toastId = toast.loading(
      `Deleting ${itemToDelete.config.itemType || "item"}...`,
      {
        description: itemToDelete.config.itemName 
          ? `Removing "${itemToDelete.config.itemName}"`
          : "Please wait while we process your request",
      }
    );

    try {
      const result = await onDelete(itemToDelete.id);
      
      if (result.success) {
        toast.success(
          `${capitalize(itemToDelete.config.itemType || "Item")} Deleted Successfully`,
          {
            id: toastId,
            description: itemToDelete.config.itemName 
              ? `"${itemToDelete.config.itemName}" has been permanently removed from the platform.`
              : `The ${itemToDelete.config.itemType} has been successfully deleted.`,
            duration: 4000,
          }
        );
        closeDeleteDialog();
      } else {
        // Error toast
        toast.error(
          "Delete Operation Failed",
          {
            id: toastId,
            description: result.error || `Unable to delete the ${itemToDelete.config.itemType}. Please try again.`,
            duration: 6000,
          }
        );
      }
    } catch {
      // Unexpected error toast
      toast.error(
        "Unexpected Error Occurred",
        {
          id: toastId,
          description: "An unexpected error occurred while processing your request. Please try again.",
          duration: 6000,
        }
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isOpen,
    isDeleting,
    itemToDelete,
    openDeleteDialog,
    closeDeleteDialog,
    handleDelete,
  };
}

// Helper function to capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
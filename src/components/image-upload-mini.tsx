"use client";

import * as React from "react";
import { FileUpload } from "@ark-ui/react/file-upload";
import { ImageIcon, X, Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { uploadImageToSupabase } from "@/lib/supabase/upload-image";

interface ImageUploadMiniProps {
  value?: string;
  onChange?: (url: string) => void;
  bucket?: string;
  folder?: string;
  maxSizeInMB?: number;
  className?: string;
}

export function ImageUploadMini({
  value,
  onChange,
  bucket = "marketplace-images",
  folder = "categories",
  maxSizeInMB = 5,
  className,
}: ImageUploadMiniProps) {
  const [preview, setPreview] = React.useState<string | null>(value || null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const previewRef = React.useRef(preview);

  // Sync external value changes without triggering re-renders
  React.useEffect(() => {
    if (value !== undefined && value !== previewRef.current) {
      previewRef.current = value;
      setPreview(value);
    }
  }, [value]);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);

    // Create local preview
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      const result = await uploadImageToSupabase({
        file,
        bucket,
        folder,
        maxSizeInMB,
      });

      if (result.success && result.url) {
        setPreview(result.url);
        onChange?.(result.url);
        URL.revokeObjectURL(localPreview);
      } else {
        setError(result.error || "Upload failed");
        setPreview(value || null);
        URL.revokeObjectURL(localPreview);
      }
    } catch {
      setError("Failed to upload image");
      setPreview(value || null);
      URL.revokeObjectURL(localPreview);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onChange?.("");
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    const currentPreview = previewRef.current;
    return () => {
      if (currentPreview && currentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview);
      }
    };
  }, []);

  return (
    <div className={cn("space-y-1.5", className)}>
      <FileUpload.Root
        maxFiles={1}
        accept="image/*"
        onFileAccept={({ files }) => {
          if (files.length > 0) {
            handleUpload(files[0]);
          }
        }}
      >
        <FileUpload.Context>
          {() => (
            <div className="flex items-center gap-3">
              {/* Preview / Upload Area */}
              <div className="relative">
                {isUploading ? (
                  <div className="w-12 h-12 rounded-xl border-2 border-dashed border-border/60 bg-muted/20 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  </div>
                ) : preview ? (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-border/60 bg-muted group">
                    <Image
                      src={preview}
                      alt="Thumbnail preview"
                      fill
                      className="object-cover"
                      sizes="48px"
                      unoptimized={preview.startsWith('blob:')}
                    />
                    {/* Remove button overlay */}
                    <button
                      type="button"
                      onClick={handleRemove}
                      className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors opacity-0 group-hover:opacity-100 z-10"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <FileUpload.Trigger className="w-12 h-12 rounded-xl border-2 border-dashed border-border/60 bg-muted/20 flex items-center justify-center hover:bg-muted/40 hover:border-primary/30 transition-colors cursor-pointer">
                    <ImageIcon className="w-4 h-4 text-muted-foreground/60" />
                  </FileUpload.Trigger>
                )}
              </div>

              {/* Upload Button */}
              <FileUpload.Trigger className="flex-1 h-10 px-4 border border-dashed border-border/60 rounded-full flex items-center justify-center gap-2 bg-background hover:bg-muted/30 transition-colors cursor-pointer text-xs text-muted-foreground">
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : preview ? (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Change image</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Click to upload thumbnail</span>
                  </>
                )}
              </FileUpload.Trigger>
            </div>
          )}
        </FileUpload.Context>

        <FileUpload.HiddenInput />
      </FileUpload.Root>

      {error && (
        <p className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
          <X className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}
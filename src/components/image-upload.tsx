"use client";

import * as React from "react";
import { FileUpload } from "@ark-ui/react/file-upload";
import { Upload, X, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { uploadImageToSupabase } from "@/lib/supabase/upload-image";

interface ImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  onUploading?: (isUploading: boolean) => void;
  bucket?: string;
  folder?: string;
  maxSizeInMB?: number;
  className?: string;
  placeholder?: string;
}

export function ImageUpload({
  value,
  onChange,
  onUploading,
  bucket = "marketplace-images",
  folder = "categories",
  maxSizeInMB = 5,
  className,
}: ImageUploadProps) {
  const [preview, setPreview] = React.useState<string | null>(value || null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const previewRef = React.useRef(preview);

  // Sync external value changes without unnecessary re-renders
  React.useEffect(() => {
    if (value !== undefined && value !== previewRef.current) {
      previewRef.current = value;
      setPreview(value);
    }
  }, [value]);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    onUploading?.(true);

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
        // Revoke the local blob URL since we now have the permanent URL
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
      onUploading?.(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onChange?.("");
    // Revoke object URL to free memory
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
    <div className={cn("space-y-2", className)}>
      <FileUpload.Root
        maxFiles={1}
        accept="image/*"
        onFileAccept={({ files }) => {
          if (files.length > 0) {
            handleUpload(files[0]);
          }
        }}
        className="flex flex-col items-start gap-3"
      >
        <FileUpload.Context>
          {() => (
            <>
              {/* Drop zone area with integrated preview */}
              <FileUpload.Dropzone 
                onDragEnter={() => setIsDragOver(true)}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={() => setIsDragOver(false)}
                className={cn(
                  "w-full rounded-2xl transition-all cursor-pointer relative overflow-hidden",
                  isDragOver 
                    ? "border-2 border-primary bg-primary/5" 
                    : preview 
                      ? "border-2 border-emerald-500/30 bg-muted/10" 
                      : "border-2 border-dashed border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-primary/30"
                )}
              >
                {/* Uploading State */}
                {isUploading && (
                  <div className="p-8 flex flex-col items-center justify-center text-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <Loader2 className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground">Uploading image...</p>
                      <p className="text-[10px] text-muted-foreground">Please wait while we process your file</p>
                    </div>
                  </div>
                )}

                {/* Preview State with Image */}
                {!isUploading && preview && (
                  <div className="relative group">
                    <div className="relative w-full h-48 rounded-2xl overflow-hidden">
                      <Image
                        src={preview}
                        alt="Uploaded image preview"
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 400px"
                        unoptimized={preview.startsWith('blob:')}
                      />
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      
                      {/* Action buttons overlay */}
                      <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <FileUpload.Trigger className="px-3 py-1.5 bg-emerald-500/90 hover:bg-emerald-600 text-white text-[11px] font-medium rounded-full backdrop-blur-sm transition-colors cursor-pointer">
                          Change image
                        </FileUpload.Trigger>
                        <button
                          type="button"
                          onClick={handleRemove}
                          className="p-1.5 bg-rose-500/90 hover:bg-rose-500 text-white rounded-full backdrop-blur-sm transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Success badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/90 backdrop-blur-sm rounded-full text-white text-[10px] font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Uploaded</span>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!isUploading && !preview && (
                  <div className="p-8 flex flex-col items-center justify-center text-center gap-3">
                    <div className={cn(
                      "p-3 rounded-full transition-colors",
                      isDragOver ? "bg-primary/20" : "bg-primary/10"
                    )}>
                      <Upload className={cn(
                        "w-5 h-5 transition-colors",
                        isDragOver ? "text-primary" : "text-primary/70"
                      )} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground">
                        {isDragOver ? "Drop your image here" : "Drop your image here or click to browse"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Supports PNG, JPG, WebP up to {maxSizeInMB}MB
                      </p>
                    </div>
                    <FileUpload.Trigger className="px-4 py-2 bg-primary hover:bg-emerald-600 text-white text-xs font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 transition-colors cursor-pointer mt-1">
                      Select image
                    </FileUpload.Trigger>
                  </div>
                )}
              </FileUpload.Dropzone>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/5 border border-rose-500/10 rounded-xl w-full">
                  <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <p className="text-[11px] text-rose-600 font-medium">{error}</p>
                </div>
              )}
            </>
          )}
        </FileUpload.Context>

        <FileUpload.HiddenInput />
      </FileUpload.Root>
    </div>
  );
}
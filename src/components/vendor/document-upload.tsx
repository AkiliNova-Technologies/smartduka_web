"use client";

import { useState, ChangeEvent } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { toast } from "sonner";
import { UploadCloud, CheckCircle2, Loader2 } from "lucide-react";
import { uploadImageToSupabase } from "@/lib/supabase/upload-image"; 

interface DocumentUploadProps {
  label: string;
  bucketName: string;
  onUploadComplete: (url: string, fileName: string) => void;
}

export function DocumentUpload({ label, bucketName, onUploadComplete }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadImageToSupabase({
        file,
        bucket: bucketName,
        folder: "kyc-docs",
        maxSizeInMB: 5
      });

      if (result.success && result.url) {
        setUploadedName(file.name);
        onUploadComplete(result.url, file.name);
        toast.success(`${label} uploaded and validated.`);
      } else {
        toast.error(result.error || "Failed to process document upload.");
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("An unexpected error occurred during storage routing.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field className="border border-dashed border-border/60 rounded-2xl p-5 bg-card/40 text-center transition-colors hover:bg-muted/10">
      <FieldLabel className="text-xs font-semibold text-muted-foreground block mb-2 select-none">
        {label}
      </FieldLabel>
      
      <div className="flex flex-col items-center justify-center min-h-[72px]">
        {uploading ? (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground text-xs select-none">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span>Encrypting and transmitting asset...</span>
          </div>
        ) : uploadedName ? (
          <div className="flex items-center gap-2 text-primary bg-emerald-500/10 px-4 py-2 rounded-full border border-primary/20 animate-in fade-in zoom-in-95 duration-200">
            <CheckCircle2 className="size-4" />
            <span className="text-xs font-medium max-w-[220px] truncate">{uploadedName}</span>
          </div>
        ) : (
          <label className="flex flex-col items-center gap-1 cursor-pointer select-none group w-full py-2">
            <UploadCloud className="size-6 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-xs text-muted-foreground font-medium group-hover:underline">
              Click to upload document snapshot
            </span>
            <span className="text-[10px] text-muted-foreground/50">Supported formats: JPEG, PNG, WebP up to 5MB</span>
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp" 
              disabled={uploading} 
              onChange={handleFileChange} 
              className="hidden" 
            />
          </label>
        )}
      </div>
    </Field>
  );
}
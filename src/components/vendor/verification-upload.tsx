"use client";

import * as React from "react";
import { FileUpload } from "@ark-ui/react/file-upload";
import { Upload, X, Loader2, CheckCircle2, ShieldCheck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadImageToSupabase } from "@/lib/supabase/upload-image";
import { toast } from "sonner";

const REQUIRED_DOCUMENTS = [
  {
    type: "NATIONAL_ID",
    label: "National ID / Passport",
    description: "Government-issued photo identification",
    bucket: "vendor-docs",
  },
  {
    type: "BUSINESS_REGISTRATION",
    label: "Business Registration Certificate",
    description: "Official company registration document",
    bucket: "vendor-docs",
  },
  {
    type: "TAX_CERTIFICATE",
    label: "Tax Certificate (TIN)",
    description: "Uganda Revenue Authority tax identification",
    bucket: "vendor-docs",
  },
] as const;

interface DocumentUploadSlotProps {
  docType: string;
  label: string;
  description: string;
  bucket: string;
  onUploadComplete: (url: string, fileName: string) => void;
  onRemove: () => void;
}

function DocumentUploadSlot({
  docType,
  label,
  description,
  bucket,
  onUploadComplete,
  onRemove,
}: DocumentUploadSlotProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  // Use a ref to track the blob URL for cleanup on unmount
  const blobUrlRef = React.useRef<string | null>(null);

  // Cleanup blob URL on unmount
  React.useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);

    const localPreview = URL.createObjectURL(file);
    blobUrlRef.current = localPreview;
    setPreviewUrl(localPreview);
    setFileName(file.name);

    try {
      const result = await uploadImageToSupabase({
        file,
        bucket,
        folder: `kyc-docs/${docType.toLowerCase()}`,
        maxSizeInMB: 5,
      });

      if (result.success && result.url) {
        // Revoke the blob URL after successful upload
        URL.revokeObjectURL(localPreview);
        blobUrlRef.current = null;
        setPreviewUrl(result.url);
        onUploadComplete(result.url, file.name);
        toast.success(`${label} uploaded successfully.`);
      } else {
        setError(result.error || "Upload failed");
        setPreviewUrl(null);
        setFileName(null);
        URL.revokeObjectURL(localPreview);
        blobUrlRef.current = null;
        toast.error(result.error || "Failed to upload document.");
      }
    } catch {
      setError("Failed to upload document");
      setPreviewUrl(null);
      setFileName(null);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      toast.error("An unexpected error occurred.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPreviewUrl(null);
    setFileName(null);
    setError(null);
    onRemove();
  };

  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground/60">{description}</p>
      </div>

      <FileUpload.Root
        maxFiles={1}
        accept="image/jpeg,image/png,image/webp"
        onFileAccept={({ files }) => {
          if (files.length > 0) {
            handleUpload(files[0]);
          }
        }}
      >
        <FileUpload.Context>
          {() => (
            <>
              <FileUpload.Dropzone
                onDragEnter={() => setIsDragOver(true)}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={() => setIsDragOver(false)}
                className={cn(
                  "w-full rounded-2xl transition-all cursor-pointer relative overflow-hidden",
                  isDragOver
                    ? "border-2 border-primary bg-primary/5"
                    : previewUrl
                      ? "border-2 border-emerald-500/30 bg-muted/10"
                      : "border-2 border-dashed border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-primary/30"
                )}
              >
                {isUploading && (
                  <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <Loader2 className="w-4 h-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground">Uploading document...</p>
                      <p className="text-[10px] text-muted-foreground">{fileName}</p>
                    </div>
                  </div>
                )}

                {!isUploading && previewUrl && (
                  <div className="relative group">
                    <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-muted/30 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2 p-4">
                        <div className="p-3 rounded-full bg-emerald-500/10">
                          <FileText className="w-6 h-6 text-emerald-600" />
                        </div>
                        <p className="text-xs font-medium text-foreground max-w-[200px] truncate">
                          {fileName}
                        </p>
                        <span className="text-[10px] text-muted-foreground">Document uploaded successfully</span>
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                      <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <FileUpload.Trigger className="px-3 py-1.5 bg-emerald-500/90 hover:bg-emerald-600 text-white text-[11px] font-medium rounded-full backdrop-blur-sm transition-colors cursor-pointer">
                          Replace
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

                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/90 backdrop-blur-sm rounded-full text-white text-[10px] font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Uploaded</span>
                    </div>
                  </div>
                )}

                {!isUploading && !previewUrl && (
                  <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
                    <div
                      className={cn(
                        "p-3 rounded-full transition-colors",
                        isDragOver ? "bg-primary/20" : "bg-primary/10"
                      )}
                    >
                      <Upload
                        className={cn(
                          "w-5 h-5 transition-colors",
                          isDragOver ? "text-primary" : "text-primary/70"
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground">
                        {isDragOver ? "Drop document here" : "Drop document here or click to browse"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Supports JPEG, PNG, WebP up to 5MB
                      </p>
                    </div>
                    <FileUpload.Trigger className="px-4 py-2 bg-primary hover:bg-emerald-600 text-white text-xs font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 transition-colors cursor-pointer mt-1">
                      Upload document
                    </FileUpload.Trigger>
                  </div>
                )}
              </FileUpload.Dropzone>

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

// ==========================================
// MAIN COMPONENT: VendorVerificationUpload
// ==========================================

interface VendorVerificationUploadProps {
  vendorId: string;
  className?: string;
}

export function VendorVerificationUpload({ vendorId, className }: VendorVerificationUploadProps) {
  const [uploads, setUploads] = React.useState<Record<string, { url: string; name: string }>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);

  const allUploaded = REQUIRED_DOCUMENTS.every((doc) => uploads[doc.type]);

  const handleUploadComplete = (docType: string, url: string, name: string) => {
    setUploads((prev) => ({ ...prev, [docType]: { url, name } }));
  };

  const handleRemove = (docType: string) => {
    setUploads((prev) => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });
  };

  const handleSubmitVerification = async () => {
    if (!allUploaded) {
      toast.error("Please upload all required documents before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/vendors/${vendorId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: uploads }),
      });

      if (response.ok) {
        setIsComplete(true);
        toast.success("Documents submitted for verification! We'll review within 48 hours.");
      } else {
        const data = await response.json();
        throw new Error(data.error || "Submission failed");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit documents. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <div className={cn("text-center py-8 flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-300", className)}>
        <CheckCircle2 className="size-14 text-primary animate-bounce" />
        <h3 className="text-lg font-semibold text-foreground tracking-tight">Verification Submitted</h3>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          Our compliance team is reviewing your documents. You&apos;ll receive a notification once your{" "}
          <span className="font-semibold text-foreground">Verified Vendor</span> badge is approved.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
        <div className="flex gap-2 items-start">
          <ShieldCheck className="size-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">
              Verification Required
            </p>
            <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1 leading-relaxed">
              Upload the documents below to get your <strong>Verified Vendor</strong> badge. Verified vendors appear higher in search results and gain access to premium features.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {REQUIRED_DOCUMENTS.map((doc) => (
          <DocumentUploadSlot
            key={doc.type}
            docType={doc.type}
            label={doc.label}
            description={doc.description}
            bucket={doc.bucket}
            onUploadComplete={(url, name) => handleUploadComplete(doc.type, url, name)}
            onRemove={() => handleRemove(doc.type)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmitVerification}
        disabled={!allUploaded || isSubmitting}
        className={cn(
          "w-full h-11 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer",
          allUploaded && !isSubmitting
            ? "bg-primary text-white hover:bg-emerald-600"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {isSubmitting ? "Submitting Documents..." : "Submit for Verification"}
      </button>

      <p className="text-center text-[10px] text-muted-foreground">
        {Object.keys(uploads).length} of {REQUIRED_DOCUMENTS.length} documents uploaded
      </p>
    </div>
  );
}
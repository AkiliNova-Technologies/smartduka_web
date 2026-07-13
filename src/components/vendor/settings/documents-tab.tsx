"use client";

import { useState, useTransition } from "react";
import {
  ShieldCheck, FileText, Trash2, Loader2, Upload,
  BadgeCheck, CreditCard, Building, FileCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { uploadImageToSupabase } from "@/lib/supabase/upload-image";
import {
  uploadVerificationDocument,
  deleteVendorDocument,
  getMyVendorDocuments,
} from "@/actions/vendor-settings";
import type { Document, DocumentType } from "@prisma/client";

interface DocumentsTabProps {
  vendorId: string;
  initialDocuments: Document[];
}

const DOCUMENT_TYPES: { value: DocumentType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "BUSINESS_REGISTRATION", label: "Business Registration", icon: <Building className="w-3.5 h-3.5" />, description: "Official business registration certificate" },
  { value: "TAX_CERTIFICATE", label: "Tax Certificate", icon: <FileCheck className="w-3.5 h-3.5" />, description: "Tax registration or clearance certificate" },
  { value: "TRADING_LICENSE", label: "Trading License", icon: <CreditCard className="w-3.5 h-3.5" />, description: "Current trading/business license" },
  { value: "NATIONAL_ID", label: "National ID", icon: <BadgeCheck className="w-3.5 h-3.5" />, description: "Government-issued national ID" },
  { value: "PASSPORT", label: "Passport", icon: <BadgeCheck className="w-3.5 h-3.5" />, description: "Valid international passport" },
  { value: "OTHER", label: "Other Document", icon: <FileText className="w-3.5 h-3.5" />, description: "Any other supporting document" },
];

export function DocumentsTab({ vendorId, initialDocuments }: DocumentsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [selectedType, setSelectedType] = useState<DocumentType>("BUSINESS_REGISTRATION");
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadImageToSupabase({
        file,
        bucket: "marketplace-images",
        folder: `vendors/${vendorId}/documents`,
        maxSizeInMB: 10,
      });

      if (result.success && result.url) {
        const docResult = await uploadVerificationDocument(
          selectedType,
          file.name,
          result.url,
          file.type,
          file.size
        );

        if (docResult.success) {
          const refreshed = await getMyVendorDocuments();
          if (refreshed.success) setDocuments(refreshed.data);
          toast.success("Document uploaded successfully");
        } else {
          toast.error(docResult.error || "Failed to save document");
        }
      } else {
        toast.error(result.error || "Upload failed");
      }
    } catch {
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = (documentId: string) => {
    startTransition(async () => {
      const result = await deleteVendorDocument(documentId);
      if (result.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== documentId));
        toast.success("Document removed");
      } else {
        toast.error(result.error || "Failed to delete document");
      }
    });
  };

  const selectedTypeConfig = DOCUMENT_TYPES.find((t) => t.value === selectedType);

  return (
    <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden animate-in fade-in-50 duration-200">
      <div className="p-6 border-b border-border/60 bg-muted/30">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
          Verification Documents
        </h3>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Upload documents to unlock premium features like the verified badge, higher listing limits, and faster payouts.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Upload Section */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">
              Document Type
            </label>
            <Select
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as DocumentType)}
            >
              <SelectTrigger className="w-full text-xs font-semibold rounded-full px-4 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-xs font-semibold">
                    <span className="flex items-center gap-2">
                      {type.icon}
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTypeConfig && (
              <p className="text-[10px] text-muted-foreground">{selectedTypeConfig.description}</p>
            )}
          </div>

          <label className="block">
            <div className="border-2 border-dashed border-border/60 rounded-2xl p-6 text-center hover:border-primary/40 transition-colors cursor-pointer group">
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="text-xs font-bold text-muted-foreground">Uploading document...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2.5 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    JPG, PNG, WebP or PDF (max 10MB)
                  </span>
                </div>
              )}
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
            </div>
          </label>
        </div>

        {/* Existing Documents */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
              Uploaded Documents ({documents.length})
            </p>
            <div className="divide-y divide-border/40">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-1.5 rounded-lg bg-muted">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-normal">
                          {doc.type.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      View
                    </a>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benefits Info */}
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              Document Verification Benefits
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { icon: BadgeCheck, text: "Verified badge on your store" },
              { icon: CreditCard, text: "Eligible for faster payouts" },
              { icon: Building, text: "Higher product listing limits" },
              { icon: FileCheck, text: "Priority customer support" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <item.icon className="w-3 h-3 text-amber-600/60 shrink-0" />
                <span className="text-[11px] text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
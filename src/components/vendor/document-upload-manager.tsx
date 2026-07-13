"use client";

import { useState, useTransition } from "react";
import { 
  FileText, Upload, Trash2, Loader2, ShieldCheck, 
  CreditCard, FileCheck, Building, BadgeCheck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  getMyVendorDocuments
} from "@/actions/vendor-settings";
import type { Document, DocumentType } from "@prisma/client";

interface DocumentUploadManagerProps {
  vendorId: string;
  initialDocuments: Document[];
}

const documentTypeConfig: Record<DocumentType, { label: string; icon: React.ReactNode; description: string }> = {
  NATIONAL_ID: { 
    label: "National ID", 
    icon: <BadgeCheck className="w-4 h-4" />,
    description: "Government-issued national identification card" 
  },
  PASSPORT: { 
    label: "Passport", 
    icon: <BadgeCheck className="w-4 h-4" />,
    description: "Valid international passport" 
  },
  BUSINESS_REGISTRATION: { 
    label: "Business Registration", 
    icon: <Building className="w-4 h-4" />,
    description: "Official business registration certificate" 
  },
  TAX_CERTIFICATE: { 
    label: "Tax Certificate", 
    icon: <FileCheck className="w-4 h-4" />,
    description: "Tax registration or clearance certificate" 
  },
  TRADING_LICENSE: { 
    label: "Trading License", 
    icon: <CreditCard className="w-4 h-4" />,
    description: "Current trading/business license" 
  },
  OTHER: { 
    label: "Other Document", 
    icon: <FileText className="w-4 h-4" />,
    description: "Any other supporting document" 
  },
};

export function DocumentUploadManager({ vendorId, initialDocuments }: DocumentUploadManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [selectedType, setSelectedType] = useState<DocumentType>("BUSINESS_REGISTRATION");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadImageToSupabase({
        file,
        bucket: "vendor-assets",
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
          // Refresh document list
          const refreshed = await getMyVendorDocuments();
          if (refreshed.success) {
            setDocuments(refreshed.data);
          }
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
      // Reset file input
      e.target.value = "";
    }
  };

  const handleDelete = (documentId: string) => {
    startTransition(async () => {
      const result = await deleteVendorDocument(documentId);
      if (result.success) {
        setDocuments(prev => prev.filter(d => d.id !== documentId));
        toast.success("Document removed");
      } else {
        toast.error(result.error || "Failed to delete document");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Verification Documents
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload documents to unlock premium features like verified badge, higher listing limits, and faster payouts
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Upload New Document
          </CardTitle>
          <CardDescription className="text-[11px]">
            Select document type and upload a clear image or PDF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold">Document Type</label>
            <Select
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as DocumentType)}
            >
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(documentTypeConfig).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <span className="flex items-center gap-2">
                      {config.icon}
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              {documentTypeConfig[selectedType].description}
            </p>
          </div>

          <label className="block">
            <div className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer group">
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-xs font-bold text-muted-foreground">Uploading...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">
                    Click to upload or drag & drop
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    JPG, PNG, WebP or PDF (max 10MB)
                  </span>
                </div>
              )}
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Existing Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">
              Uploaded Documents ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                        {doc.type.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    View
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                    onClick={() => handleDelete(doc.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Feature Unlock Info */}
      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              Document Verification Benefits
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: BadgeCheck, text: "Verified badge on your store" },
              { icon: CreditCard, text: "Eligible for faster payouts" },
              { icon: Building, text: "Higher product listing limits" },
              { icon: FileCheck, text: "Priority customer support" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <item.icon className="w-3.5 h-3.5 text-amber-600/60" />
                <span className="text-[11px] text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
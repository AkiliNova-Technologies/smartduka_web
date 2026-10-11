import { VerificationDocumentError, VerificationDocumentService, type VerificationDocumentSource } from "@/services/verification-documents";

const SOURCES = new Set<VerificationDocumentSource>(["profile", "onboarding"]);
const safeFilename = (value: string) => value.replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 180) || "document";

export async function GET(request: Request, context: { params: Promise<{ source: string; id: string }> }) {
  try {
    const { source, id } = await context.params;
    if (!SOURCES.has(source as VerificationDocumentSource)) return Response.json({ error: "Document not found." }, { status: 404 });
    const resolved = await VerificationDocumentService.resolveForAdmin(source as VerificationDocumentSource, id);
    const body = await VerificationDocumentService.download(resolved);
    const disposition = new URL(request.url).searchParams.has("download") ? "attachment" : "inline";
    return new Response(body, {
      headers: {
        "Content-Type": resolved.record.mimeType || body.type || "application/octet-stream",
        "Content-Disposition": `${disposition}; filename="${safeFilename(resolved.record.name)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof VerificationDocumentError && error.code === "NOT_FOUND" ? 404 : error instanceof VerificationDocumentError && error.code === "INVALID_REFERENCE" ? 409 : 403;
    return Response.json({ error: error instanceof Error ? error.message : "Document access denied." }, { status });
  }
}

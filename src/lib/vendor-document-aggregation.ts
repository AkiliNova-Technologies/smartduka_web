import type { Prisma } from "@prisma/client";

export const adminVisibleProfileDocumentsWhere = {} satisfies Prisma.DocumentWhereInput;
export const adminVisibleOnboardingDocumentsWhere = {} satisfies Prisma.VendorDocumentWhereInput;

type DocumentRecord = { id: string };

export type VendorDocumentSources<
  TProfile extends DocumentRecord,
  TOnboarding extends DocumentRecord,
> = {
  profile: readonly TProfile[];
  onboarding: readonly TOnboarding[];
};

/**
 * Current admin-visible documents are the unique underlying profile and
 * onboarding records. Verification submission rows only reference these
 * records and must not increase the current-document count.
 */
export function aggregateVendorDocuments<
  TProfile extends DocumentRecord,
  TOnboarding extends DocumentRecord,
>({ profile, onboarding }: VendorDocumentSources<TProfile, TOnboarding>) {
  const seen = new Set<string>();
  const documents: Array<
    | { source: "profile"; document: TProfile }
    | { source: "onboarding"; document: TOnboarding }
  > = [];

  for (const document of profile) {
    const key = `profile:${document.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    documents.push({ source: "profile", document });
  }
  for (const document of onboarding) {
    const key = `onboarding:${document.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    documents.push({ source: "onboarding", document });
  }

  return documents;
}

export function countVendorDocuments(input: {
  profile: number | null | undefined;
  onboarding: number | null | undefined;
}) {
  return Math.max(0, input.profile ?? 0) + Math.max(0, input.onboarding ?? 0);
}

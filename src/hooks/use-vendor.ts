"use client";

// Authenticated vendor hook → reads from VendorDataProvider (no duplicate fetches)
export { useVendorData as useVendor } from "@/providers/VendorDataProvider";

// Public stores hook → standalone (used on public pages outside the provider)
export { usePublicStores } from "@/providers/VendorDataProvider";
import VendorProductsClient from "./VendorProductsClient";

// This client-fetched catalogue page has its own loading UI and is not yet
// structured as an instant-navigation segment.
export const instant = false;

export default function VendorProductsPage() {
  return <VendorProductsClient />;
}

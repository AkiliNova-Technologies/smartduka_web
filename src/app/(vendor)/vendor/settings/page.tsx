import VendorSettingsClient from "./VendorSettingsClient";

// Settings loads its profile and tab content on the client.
export const instant = false;

export default function VendorSettingsPage() {
  return <VendorSettingsClient />;
}

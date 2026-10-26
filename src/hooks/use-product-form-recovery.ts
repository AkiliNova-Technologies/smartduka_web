"use client";

import * as React from "react";

export type ProductRecoveryEnvelope<T> = {
  version: 1;
  vendorId: string;
  scope: string;
  savedAt: string;
  value: T;
};

export function productRecoveryKey(vendorId: string, scope: string) {
  return `mwezora:product-recovery:v1:${vendorId}:${scope}`;
}

export function readProductRecovery<T>(storage: Pick<Storage, "getItem">, vendorId: string, scope: string) {
  try {
    const raw = storage.getItem(productRecoveryKey(vendorId, scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProductRecoveryEnvelope<T>;
    if (parsed.version !== 1 || parsed.vendorId !== vendorId || parsed.scope !== scope || !parsed.savedAt || parsed.value === undefined) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useProductFormRecovery<T>({ vendorId, scope, value, enabled, serverUpdatedAt }: {
  vendorId?: string;
  scope: string;
  value: T;
  enabled: boolean;
  serverUpdatedAt?: string;
}) {
  const [recovery, setRecovery] = React.useState<ProductRecoveryEnvelope<T> | null>(null);
  const [localSavedAt, setLocalSavedAt] = React.useState<string | null>(null);
  const initialized = React.useRef(false);
  const reconciledValue = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!vendorId || !enabled || initialized.current) return;
    initialized.current = true;
    const candidate = readProductRecovery<T>(window.localStorage, vendorId, scope);
    if (candidate && (!serverUpdatedAt || new Date(candidate.savedAt) > new Date(serverUpdatedAt))) queueMicrotask(() => setRecovery(candidate));
    else if (candidate) window.localStorage.removeItem(productRecoveryKey(vendorId, scope));
  }, [enabled, scope, serverUpdatedAt, vendorId]);

  React.useEffect(() => {
    if (!vendorId || !enabled || recovery || reconciledValue.current === JSON.stringify(value)) return;
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      const envelope: ProductRecoveryEnvelope<T> = { version: 1, vendorId, scope, savedAt, value };
      try {
        window.localStorage.setItem(productRecoveryKey(vendorId, scope), JSON.stringify(envelope));
        setLocalSavedAt(savedAt);
      } catch {
        // The backend draft remains authoritative when storage is unavailable.
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [enabled, recovery, scope, value, vendorId]);

  const clear = React.useCallback(() => {
    if (vendorId) window.localStorage.removeItem(productRecoveryKey(vendorId, scope));
    reconciledValue.current = JSON.stringify(value);
    setRecovery(null);
    setLocalSavedAt(null);
  }, [scope, value, vendorId]);

  return { recovery, clear, localSavedAt, dismissRecovery: () => setRecovery(null) };
}

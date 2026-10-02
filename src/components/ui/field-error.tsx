import * as React from "react";

export function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null;
  return <p id={id} role="alert" className="text-xs text-destructive">{children}</p>;
}

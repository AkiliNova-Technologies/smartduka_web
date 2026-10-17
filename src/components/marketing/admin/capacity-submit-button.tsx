"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CapacitySubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="mt-4 rounded-full" type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 aria-hidden="true" className="animate-spin" />
          Saving…
        </>
      ) : (
        "Save capacity"
      )}
    </Button>
  );
}

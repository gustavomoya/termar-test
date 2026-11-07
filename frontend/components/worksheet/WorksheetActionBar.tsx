"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWorksheetStore } from "@/lib/stores/worksheetStore";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/worksheet/styles";

interface WorksheetActionBarProps {
  readOnly: boolean;
}

export function WorksheetActionBar({ readOnly }: WorksheetActionBarProps) {
  const router = useRouter();
  const finish = useWorksheetStore((state) => state.finish);
  const flush = useWorksheetStore((state) => state.flush);
  const [busy, setBusy] = useState(false);

  const handleBack = async () => {
    setBusy(true);
    const saved = await flush();
    if (saved) {
      // Clear the busy flag before leaving: the App Router can restore this
      // route from its client cache with the component state intact.
      setBusy(false);
      router.push("/");
    } else {
      setBusy(false);
    }
  };

  const handleFinish = async () => {
    setBusy(true);
    const result = await finish();

    if (!result.ok) {
      setBusy(false);
      return;
    }

    setBusy(false);
    router.push("/");
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface shadow-[0_-2px_12px_rgba(16,24,40,0.08)]">
      <div className="mx-auto flex w-full max-w-[880px] gap-2 p-4">
        <button
          type="button"
          disabled={busy}
          onClick={handleBack}
          className={secondaryButtonClass}
        >
          Back to today
        </button>
        {!readOnly && (
          <button
            type="button"
            disabled={busy}
            onClick={handleFinish}
            className={`${primaryButtonClass} flex-1`}
          >
            Finish job
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ApiError } from "@/lib/api/client";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useWorksheetStore } from "@/lib/stores/worksheetStore";
import { PageContainer } from "@/components/layout/PageContainer";
import { WorksheetHeader } from "@/components/worksheet/WorksheetHeader";
import { WorksheetLoading } from "@/components/worksheet/WorksheetLoading";
import { TimerSection } from "@/components/worksheet/TimerSection";
import { ChecklistSection } from "@/components/worksheet/ChecklistSection";
import { PartsSection } from "@/components/worksheet/PartsSection";
import { PhotosSection } from "@/components/worksheet/PhotosSection";
import { SignatureSection } from "@/components/worksheet/SignatureSection";
import { WorksheetActionBar } from "@/components/worksheet/WorksheetActionBar";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/worksheet/styles";

interface WorksheetScreenProps {
  jobId: string;
}

export function WorksheetScreen({ jobId }: WorksheetScreenProps) {
  const online = useOnlineStatus();

  const job = useWorksheetStore((state) => state.job);
  const template = useWorksheetStore((state) => state.template);
  const draft = useWorksheetStore((state) => state.draft);
  const readOnly = useWorksheetStore((state) => state.readOnly);
  const loading = useWorksheetStore((state) => state.loading);
  const error = useWorksheetStore((state) => state.error);
  const saveErrorMessage = useWorksheetStore(
    (state) => state.saveErrorMessage,
  );
  const finishErrors = useWorksheetStore((state) => state.finishErrors);
  const lastSavedAt = useWorksheetStore((state) => state.lastSavedAt);
  const hydrate = useWorksheetStore((state) => state.hydrate);

  const hydratedFor = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (hydratedFor.current === jobId) return;
    hydratedFor.current = jobId;
    void hydrate(jobId);
  }, [jobId, hydrate]);

  // Prevent leaving the worksheet page while there is a not-yet-persisted change
  // or an explicit unload, so work is never lost between jobs
  useEffect(() => {
    const flush = () => void useWorksheetStore.getState().flush();
    const handler = (event: BeforeUnloadEvent) => {
      const store = useWorksheetStore.getState();
      if (!store.draft || store.readOnly) return;

      // save what is pending before the browser leaves.
      flush();

      if (store.hasUnsavedChanges() || store.saveError !== undefined) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        void useWorksheetStore.getState().flush();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (loading) {
    return <WorksheetLoading />;
  }

  if (error) {
    const gone = error instanceof ApiError && error.status === 404;
    const message = error instanceof Error ? error.message : String(error);

    return (
      <PageContainer>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-lg font-semibold">
            {gone ? "This job no longer exists at the office." : message}
          </p>
          <p className="max-w-md text-md text-ink-secondary">
            {gone
              ? "Any work saved on this tablet is still here."
              : "Check the connection and try again. Your work is not lost."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {!gone && (
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => void hydrate(jobId)}
              >
                Try again
              </button>
            )}
            <Link href="/" className={secondaryButtonClass}>
              Back to today
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!job || !template || !draft) {
    return null;
  }

  return (
    <PageContainer>
      <WorksheetHeader
        job={job}
        online={online}
        savedAt={lastSavedAt}
        readOnly={readOnly}
      />

      <main key={draft.jobId} className="flex-1 space-y-4 p-4 pb-28">
        <TimerSection />
        <ChecklistSection />
        <PartsSection />
        <PhotosSection />
        <SignatureSection />

        {saveErrorMessage ? (
          <div
            role="alert"
            className="rounded-lg border border-danger-border bg-danger-soft p-4 text-sm font-medium text-danger"
          >
            {saveErrorMessage}
          </div>
        ) : null}

        {finishErrors.length > 0 && (
          <div
            role="alert"
            className="rounded-lg border border-danger-border bg-danger-soft p-4 text-sm text-danger"
          >
            <p className="font-semibold">The job is not ready to finish:</p>
            <ul className="mt-1 list-disc pl-5">
              {finishErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}
      </main>
      <WorksheetActionBar readOnly={readOnly} />
    </PageContainer>
  );
}

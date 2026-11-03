import { PageContainer } from "@/components/layout/PageContainer";

export function WorksheetLoading() {
  return (
    <PageContainer>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <div
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
            aria-hidden="true"
          />
          <p className="mt-3 text-md text-ink-secondary">
            Loading worksheet…
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
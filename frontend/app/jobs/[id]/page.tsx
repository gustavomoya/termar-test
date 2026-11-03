import { Suspense } from "react";
import { WorksheetScreen } from "@/components/worksheet/WorksheetScreen";
import { WorksheetLoading } from "@/components/worksheet/WorksheetLoading";

export default async function WorkSheetPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<WorksheetLoading />}>
      <WorkSheetPageContent params={params} />
    </Suspense>
  );
}

async function WorkSheetPageContent({
  params,
}: {
    params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <WorksheetScreen jobId={id} />;
}

import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[880px] flex-col bg-bg">
      {children}
    </div>
  );
}

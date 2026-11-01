import type { ReactNode } from "react";

interface TodayShellProps {
  children: ReactNode;
}

export function TodayShell({ children }: TodayShellProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[880px] flex-col bg-bg">
      {children}
    </div>
  );
}

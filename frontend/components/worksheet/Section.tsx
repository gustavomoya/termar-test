import type { ReactNode } from "react";

interface SectionProps {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({
  title,
  aside,
  children,
  className = "",
}: SectionProps) {
  return (
    <section
      className={`overflow-hidden rounded-lg border border-border bg-surface shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

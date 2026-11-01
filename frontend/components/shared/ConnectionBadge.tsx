import Link from "next/link";

interface ConnectionBadgeProps {
  online: boolean;
}

export function ConnectionBadge({ online }: ConnectionBadgeProps) {
  return (
    <Link
      href="/sync"
      className={`inline-flex min-h-[48px] items-center gap-2 rounded-full border px-3 font-semibold text-sm ${
        online
          ? "border-success-border bg-success-soft text-success"
          : "border-warning-border bg-warning-soft text-warning"
      }`}
    >
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
      {online ? "Online" : "No signal"}
    </Link>
  );
}

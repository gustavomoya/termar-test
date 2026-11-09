import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  description: "The app is offline and this screen was not saved yet.",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6 py-10">
      <section className="w-full max-w-[520px] rounded-xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          No signal
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink">
          This screen is not available offline
        </h1>
        <p className="mt-3 text-md leading-relaxed text-ink-secondary">
          The pages you opened while connected are still available. Your saved
          work remains on this tablet and will be sent when the connection is
          back.
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full navigation works with the cached app shell */}
        <a
          href="/"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-5 text-base font-semibold text-ink-inverse transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Go to today
        </a>
      </section>
    </main>
  );
}

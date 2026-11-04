"use client";

import { useState } from "react";
import { useWorksheetStore } from "@/lib/stores/worksheetStore";
import { Section } from "@/components/worksheet/Section";
import { inputClass } from "@/components/worksheet/styles";

export function PartsSection() {
  const stock = useWorksheetStore((state) => state.stock);
  const stockUsage = useWorksheetStore((state) => state.stockUsage);
  const draft = useWorksheetStore((state) => state.draft);
  const readOnly = useWorksheetStore((state) => state.readOnly);
  const addPart = useWorksheetStore((state) => state.addPart);
  const decrementPart = useWorksheetStore((state) => state.decrementPart);

  const [query, setQuery] = useState("");

  if (!draft) return null;

  const term = query.trim().toLowerCase();
  const filtered = term
    ? stock.filter(
        (item) =>
          item.label.toLowerCase().includes(term) ||
          item.sku.toLowerCase().includes(term),
      )
    : stock;

  const quantityFor = (sku: string) =>
    draft.parts.find((part) => part.sku === sku)?.quantity ?? 0;

  return (
    <Section
      title="Parts used"
      aside={
        <span className="text-sm text-ink-secondary">
          {draft.parts.length} selected
        </span>
      }
    >
      <div className="border-b border-border p-4">
        <label className="block">
          <span className="sr-only">Search stock</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search stock by name or code"
            className={inputClass}
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="p-4 text-md text-ink-secondary">
          No parts match “{query.trim()}”.
        </p>
      ) : (
        <ul>
          {filtered.map((item) => {
            const available = item.onVan - (stockUsage[item.sku] ?? 0);
            const quantity = quantityFor(item.sku);

            return (
              <li
                key={item.sku}
                className="flex items-center gap-3 border-b border-border p-4 last:border-b-0"
              >
                <div className="min-w-0 grow">
                  <div className="text-base font-medium">{item.label}</div>
                  <div className="text-sm text-ink-secondary">
                    {item.sku} · {available} {item.unit} on van
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Remove one ${item.label}`}
                    disabled={readOnly || quantity === 0}
                    onClick={() => decrementPart(item.sku)}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border-strong bg-surface text-xl font-semibold text-ink hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    −
                  </button>
                  <output
                    aria-label={`${item.label} quantity`}
                    className="w-10 text-center text-base font-semibold tabular-nums"
                  >
                    {quantity}
                  </output>
                  <button
                    type="button"
                    aria-label={`Add one ${item.label}`}
                    disabled={readOnly || available <= 0}
                    onClick={() => addPart(item)}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border-strong bg-surface text-xl font-semibold text-ink hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

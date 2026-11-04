"use client";

import { useWorksheetStore } from "@/lib/stores/worksheetStore";
import { answeredCount } from "@/lib/worksheet/validation";
import { Section } from "@/components/worksheet/Section";
import { ChecklistItemRow } from "@/components/worksheet/ChecklistItemRow";

export function ChecklistSection() {
  const template = useWorksheetStore((state) => state.template);
  const draft = useWorksheetStore((state) => state.draft);
  const readOnly = useWorksheetStore((state) => state.readOnly);

  if (!template || !draft) return null;

  const answered = answeredCount(template, draft);
  const total = template.items.length;

  return (
    <Section
      title={template.label || "Checks"}
      aside={
        <span className="text-sm text-ink-secondary">
          {answered} of {total} answered
        </span>
      }
    >
      <div>
        {template.items.map((item, index) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            answer={draft.checks[item.id]}
            number={index + 1}
            total={total}
            readOnly={readOnly}
          />
        ))}
      </div>
    </Section>
  );
}

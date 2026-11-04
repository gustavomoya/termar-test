"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useWorksheetStore } from "@/lib/stores/worksheetStore";
import { nowLocalIso } from "@/lib/time";
import { formatTime } from "@/lib/today";
import { Section } from "@/components/worksheet/Section";
import {
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/worksheet/styles";

export function SignatureSection() {
  const signature = useWorksheetStore((state) => state.draft?.signature);
  const readOnly = useWorksheetStore((state) => state.readOnly);
  const setSignature = useWorksheetStore((state) => state.setSignature);
  const clearSignature = useWorksheetStore((state) => state.clearSignature);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (signature) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));

    const context = canvas.getContext("2d", {
      alpha: true,
      desynchronized: true,
    });
    if (!context) return;

    context.scale(ratio, ratio);

    // Smooth drawing
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";

    // appearance
    context.strokeStyle = "#16191d";

  }, [signature]);

  const pointFor = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    lastPoint.current = pointFor(event);
    setHasInk(true);
    setError(undefined);
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    if (!drawing.current) return;

    const context = event.currentTarget.getContext("2d");
    if (!context || !lastPoint.current) return;

    const next = pointFor(event);
    context.beginPath();
    context.moveTo(lastPoint.current.x, lastPoint.current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    lastPoint.current = next;
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    lastPoint.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const clearPad = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasInk(false);
    setError(undefined);
  };

  const saveSignature = () => {
    if (!name.trim()) {
      setError("Enter the customer's name.");
      return;
    }
    if (!hasInk) {
      setError("Ask the customer to sign in the box.");
      return;
    }

    const dataUrl = canvasRef.current?.toDataURL("image/png");
    if (!dataUrl) {
      setError("Could not capture the signature. Try again.");
      return;
    }

    setSignature({
      signedBy: name.trim(),
      signedAt: nowLocalIso(),
      dataUrl,
    });
  };

  return (
    <Section
      title="Customer sign-off"
      aside={
        signature ? (
          <span className="rounded-full border border-success-border bg-success-soft px-2.5 py-1 text-sm font-semibold text-success">
            Signed
          </span>
        ) : undefined
      }
    >
      {signature ? (
        <div className="p-4">
          <div className="flex min-h-[120px] items-center justify-center rounded-lg border-2 border-success-border bg-success-soft p-4">
            {signature.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signature.dataUrl}
                alt={`Signature of ${signature.signedBy}`}
                className="max-h-[120px] w-auto"
              />
            ) : (
              <span
                className="text-2xl"
                style={{
                  fontFamily: '"Segoe Script", "Brush Script MT", cursive',
                }}
              >
                {signature.signedBy}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base font-medium">
                {signature.signedBy}
              </div>
              <div className="text-sm text-ink-secondary">
                Signed on this tablet,{" "}
                {new Date(signature.signedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                })}{" "}
                at {formatTime(signature.signedAt)}
              </div>
            </div>
            {!readOnly && (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={clearSignature}
              >
                Sign again
              </button>
            )}
          </div>
        </div>
      ) : readOnly ? (
        <p className="p-4 text-md text-ink-secondary">
          No signature on file for this job.
        </p>
      ) : (
        <div className="space-y-4 p-4">
          <label className="block">
            <span className="text-sm font-medium text-ink-secondary">
              Customer name
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name of the person signing"
              autoComplete="name"
              className={`${inputClass} mt-1`}
            />
          </label>

          <div>
            <div className="text-sm font-medium text-ink-secondary">
              Signature
            </div>
            <canvas
              ref={canvasRef}
              aria-label="Signature pad"
              className="mt-1 h-[180px] w-full touch-none rounded-lg border-2 border-dashed border-border-strong bg-surface"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              Your browser does not support the signature pad.
            </canvas>
            <p className="mt-1 text-sm text-ink-secondary">
              Ask the customer to sign in the box.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={clearPad}
            >
              Clear
            </button>
            <button
              type="button"
              className={primaryButtonClass}
              onClick={saveSignature}
            >
              Save signature
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

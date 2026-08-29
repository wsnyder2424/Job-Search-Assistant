"use client";

import { useRef, useState } from "react";
import type { Frequency } from "@/core";

export interface ExtractedLabel {
  name: string | null;
  directions: string | null;
  frequency: Frequency | null;
  frequencyDescription: string | null;
  petName: string | null;
  confidence: "high" | "medium" | "low";
  notes: string | null;
}

interface Props {
  /** Local clock time used when the label states a rate but no time of day. */
  anchorTime: string;
  onExtracted: (label: ExtractedLabel) => void;
}

/** Photos are downscaled before upload — a 12MP camera shot is far more
 *  detail than label text needs, and it keeps the request fast. */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

export default function PhotoCapture({ anchorTime, onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setMessage(null);
    setIsError(false);

    try {
      const { base64, mediaType } = await downscaleToBase64(file);

      const response = await fetch("/api/extract-medication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType, anchorTime }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not read that photo.");
      }

      if (!payload.extracted) {
        setIsError(false);
        setMessage(payload.reason ?? "Enter the details below.");
        return;
      }

      const label = payload.medication as ExtractedLabel;
      onExtracted(label);
      setMessage(
        label.confidence === "low"
          ? "Read the label, but the photo was hard to make out — please check every field."
          : "Filled in from the label. Check it over before saving.",
      );
    } catch (caught) {
      setIsError(true);
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Could not read that photo — enter the details below.",
      );
    } finally {
      setBusy(false);
      // Allow re-picking the same file after a failed read.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <button
        type="button"
        className="btn-secondary flex items-center justify-center gap-2"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <span aria-hidden>📷</span>
        {busy ? "Reading the label…" : "Take a photo of the label"}
      </button>

      {message && (
        <p
          role="status"
          className={`mt-2.5 rounded-xl px-3.5 py-2.5 text-sm ${
            isError
              ? "bg-[var(--color-bg-error-primary)] text-[var(--color-text-error-primary)]"
              : "bg-[var(--color-bg-brand-primary)] text-[var(--color-text-brand-secondary)]"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Draw the photo to a canvas at a sane size and re-encode as JPEG. Returns raw
 * base64 (no data: prefix) plus the media type the API should be told about.
 */
async function downscaleToBase64(
  file: File,
): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) {
    // No canvas: fall back to sending the original bytes.
    return { base64: await fileToBase64(file), mediaType: file.type || "image/jpeg" };
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return { base64: dataUrl.split(",")[1] ?? "", mediaType: "image/jpeg" };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

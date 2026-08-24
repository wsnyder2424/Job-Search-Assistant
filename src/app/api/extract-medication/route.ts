import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseFrequencyPhrase, spreadAcrossDay, type Frequency } from "@/core";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
/** Vision extraction takes a few seconds; give it room past the default. */
export const maxDuration = 60;

const MODEL = "claude-opus-5";
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

/**
 * What we ask Claude to read off the label. Every field is nullable on
 * purpose: a photo of a crumpled bottle often shows the drug name and nothing
 * else, and a confident guess at a dosing interval is worse than an empty box
 * the user fills in.
 */
const LabelExtraction = z.object({
  name: z
    .string()
    .nullable()
    .describe("The medication's name as printed, e.g. 'Rimadyl' or 'Carprofen 75mg'."),
  directions: z
    .string()
    .nullable()
    .describe(
      "The dosing directions verbatim, e.g. 'Give 1 tablet by mouth every 12 hours with food'.",
    ),
  frequency_phrase: z
    .string()
    .nullable()
    .describe(
      "Just the part of the directions describing how often, e.g. 'every 12 hours' or 'twice daily'.",
    ),
  doses_per_day: z
    .number()
    .int()
    .nullable()
    .describe("Doses in 24 hours, if stated or directly implied. Null if unclear."),
  interval_hours: z
    .number()
    .nullable()
    .describe("Hours between doses, if the label gives an interval. Null otherwise."),
  pet_name: z
    .string()
    .nullable()
    .describe("The patient/pet name on the label, if printed."),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("How legible the label was overall."),
  notes: z
    .string()
    .nullable()
    .describe("Anything relevant that did not fit the fields above, e.g. 'give with food'."),
});

const SYSTEM_PROMPT = [
  "You read veterinary medication labels from photographs and return the fields exactly as printed.",
  "",
  "Rules:",
  "- Transcribe only what is visible. Never infer a drug name, strength, or schedule that is not printed.",
  "- If a field is unreadable, obscured, or absent, return null for it. A null is always better than a guess.",
  "- Keep `directions` verbatim, including phrasing like 'with food' or 'for 10 days'.",
  "- Only fill `interval_hours` or `doses_per_day` when the label actually states the frequency.",
  "- Set confidence to 'low' when the image is blurry, cropped, or you are unsure of the drug name.",
].join("\n");

export interface ExtractionResponse {
  /** False when we could not extract anything and the user should type it in. */
  extracted: boolean;
  /** Present when extraction succeeded. */
  medication?: {
    name: string | null;
    directions: string | null;
    frequency: Frequency | null;
    frequencyDescription: string | null;
    petName: string | null;
    confidence: "high" | "medium" | "low";
    notes: string | null;
  };
  /** Why extraction did not happen — shown as a hint above the manual form. */
  reason?: string;
}

function manualEntry(reason: string, status = 200) {
  return NextResponse.json<ExtractionResponse>({ extracted: false, reason }, { status });
}

export async function POST(request: Request) {
  // Extraction burns tokens, so it is for signed-in users only.
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return manualEntry(
      "Photo reading is not configured on this server — enter the details below.",
    );
  }

  let body: { imageBase64?: unknown; mediaType?: unknown; anchorTime?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const imageBase64 =
    typeof body.imageBase64 === "string"
      ? body.imageBase64.replace(/^data:[^;]+;base64,/, "")
      : null;
  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }

  const mediaType = SUPPORTED_MEDIA_TYPES.includes(body.mediaType as SupportedMediaType)
    ? (body.mediaType as SupportedMediaType)
    : "image/jpeg";

  // base64 inflates by ~4/3; check the decoded size.
  if ((imageBase64.length * 3) / 4 > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "That photo is too large — try one under 6MB." },
      { status: 413 },
    );
  }

  const anchorTime =
    typeof body.anchorTime === "string" && /^\d{1,2}:\d{2}$/.test(body.anchorTime)
      ? body.anchorTime
      : "08:00";

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(LabelExtraction) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            {
              type: "text",
              text: "Read this veterinary medication label and return the fields. Use null for anything you cannot read.",
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return manualEntry("Couldn't read that photo — enter the details below.");
    }

    const parsed = response.parsed_output;
    if (!parsed) {
      return manualEntry("Couldn't read that photo — enter the details below.");
    }

    const frequency = deriveFrequency(parsed, anchorTime);

    return NextResponse.json<ExtractionResponse>({
      extracted: true,
      medication: {
        name: parsed.name,
        directions: parsed.directions,
        frequency,
        frequencyDescription: parsed.frequency_phrase,
        petName: parsed.pet_name,
        confidence: parsed.confidence,
        notes: parsed.notes,
      },
    });
  } catch (error) {
    // Never fail the onboarding flow over this — the manual form still works.
    console.error("Label extraction failed:", error);
    if (error instanceof Anthropic.APIError && error.status === 401) {
      return manualEntry("Photo reading is not configured correctly on this server.");
    }
    return manualEntry("Couldn't read that photo just now — enter the details below.");
  }
}

/**
 * Turn the label's frequency fields into the app's `Frequency` union.
 * An explicit interval wins over a dose count, and the free-text phrase is the
 * last resort. Returns null when the label never stated a schedule, which
 * leaves the user to pick one rather than inheriting a wrong default.
 */
function deriveFrequency(
  parsed: z.infer<typeof LabelExtraction>,
  anchorTime: string,
): Frequency | null {
  if (parsed.interval_hours && parsed.interval_hours > 0) {
    return { kind: "interval_hours", hours: parsed.interval_hours };
  }

  if (
    parsed.doses_per_day &&
    parsed.doses_per_day > 0 &&
    parsed.doses_per_day <= 12
  ) {
    return { kind: "daily_at", times: spreadAcrossDay(anchorTime, parsed.doses_per_day) };
  }

  const phrase = parsed.frequency_phrase ?? parsed.directions;
  return phrase ? parseFrequencyPhrase(phrase, anchorTime) : null;
}

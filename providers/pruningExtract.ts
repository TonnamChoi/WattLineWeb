import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import { ExtractParams, Provider } from "./types.js";
import { PruningExtractionResult } from "./pruningTypes.js";
import { PRUNING_EXTRACTION_INSTRUCTION } from "./pruningPrompt.js";

async function extractPruningWithClaude({
  apiKey,
  base64Data,
  mimeType,
}: ExtractParams): Promise<PruningExtractionResult> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    output_config: { effort: "low" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64Data,
            },
          },
          {
            type: "text",
            text: PRUNING_EXTRACTION_INSTRUCTION,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  if (!textBlock) {
    throw new Error("Claude 응답이 비어 있습니다.");
  }

  const jsonText = textBlock.text.trim().replace(/^```(?:json)?\s*|```\s*$/g, "");

  try {
    return JSON.parse(jsonText) as PruningExtractionResult;
  } catch {
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(jsonText.slice(start, end + 1)) as PruningExtractionResult;
      } catch {
        // fall through to the error below
      }
    }
    throw new Error("Claude 응답을 해석할 수 없습니다.");
  }
}

const diameterCountsSchema = {
  type: Type.OBJECT,
  nullable: true,
  properties: {
    under10: { type: Type.INTEGER },
    over10: { type: Type.INTEGER },
    over20: { type: Type.INTEGER },
    over30: { type: Type.INTEGER },
    over40: { type: Type.INTEGER },
    total: { type: Type.INTEGER },
  },
  required: ["under10", "over10", "over20", "over30", "over40", "total"],
};

async function extractPruningWithGemini({
  apiKey,
  base64Data,
  mimeType,
}: ExtractParams): Promise<PruningExtractionResult> {
  const ai = new GoogleGenAI({ apiKey });

  const imagePart = {
    inlineData: {
      mimeType,
      data: base64Data,
    },
  };

  const textPart = { text: PRUNING_EXTRACTION_INSTRUCTION };

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          poleStart: { type: Type.STRING, nullable: true },
          poleEnd: { type: Type.STRING, nullable: true },
          treeSpecies: { type: Type.STRING, nullable: true },
          diameterCounts: diameterCountsSchema,
          note: { type: Type.STRING, nullable: true },
          workIntensity: { type: Type.STRING, nullable: true },
          treeClassification: { type: Type.STRING, nullable: true },
          spanDescription: { type: Type.STRING, nullable: true },
          workContent: { type: Type.STRING, nullable: true },
          confidence: { type: Type.INTEGER },
          reasoning: { type: Type.STRING, nullable: true },
          boundingBox: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER },
              width: { type: Type.NUMBER },
              height: { type: Type.NUMBER },
            },
            required: ["x", "y", "width", "height"],
          },
        },
        required: ["treeSpecies", "diameterCounts", "confidence"],
      },
    },
  });

  const resultText = response.text;
  if (!resultText) {
    throw new Error("Gemini 응답이 비어 있습니다.");
  }

  return JSON.parse(resultText.trim()) as PruningExtractionResult;
}

async function extractPruningWithOpenAI({
  apiKey,
  base64Data,
  mimeType,
}: ExtractParams): Promise<PruningExtractionResult> {
  const client = new OpenAI({ apiKey });

  const response = await client.responses.create({
    model: "gpt-6-astra",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: PRUNING_EXTRACTION_INSTRUCTION },
          {
            type: "input_image",
            image_url: `data:${mimeType};base64,${base64Data}`,
            detail: "auto",
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "pruning_extraction",
        schema: {
          type: "object",
          properties: {
            poleStart: { type: ["string", "null"] },
            poleEnd: { type: ["string", "null"] },
            treeSpecies: { type: ["string", "null"] },
            diameterCounts: {
              type: ["object", "null"],
              properties: {
                under10: { type: "integer" },
                over10: { type: "integer" },
                over20: { type: "integer" },
                over30: { type: "integer" },
                over40: { type: "integer" },
                total: { type: "integer" },
              },
              required: ["under10", "over10", "over20", "over30", "over40", "total"],
              additionalProperties: false,
            },
            note: { type: ["string", "null"] },
            workIntensity: { type: ["string", "null"] },
            treeClassification: { type: ["string", "null"] },
            spanDescription: { type: ["string", "null"] },
            workContent: { type: ["string", "null"] },
            confidence: { type: "integer" },
            reasoning: { type: ["string", "null"] },
            boundingBox: {
              type: ["object", "null"],
              properties: {
                x: { type: "number" },
                y: { type: "number" },
                width: { type: "number" },
                height: { type: "number" },
              },
              required: ["x", "y", "width", "height"],
              additionalProperties: false,
            },
          },
          required: [
            "poleStart",
            "poleEnd",
            "treeSpecies",
            "diameterCounts",
            "note",
            "workIntensity",
            "treeClassification",
            "spanDescription",
            "workContent",
            "confidence",
            "reasoning",
            "boundingBox",
          ],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });

  if (!response.output_text) {
    throw new Error("OpenAI 응답이 비어 있습니다.");
  }

  return JSON.parse(response.output_text) as PruningExtractionResult;
}

export async function extractPruning(
  provider: Provider,
  params: ExtractParams
): Promise<PruningExtractionResult> {
  switch (provider) {
    case "gemini":
      return extractPruningWithGemini(params);
    case "claude":
      return extractPruningWithClaude(params);
    case "openai":
      return extractPruningWithOpenAI(params);
  }
}

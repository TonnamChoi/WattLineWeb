import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import { ExtractParams, Provider } from "./types.js";

// 흉고직경 사진(줄자·자·캘리퍼스로 나무 줄기 굵기를 재는 사진)에서 cm 값을 읽는다.
export interface DiameterExtractionResult {
  diameterCm: number | null; // 읽은 흉고직경(cm). 판독할 수 없으면 null
  readable: boolean; // 측정값을 읽을 수 있었는지
  confidence: number; // 0~100
  reasoning: string | null;
}

export const DIAMETER_EXTRACTION_INSTRUCTION = `전송된 사진은 배전선로 수목전지 작업 현장에서 나무의 흉고직경(가슴높이 줄기 굵기)을 재는 사진입니다.
사진 속 줄자·자·캘리퍼스·표지판 등에 표시된 측정값을 읽어 나무 줄기의 직경을 cm 단위 숫자로 알려주세요.

- 줄자로 둘레(원주)를 잰 사진이 분명하면 직경 = 둘레 ÷ 3.14 로 환산하고, reasoning에 "둘레 N cm를 직경으로 환산"이라고 적으세요.
- 측정 도구가 없거나 눈금·숫자를 읽을 수 없으면 추측하지 말고 diameterCm은 null, readable은 false로 하세요.
- confidence: 판독 신뢰도(0~100 정수).
- reasoning: 어디서 어떤 값을 읽었는지 한국어로 간단히.

다음 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON 객체만):
{ "diameterCm": number | null, "readable": boolean, "confidence": number, "reasoning": string | null }`;

async function withClaude({ apiKey, base64Data, mimeType }: ExtractParams): Promise<DiameterExtractionResult> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 512,
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
          { type: "text", text: DIAMETER_EXTRACTION_INSTRUCTION },
        ],
      },
    ],
  });
  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock) throw new Error("Claude 응답이 비어 있습니다.");
  const text = textBlock.text.trim().replace(/^```(?:json)?\s*|```\s*$/g, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Claude 응답을 해석할 수 없습니다.");
  return JSON.parse(text.slice(start, end + 1)) as DiameterExtractionResult;
}

async function withGemini({ apiKey, base64Data, mimeType }: ExtractParams): Promise<DiameterExtractionResult> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: DIAMETER_EXTRACTION_INSTRUCTION }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          diameterCm: { type: Type.NUMBER, nullable: true },
          readable: { type: Type.BOOLEAN },
          confidence: { type: Type.INTEGER },
          reasoning: { type: Type.STRING, nullable: true },
        },
        required: ["diameterCm", "readable", "confidence"],
      },
    },
  });
  if (!response.text) throw new Error("Gemini 응답이 비어 있습니다.");
  return JSON.parse(response.text.trim()) as DiameterExtractionResult;
}

async function withOpenAI({ apiKey, base64Data, mimeType }: ExtractParams): Promise<DiameterExtractionResult> {
  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: "gpt-6-astra",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: DIAMETER_EXTRACTION_INSTRUCTION },
          { type: "input_image", image_url: `data:${mimeType};base64,${base64Data}`, detail: "auto" },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "diameter_extraction",
        schema: {
          type: "object",
          properties: {
            diameterCm: { type: ["number", "null"] },
            readable: { type: "boolean" },
            confidence: { type: "integer" },
            reasoning: { type: ["string", "null"] },
          },
          required: ["diameterCm", "readable", "confidence", "reasoning"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });
  if (!response.output_text) throw new Error("OpenAI 응답이 비어 있습니다.");
  return JSON.parse(response.output_text) as DiameterExtractionResult;
}

export async function extractDiameter(provider: Provider, params: ExtractParams): Promise<DiameterExtractionResult> {
  switch (provider) {
    case "gemini":
      return withGemini(params);
    case "claude":
      return withClaude(params);
    case "openai":
      return withOpenAI(params);
  }
}

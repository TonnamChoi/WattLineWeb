import { extractPruning } from "./pruningExtract.js";
import type { PruningExtractionResult } from "./pruningTypes.js";
import type { BoundingBox, Provider } from "./types.js";

const VALID_PROVIDERS: Provider[] = ["gemini", "claude", "openai"];

export interface PruningExtractRequestResult {
  status: number;
  body: unknown;
}

// Some providers omit boundingBox entirely or return malformed values; normalize to a
// valid box within [0,1] or null so the client can safely crop without extra checks.
function normalizeBoundingBox(box: unknown): BoundingBox | null {
  if (!box || typeof box !== "object") return null;
  const { x, y, width, height } = box as Record<string, unknown>;
  if (
    typeof x !== "number" || typeof y !== "number" ||
    typeof width !== "number" || typeof height !== "number" ||
    !Number.isFinite(x) || !Number.isFinite(y) ||
    !Number.isFinite(width) || !Number.isFinite(height) ||
    width <= 0 || height <= 0
  ) {
    return null;
  }
  const clampedX = Math.min(Math.max(x, 0), 1);
  const clampedY = Math.min(Math.max(y, 0), 1);
  return {
    x: clampedX,
    y: clampedY,
    width: Math.min(Math.max(width, 0), 1 - clampedX),
    height: Math.min(Math.max(height, 0), 1 - clampedY),
  };
}

export async function handlePruningExtractRequest(body: any): Promise<PruningExtractRequestResult> {
  const { provider, apiKey, image, mimeType } = body ?? {};

  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return { status: 400, body: { error: "지원하지 않는 프로바이더입니다." } };
  }
  if (!apiKey) {
    return { status: 400, body: { error: "API 키가 없습니다. 설정에서 API 키를 입력하세요." } };
  }
  if (!image) {
    return { status: 400, body: { error: "이미지 데이터가 없습니다." } };
  }

  try {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const result = await extractPruning(provider as Provider, {
      apiKey,
      base64Data,
      mimeType: mimeType || "image/jpeg",
    });

    const body: PruningExtractionResult = {
      ...result,
      boundingBox: normalizeBoundingBox(result.boundingBox),
    };

    return { status: 200, body };
  } catch (error: any) {
    console.error("Pruning Extraction Error:", error);

    const errorMessage = typeof error.message === "string" ? error.message : "";
    const isAuthError =
      error.status === 401 ||
      error.status === 403 ||
      errorMessage.includes("API_KEY_INVALID") ||
      errorMessage.includes("API key not valid");

    if (isAuthError) {
      return { status: 401, body: { error: "API 키가 올바르지 않습니다. 설정을 확인하세요." } };
    }
    if (error.status === 429) {
      return { status: 429, body: { error: "요청 한도를 초과했습니다. 잠시 후 다시 시도하세요." } };
    }

    const isOverloadedError =
      error.status === 503 ||
      errorMessage.includes("UNAVAILABLE") ||
      errorMessage.includes("overloaded") ||
      errorMessage.includes("high demand");

    if (isOverloadedError) {
      return { status: 503, body: { error: "AI 서버가 일시적으로 요청 폭주 상태입니다. 잠시 후 다시 시도하세요." } };
    }

    return { status: 500, body: { error: error.message || "분석 중 오류가 발생했습니다." } };
  }
}

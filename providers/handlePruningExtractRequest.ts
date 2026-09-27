import { extractPruning } from "./pruningExtract.js";
import { extractDiameter } from "./diameterExtract.js";
import { ImageLoadError, loadImageAsBase64 } from "./loadImage.js";
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
  // mode: "diameter"면 흉고직경 사진에서 cm만 읽는다. 없으면 기존 전지작업 전체 분석.
  const { provider, apiKey, image, mimeType, mode } = body ?? {};

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
    const loaded = await loadImageAsBase64(image, mimeType);

    if (mode === "diameter") {
      const diameter = await extractDiameter(provider as Provider, { apiKey, base64Data: loaded.base64Data, mimeType: loaded.mimeType });
      return { status: 200, body: diameter };
    }

    const result = await extractPruning(provider as Provider, {
      apiKey,
      base64Data: loaded.base64Data,
      mimeType: loaded.mimeType,
    });

    const body: PruningExtractionResult = {
      ...result,
      boundingBox: normalizeBoundingBox(result.boundingBox),
    };

    return { status: 200, body };
  } catch (error: any) {
    console.error("Pruning Extraction Error:", error);

    // 사진 불러오기 단계의 오류만 그대로 전달한다 (AI 프로바이더 오류는 아래에서 처리).
    if (error instanceof ImageLoadError) {
      return { status: error.status, body: { error: error.message } };
    }

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

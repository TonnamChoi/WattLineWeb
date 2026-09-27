export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedInfo {
  lineName: string | null;
  computerizedNumber: string | null;
  lineNumber: string | null;
  confidence: number | null;
  extraInfo: string | null;
  reasoning: string | null;
  boundingBox: BoundingBox | null;
}

export interface PoleImage {
  id: string;
  name: string;
  url: string; // Base64 data URL or Object URL
  mimeType: string;
  status: "idle" | "processing" | "completed" | "failed";
  error: string | null;
  lineName: string | null;
  computerizedNumber: string | null;
  lineNumber: string | null;
  confidence: number | null;
  extraInfo: string | null;
  reasoning: string | null;
  boundingBox: BoundingBox | null;
  isSample: boolean;
  uploadedAt: string;
}

export interface DiameterCounts {
  under10: number;
  over10: number;
  over20: number;
  over30: number;
  over40: number;
  total: number;
}

export type WattlineCategory = "시작전주" | "종료전주" | "작업전" | "흉고직경" | "작업후" | "기타";

// 분류 칸 사진 한 장의 분석 상태 (분석 시작 시 시작전주·종료전주·흉고직경 사진만 분석)
export interface PhotoAnalysis {
  status: "processing" | "completed" | "failed" | "unreadable";
  message: string | null; // 완료: 읽은 값, 에러·판독불가: 사유 (라벨 클릭 시 팝업)
  // 완료된 사진의 판독값 (재분석 때 다시 분석하지 않고 표 반영에 재사용)
  value?: string; // 시작·종료전주: 전주번호
  diameterCm?: number; // 흉고직경
  confidence?: number;
}

export interface PruningRecord {
  id: string;
  name: string;
  url: string; // 대표 사진 (Blob public URL 또는 업로드 중 임시 dataURL)
  mimeType: string;
  status: "idle" | "processing" | "completed" | "failed";
  error: string | null;

  // WattLine(모바일 촬영 앱) DB에서 불러온 작업 건인 경우, 분류별 사진 URL 목록(촬영 순). 수동 업로드 사진에는 없음.
  wattlineCategoryPhotos?: Partial<Record<WattlineCategory, string[]>>;
  // 위 사진 URL → photo_uploads.id (삭제할 때 사용)
  wattlinePhotoIds?: Record<string, string>;
  // 사진 URL → 분석 상태
  photoAnalysis?: Record<string, PhotoAnalysis>;

  poleStart: string | null;
  poleEnd: string | null;
  treeSpecies: string | null;
  diameterCounts: DiameterCounts | null;
  note: string | null;
  workIntensity: string | null;
  treeClassification: string | null;
  spanDescription: string | null;
  workContent: string | null;
  confidence: number | null;
  reasoning: string | null;
  boundingBox: BoundingBox | null;

  extraPhotoUrls: string[];
  uploadedAt: string;
}

// 작업강도 선택지 (기본: 약전지)
export const WORK_INTENSITY_OPTIONS = ["약전지", "강전지", "순치기", "벌목"];
export const DEFAULT_WORK_INTENSITY = "약전지";

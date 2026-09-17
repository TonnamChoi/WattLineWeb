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

export interface PruningRecord {
  id: string;
  name: string;
  url: string; // 대표 사진 (Blob public URL 또는 업로드 중 임시 dataURL)
  mimeType: string;
  status: "idle" | "processing" | "completed" | "failed";
  error: string | null;

  // WattLine(모바일 촬영 앱) DB에서 불러온 작업 건인 경우, 분류별 사진 URL. 수동 업로드 사진에는 없음.
  wattlineCategoryPhotos?: Partial<Record<WattlineCategory, string>>;

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

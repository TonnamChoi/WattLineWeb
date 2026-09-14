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

export interface PruningRecord {
  id: string;
  name: string;
  url: string; // 대표 사진 (Blob public URL 또는 업로드 중 임시 dataURL)
  mimeType: string;
  status: "idle" | "processing" | "completed" | "failed";
  error: string | null;

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

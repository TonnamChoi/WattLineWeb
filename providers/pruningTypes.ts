import { BoundingBox } from "./types.js";

export interface DiameterCounts {
  under10: number;
  over10: number;
  over20: number;
  over30: number;
  over40: number;
  total: number;
}

export interface PruningExtractionResult {
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
}

import React, { useEffect, useRef, useState } from "react";
import { Upload, AlertCircle, Loader2, Trash2, X, ZoomIn } from "lucide-react";
import { resizeImageFile } from "../lib/resizeImage";
import { runWithConcurrency } from "../lib/asyncQueue";
import { AppSettings, ProviderId } from "../lib/settings";
import { DEFAULT_WORK_INTENSITY, DiameterCounts, PhotoAnalysis, PruningRecord, WattlineCategory } from "../types";
import { authHeaders } from "../lib/auth";
import PruningDetail from "./PruningDetail";
import PruningTable, { UPLOAD_DRAG_TYPE } from "./PruningTable";

interface PruningWorkProps {
  settings: AppSettings;
  onNeedSettings: () => void;
  workplaceId: string | null;
  onChangeWorkplace: (id: string | null) => void;
}

interface UploadedPhoto {
  url: string; // signed URL (업로드 중에는 미리보기용 dataURL)
  pathname: string; // Storage 경로 (삭제 시 식별자)
  uploadedAt: string;
  uploading?: boolean;
  moving?: boolean; // 분류 칸으로 옮기는 중
}

interface WorkplaceOption {
  id: string;
  name: string;
  is_completed: boolean;
  company: { name: string } | null;
}

const ANALYSIS_CONCURRENCY = 5;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 촬영일(YYYYMMDD) 모음을 "20260917~20260926" 또는 하루면 "20260926"으로 표시한다.
function formatDateRange(dates: Set<string>) {
  const sorted = Array.from(dates).sort();
  return sorted.length > 1 ? `${sorted[0]}~${sorted[sorted.length - 1]}` : sorted[0] || "";
}

// AI 분석 API 호출 (429·5xx는 잠시 후 재시도). endpoint: /api/extract(번호찰) 또는 /api/pruning-extract
async function postAnalysisWithRetry(endpoint: string, body: Record<string, unknown>) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data) return data;
    const message = data?.error || `서버 응답 오류가 발생했습니다 (${response.status}).`;
    if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) throw new Error(message);
    await sleep(RETRY_BASE_DELAY_MS * attempt + Math.random() * 500);
  }
  throw new Error("분석에 실패했습니다.");
}

// DB(pruning_results)에 저장된 전지작업 결과
interface SavedPruningResult {
  pole_start: string | null;
  pole_end: string | null;
  tree_species: string | null;
  dia_under10: number;
  dia_over10: number;
  dia_over20: number;
  dia_over30: number;
  dia_over40: number;
  dia_total: number;
  note: string | null;
  work_intensity: string | null;
  tree_classification: string | null;
  span_description: string | null;
  work_content: string | null;
  confidence: number | null;
  reasoning: string | null;
  photo_analysis: Record<string, PhotoAnalysis>; // photo_uploads.id → 분석 상태
  photo_order?: Record<string, string[]>; // 분류 → photo_uploads.id 순서
}

// 저장된 결과를 앱 사진 행에 입힌다. 사진별 분석 상태는 photo_uploads.id를 현재 사진 URL로 바꿔 복원한다.
// 저장할 값(pruning_results 한 줄). 사진 URL은 매번 바뀌므로 photo_uploads.id 기준으로 저장하고, 분석중인 사진은 뺀다.
// 저장 버튼 색(저장할 내용 있음) 판단에도 같은 값을 비교하므로, 순서가 늘 같도록 사진 id를 정렬한다.
function buildSavePayload(r: PruningRecord) {
  const photoAnalysis: Record<string, PhotoAnalysis> = {};
  Object.entries(r.photoAnalysis || {})
    .map(([url, a]: [string, PhotoAnalysis]) => [r.wattlinePhotoIds?.[url], a] as const)
    .filter(([photoId, a]) => photoId && a.status !== "processing")
    .sort(([x], [y]) => String(x).localeCompare(String(y)))
    .forEach(([photoId, a]) => (photoAnalysis[photoId!] = a));
  // 분류 칸별 사진 순서 (photo_uploads.id 목록)
  const photoOrder: Record<string, string[]> = {};
  Object.entries(r.wattlineCategoryPhotos || {}).forEach(([category, urls]) => {
    const ids = (urls || []).map((u) => r.wattlinePhotoIds?.[u]).filter((id): id is string => !!id);
    if (ids.length > 1) photoOrder[category] = ids;
  });
  const d = r.diameterCounts;
  return {
    pole_start: r.poleStart,
    pole_end: r.poleEnd,
    tree_species: r.treeSpecies,
    dia_under10: d?.under10 ?? 0,
    dia_over10: d?.over10 ?? 0,
    dia_over20: d?.over20 ?? 0,
    dia_over30: d?.over30 ?? 0,
    dia_over40: d?.over40 ?? 0,
    dia_total: d?.total ?? 0,
    note: r.note,
    work_intensity: r.workIntensity || DEFAULT_WORK_INTENSITY,
    tree_classification: r.treeClassification,
    span_description: r.spanDescription,
    work_content: r.workContent,
    confidence: r.confidence,
    reasoning: r.reasoning,
    photo_analysis: photoAnalysis,
    photo_order: photoOrder,
  };
}

function applySavedResult(record: PruningRecord, saved: SavedPruningResult | null): PruningRecord {
  if (!saved) return record;
  const urlById = Object.fromEntries(Object.entries(record.wattlinePhotoIds || {}).map(([url, id]) => [id, url]));
  const photoAnalysis: Record<string, PhotoAnalysis> = {};
  Object.entries(saved.photo_analysis || {}).forEach(([photoId, a]) => {
    const url = urlById[photoId];
    if (url) photoAnalysis[url] = a;
  });
  // 저장된 순서대로 칸 안 사진을 정렬한다 (저장 뒤 새로 들어온 사진은 원래 순서대로 뒤에)
  const categoryPhotos = { ...(record.wattlineCategoryPhotos || {}) };
  Object.entries(saved.photo_order || {}).forEach(([category, ids]) => {
    const urls = categoryPhotos[category as WattlineCategory];
    if (!urls) return;
    const rank = (u: string) => {
      const i = ids.indexOf(record.wattlinePhotoIds?.[u] || "");
      return i < 0 ? ids.length : i;
    };
    categoryPhotos[category as WattlineCategory] = [...urls].sort((a, b) => rank(a) - rank(b));
  });
  const hasDiameter = saved.dia_total > 0;
  return {
    ...record,
    ...(record.wattlineCategoryPhotos ? { wattlineCategoryPhotos: categoryPhotos } : {}),
    status: "completed",
    poleStart: saved.pole_start,
    poleEnd: saved.pole_end,
    treeSpecies: saved.tree_species,
    diameterCounts: hasDiameter
      ? {
          under10: saved.dia_under10,
          over10: saved.dia_over10,
          over20: saved.dia_over20,
          over30: saved.dia_over30,
          over40: saved.dia_over40,
          total: saved.dia_total,
        }
      : null,
    note: saved.note,
    workIntensity: saved.work_intensity || DEFAULT_WORK_INTENSITY,
    treeClassification: saved.tree_classification,
    spanDescription: saved.span_description,
    workContent: saved.work_content,
    confidence: saved.confidence,
    reasoning: saved.reasoning,
    photoAnalysis,
  };
}

// 흉고직경(cm) → 준공내역 구간
function diameterBucket(cm: number): keyof Omit<DiameterCounts, "total"> {
  if (cm < 10) return "under10";
  if (cm < 20) return "over10";
  if (cm < 30) return "over20";
  if (cm < 40) return "over30";
  return "over40";
}

async function requestPruningExtraction(dataUrl: string, mimeType: string, provider: ProviderId, apiKey: string) {
  const response = await fetch("/api/pruning-extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, apiKey, image: dataUrl, mimeType }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || "서버 응답 오류가 발생했습니다.") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function requestPruningExtractionWithRetry(dataUrl: string, mimeType: string, provider: ProviderId, apiKey: string) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await requestPruningExtraction(dataUrl, mimeType, provider, apiKey);
    } catch (err: any) {
      const isRetryable = RETRYABLE_STATUSES.has(err.status);
      if (!isRetryable || attempt === MAX_ATTEMPTS) {
        throw err;
      }
      await sleep(RETRY_BASE_DELAY_MS * attempt + Math.random() * 500);
    }
  }
  throw new Error("분석에 실패했습니다.");
}

export default function PruningWork({ settings, onNeedSettings, workplaceId, onChangeWorkplace }: PruningWorkProps) {
  const [records, setRecords] = useState<PruningRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  // 상세보기 창: 줄 + 클릭한 사진
  const [detail, setDetail] = useState<{ id: string; url: string; category: string } | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [workplaces, setWorkplaces] = useState<WorkplaceOption[]>([]);
  // 웹에서 이 작업장에 올린 사진 (AI 분석 없이 저장·보관만 한다)
  const [uploads, setUploads] = useState<UploadedPhoto[]>([]);
  const [isLoadingUploads, setIsLoadingUploads] = useState(true);
  const [confirmDeletePath, setConfirmDeletePath] = useState<string | null>(null);
  // 줄별 저장 상태 (저장 버튼 표시용)
  const [saveStatus, setSaveStatus] = useState<Record<string, "saving" | "saved" | null>>({});
  // 마지막으로 불러오거나 저장한 값 (줄 id → 저장 값 JSON). 지금 값과 다르면 "저장할 내용 있음"
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, string>>({});
  // 업로드 사진에 마우스를 올렸을 때 크게 보여줄 사진
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 선택 가능한 작업장 (작업자는 서버에서 자기 회사 작업장으로 제한됨)
  useEffect(() => {
    fetch("/api/workplaces", { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setWorkplaces(data.items || []))
      .catch(() => {});
  }, []);

  // 이 작업장에 웹으로 올린 사진 목록을 불러와 업로드 섹션에 보여준다.
  useEffect(() => {
    if (!workplaceId) {
      setIsLoadingUploads(false);
      return;
    }
    fetch(`/api/pruning?workplaceId=${workplaceId}`)
      .then((res) => res.json())
      .then((data) => {
        const photos: UploadedPhoto[] = data.photos || [];
        // 조회 중에 먼저 올린 사진이 있을 수 있으므로 pathname 기준으로 합친다.
        setUploads((prev) => {
          const known = new Set(prev.map((p) => p.pathname));
          return [...prev, ...photos.filter((p) => !known.has(p.pathname))];
        });
      })
      .catch(() => setErrorMsg("업로드한 사진 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoadingUploads(false));
  }, []);

  // WattLine(모바일 촬영 앱)이 Supabase DB에 저장한 사진 목록을 불러와, 같은 작업 건(작업장, 촬영일 무관)의
  // 분류별 사진을 한 행에 모아서 "대기중" 상태로 추가한다.
  useEffect(() => {
    if (!workplaceId) {
      setIsLoadingList(false);
      return;
    }
    Promise.all([
      fetch(`/api/wattline-db?workplaceId=${workplaceId}`).then((res) => res.json()),
      // 저장된 전지작업 결과 (없거나 실패하면 빈 값)
      fetch(`/api/pruning-results?workplaceId=${workplaceId}`, { headers: authHeaders() })
        .then((res) => res.json())
        .catch(() => ({})),
    ])
      .then(([data, saved]) => {
        const savedResult: SavedPruningResult | null = saved?.result || null;
        const photos: {
          id: string;
          url: string;
          fileName: string;
          workplaceName: string;
          category: WattlineCategory;
          photoDate: string;
          createdAt: string;
        }[] = data.photos || [];

        const groups = new Map<
          string,
          { workplaceName: string; photoDates: Set<string>; latestCreatedAt: string; photosByCategory: Partial<Record<WattlineCategory, string[]>>; photoIds: Record<string, string> }
        >();
        photos.forEach((p) => {
          // 촬영일과 상관없이 작업장 하나를 한 작업 건(한 줄)으로 묶는다.
          const key = workplaceId;
          const group = groups.get(key) || {
            workplaceName: p.workplaceName,
            photoDates: new Set<string>(),
            latestCreatedAt: p.createdAt,
            photosByCategory: {},
            photoIds: {},
          };
          group.photoIds[p.url] = p.id;
          group.photoDates.add(p.photoDate);
          // 같은 분류 사진이 여러 장일 수 있으므로 모두 모은다. API가 최신순이라 앞에 넣어 촬영 순으로 만든다.
          (group.photosByCategory[p.category] ||= []).unshift(p.url);
          if (p.createdAt > group.latestCreatedAt) group.latestCreatedAt = p.createdAt;
          groups.set(key, group);
        });

        // 앱 사진이 아직 없어도 업로드 사진을 분류 칸에 드롭할 수 있도록 빈 행을 만든다.
        if (groups.size === 0) {
          groups.set(workplaceId, { workplaceName: "", photoDates: new Set<string>(), latestCreatedAt: new Date().toISOString(), photosByCategory: {}, photoIds: {} });
        }

        const loadedAll = Array.from(groups.entries()).map(([key, g]) => applySavedResult({
              id: `wl-db-${key}`,
              name: g.workplaceName ? `${g.workplaceName} · ${formatDateRange(g.photoDates)}` : "(앱 사진 없음)",
              url: g.photosByCategory["작업전"]?.[0] || g.photosByCategory["흉고직경"]?.[0] || Object.values(g.photosByCategory)[0]?.[0] || "",
              mimeType: "image/jpeg",
              status: "idle" as const,
              error: null,
              poleStart: null,
              poleEnd: null,
              treeSpecies: null,
              diameterCounts: null,
              note: null,
              workIntensity: DEFAULT_WORK_INTENSITY,
              treeClassification: null,
              spanDescription: null,
              workContent: null,
              confidence: null,
              reasoning: null,
              boundingBox: null,
              wattlineCategoryPhotos: g.photosByCategory,
              wattlinePhotoIds: g.photoIds,
              extraPhotoUrls: [],
              uploadedAt: new Date(g.latestCreatedAt).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            }, savedResult));
        // 불러온 시점의 값을 기준으로 삼아, 이후 바뀌면 저장 버튼을 강조한다.
        setSavedSnapshots(Object.fromEntries(loadedAll.map((r) => [r.id, JSON.stringify(buildSavePayload(r))])));
        setRecords((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          return [...prev, ...loadedAll.filter((r) => !existingIds.has(r.id))];
        });
      })
      .catch(() => {})
      .finally(() => setIsLoadingList(false));
  }, []);

  const analyzeRecord = async (targetRecord: PruningRecord, dataUrl: string, mimeType: string) => {
    const apiKey = settings.keys[settings.selectedProvider];
    if (!apiKey) {
      setRecords((prev) =>
        prev.map((r) => (r.id === targetRecord.id ? { ...r, status: "failed", error: "설정에서 API 키를 먼저 입력하세요." } : r))
      );
      onNeedSettings();
      return;
    }

    setRecords((prev) => prev.map((r) => (r.id === targetRecord.id ? { ...r, status: "processing", error: null } : r)));

    try {
      const data = await requestPruningExtractionWithRetry(dataUrl, mimeType, settings.selectedProvider, apiKey);
      setRecords((prev) =>
        prev.map((r) =>
          r.id === targetRecord.id
            ? {
                ...r,
                status: "completed",
                poleStart: data.poleStart,
                poleEnd: data.poleEnd,
                treeSpecies: data.treeSpecies,
                diameterCounts: data.diameterCounts,
                note: data.note,
                workIntensity: data.workIntensity || DEFAULT_WORK_INTENSITY,
                treeClassification: data.treeClassification,
                spanDescription: data.spanDescription,
                workContent: data.workContent,
                confidence: data.confidence,
                reasoning: data.reasoning,
                boundingBox: data.boundingBox ?? null,
              }
            : r
        )
      );
    } catch (err: any) {
      setRecords((prev) =>
        prev.map((r) => (r.id === targetRecord.id ? { ...r, status: "failed", error: err.message || "분석 오류가 발생했습니다." } : r))
      );
    }
  };

  // 업로드는 저장만 한다 (AI 분석·분석 결과 표 추가는 하지 않는다).
  const uploadFiles = async (files: FileList) => {
    setErrorMsg(null);
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setErrorMsg("올바른 이미지 파일을 업로드해 주세요. (PNG, JPG, JPEG 등)");
      return;
    }

    for (const file of imageFiles) {
      let resized: { url: string; mimeType: string };
      try {
        resized = await resizeImageFile(file);
      } catch (err) {
        console.error("Image resize failed for file", file.name, err);
        setErrorMsg(`${file.name}: 이미지를 읽지 못했습니다.`);
        continue;
      }

      // 업로드가 끝나기 전에는 임시 미리보기(dataURL)로 보여준다.
      const tempPath = `uploading-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setUploads((prev) => [
        { url: resized.url, pathname: tempPath, uploadedAt: new Date().toISOString(), uploading: true },
        ...prev,
      ]);

      fetch("/api/pruning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: resized.mimeType, dataUrl: resized.url, workplaceId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.url) throw new Error(data.error || "업로드 실패");
          setUploads((prev) =>
            prev.map((p) => (p.pathname === tempPath ? { url: data.url, pathname: data.pathname, uploadedAt: data.uploadedAt } : p))
          );
        })
        .catch((err) => {
          setUploads((prev) => prev.filter((p) => p.pathname !== tempPath));
          setErrorMsg(`${file.name}: ${err.message || "업로드에 실패했습니다."}`);
        });
    }
  };

  const deleteUpload = (pathname: string) => {
    setConfirmDeletePath(null);
    fetch("/api/pruning", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathname }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || "삭제 실패");
        setUploads((prev) => prev.filter((p) => p.pathname !== pathname));
      })
      .catch((err) => setErrorMsg(err.message || "사진 삭제에 실패했습니다."));
  };

  // 분류 칸 사진 분석: 시작전주·종료전주는 번호찰 추출, 흉고직경은 cm 판독 후 표의 전주번호·준공내역을 채운다.
  const analyzeCategoryPhotos = async (record: PruningRecord) => {
    const apiKey = settings.keys[settings.selectedProvider];
    if (!apiKey) {
      setRecords((prev) => prev.map((r) => (r.id === record.id ? { ...r, status: "failed", error: "설정에서 API 키를 먼저 입력하세요." } : r)));
      onNeedSettings();
      return;
    }

    const photos = record.wattlineCategoryPhotos || {};
    // 칸마다 맨 첫 번째 사진만 분석한다 (순서는 표에서 끌어다 놓아 바꿀 수 있음)
    const targets: { category: "시작전주" | "종료전주" | "흉고직경"; url: string }[] = (["시작전주", "종료전주", "흉고직경"] as const)
      .filter((category) => photos[category]?.[0])
      .map((category) => ({ category, url: photos[category]![0] }));
    if (targets.length === 0) {
      setRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, status: "failed", error: "분석할 사진(시작전주·종료전주·흉고직경)이 없습니다." } : r))
      );
      return;
    }

    // 재분석: 이미 분석완료된 사진은 건너뛰고(결과 재사용), 에러·판독불가·미분석 사진만 다시 분석한다.
    const results: Record<string, { value?: string; diameterCm?: number; confidence?: number }> = {};
    targets.forEach(({ url }) => {
      const prev = record.photoAnalysis?.[url];
      if (prev?.status === "completed" && (prev.value !== undefined || prev.diameterCm !== undefined)) {
        results[url] = { value: prev.value, diameterCm: prev.diameterCm, confidence: prev.confidence };
      }
    });
    const toAnalyze = targets.filter((t) => !results[t.url]);

    const setPhoto = (url: string, analysis: PhotoAnalysis) =>
      setRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, photoAnalysis: { ...(r.photoAnalysis || {}), [url]: analysis } } : r))
      );

    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== record.id) return r;
        const photoAnalysis = { ...(r.photoAnalysis || {}) };
        // 분석 대상이 아닌(두 번째 이후) 사진의 이전 분석 표시는 지운다
        (["시작전주", "종료전주", "흉고직경"] as const).forEach((c) =>
          (photos[c] || []).slice(1).forEach((u) => delete photoAnalysis[u])
        );
        toAnalyze.forEach((t) => (photoAnalysis[t.url] = { status: "processing", message: null }));
        return { ...r, status: "processing", error: null, photoAnalysis };
      })
    );

    // 표 반영: 시작·끝 번호는 처음 읽힌 사진 값, 준공내역은 읽힌 흉고직경 사진 수를 구간별로 센다.
    // 사진 한 장이 끝날 때마다 호출해 결과를 바로 보여주고, 마지막(final)에만 줄 상태를 확정한다.
    const applyResults = (final: boolean) => {
      const firstValue = (category: string) => targets.find((t) => t.category === category && results[t.url]?.value);
      const start = firstValue("시작전주");
      const end = firstValue("종료전주");
      const diameters = targets.filter((t) => t.category === "흉고직경" && results[t.url]?.diameterCm !== undefined);
      let diameterCounts: DiameterCounts | null = null;
      if (diameters.length > 0) {
        diameterCounts = { under10: 0, over10: 0, over20: 0, over30: 0, over40: 0, total: diameters.length };
        diameters.forEach((t) => diameterCounts![diameterBucket(results[t.url].diameterCm!)]++);
      }
      const succeeded = Object.values(results);
      const confidences = succeeded.map((r) => r.confidence).filter((c): c is number => typeof c === "number");

      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== record.id) return r;
          if (final && succeeded.length === 0) {
            return { ...r, status: "failed", error: "분석에 성공한 사진이 없습니다. 사진 위 상태를 눌러 사유를 확인하세요." };
          }
          return {
            ...r,
            ...(final ? { status: "completed" as const, error: null } : {}),
            poleStart: start ? results[start.url].value! : r.poleStart,
            poleEnd: end ? results[end.url].value! : r.poleEnd,
            diameterCounts: diameterCounts || r.diameterCounts,
            confidence: confidences.length ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) : r.confidence,
            reasoning: succeeded.length ? `사진 ${targets.length}장 중 ${succeeded.length}장 판독` : r.reasoning,
          };
        })
      );
    };

    await runWithConcurrency(toAnalyze, ANALYSIS_CONCURRENCY, async ({ category, url }) => {
      try {
        if (category === "흉고직경") {
          const data = await postAnalysisWithRetry("/api/pruning-extract", {
            provider: settings.selectedProvider, apiKey, image: url, mimeType: "image/jpeg", mode: "diameter",
          });
          if (data.readable && typeof data.diameterCm === "number" && data.diameterCm > 0) {
            const cm = Math.round(data.diameterCm * 10) / 10;
            results[url] = { diameterCm: cm, confidence: data.confidence };
            setPhoto(url, {
              status: "completed",
              message: `흉고직경 ${cm}cm${data.reasoning ? `\n${data.reasoning}` : ""}`,
              diameterCm: cm,
              confidence: data.confidence,
            });
          } else {
            setPhoto(url, { status: "unreadable", message: data.reasoning || "사진에서 측정값을 읽을 수 없습니다." });
          }
        } else {
          const data = await postAnalysisWithRetry("/api/extract", {
            provider: settings.selectedProvider, apiKey, image: url, mimeType: "image/jpeg",
          });
          // 전주번호: 전산화번호 우선, 없으면 선로명+선로번호
          const lineText = [data.lineName, data.lineNumber].filter(Boolean).join(" ");
          const value = data.computerizedNumber || lineText || null;
          if (value) {
            results[url] = { value, confidence: data.confidence };
            const detail = [data.computerizedNumber && `전산화번호 ${data.computerizedNumber}`, lineText && `선로 ${lineText}`]
              .filter(Boolean)
              .join(" / ");
            setPhoto(url, {
              status: "completed",
              message: `${detail}${data.reasoning ? `\n${data.reasoning}` : ""}`,
              value,
              confidence: data.confidence,
            });
          } else {
            setPhoto(url, { status: "unreadable", message: data.reasoning || "사진에서 전주번호찰을 읽을 수 없습니다." });
          }
        }
      } catch (err: any) {
        setPhoto(url, { status: "failed", message: err.message || "분석 중 오류가 발생했습니다." });
      }
      applyResults(false);
    });

    applyResults(true);
  };

  const handleAnalyze = async (id: string) => {
    const record = records.find((r) => r.id === id);
    if (!record) return;
    if (record.wattlineCategoryPhotos) {
      await analyzeCategoryPhotos(record);
      return;
    }
    if (!record.url) {
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status: "failed", error: "분석할 사진이 없습니다." } : r)));
      return;
    }
    await analyzeRecord(record, record.url, record.mimeType);
  };

  // 줄의 값(전주번호·준공내역·입력값·사진별 분석 상태)을 DB(pruning_results)에 저장한다.
  const handleSave = (id: string) => {
    const r = records.find((x) => x.id === id);
    if (!r || !workplaceId) return;
    setSaveStatus((prev) => ({ ...prev, [id]: "saving" }));
    setErrorMsg(null);

    const payload = buildSavePayload(r);

    fetch("/api/pruning-results", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ workplace_id: workplaceId, ...payload }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!data) throw new Error(`저장하지 못했습니다 (서버 응답 ${res.status}). 서버를 재시작했는지 확인하세요.`);
        if (!data.success) throw new Error(data.error || "저장 실패");
        setSaveStatus((prev) => ({ ...prev, [id]: "saved" }));
        setSavedSnapshots((prev) => ({ ...prev, [id]: JSON.stringify(payload) }));
        setTimeout(() => setSaveStatus((prev) => (prev[id] === "saved" ? { ...prev, [id]: null } : prev)), 2000);
      })
      .catch((err) => {
        setSaveStatus((prev) => ({ ...prev, [id]: null }));
        setErrorMsg(err.message || "저장하지 못했습니다.");
      });
  };

  // 표의 분류 칸 사진을 삭제한다 (photo_uploads 행 + photos 파일).
  const handleDeleteAppPhoto = (recordId: string, category: WattlineCategory, url: string) => {
    const record = records.find((r) => r.id === recordId);
    const id = record?.wattlinePhotoIds?.[url];
    if (!record || !id) return;
    setErrorMsg(null);
    fetch("/api/wattline-db", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ id }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!data) throw new Error(`사진을 삭제하지 못했습니다 (서버 응답 ${res.status}). 서버를 재시작했는지 확인하세요.`);
        if (!data.success) throw new Error(data.error || "삭제 실패");
        setRecords((prev) =>
          prev.map((r) => {
            if (r.id !== recordId) return r;
            const photos = { ...(r.wattlineCategoryPhotos || {}) };
            photos[category] = (photos[category] || []).filter((u) => u !== url);
            const ids = { ...(r.wattlinePhotoIds || {}) };
            delete ids[url];
            // 대표 사진(AI 분석용)이 지워졌으면 남은 사진 중 하나로 바꾼다.
            const remaining = Object.values(photos).flat();
            const nextUrl = r.url === url ? photos["작업전"]?.[0] || photos["흉고직경"]?.[0] || remaining[0] || "" : r.url;
            return { ...r, wattlineCategoryPhotos: photos, wattlinePhotoIds: ids, url: nextUrl };
          })
        );
      })
      .catch((err) => setErrorMsg(err.message || "사진을 삭제하지 못했습니다."));
  };

  // 업로드 사진을 표의 분류 칸(시작전주·작업전 등)으로 옮긴다. 서버가 WattLineApp 사진으로 저장한다.
  // 같은 칸 안 사진 순서 변경 (화면에서만)
  const handleReorderPhotos = (recordId: string, category: WattlineCategory, urls: string[]) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId && r.wattlineCategoryPhotos
          ? { ...r, wattlineCategoryPhotos: { ...r.wattlineCategoryPhotos, [category]: urls } }
          : r
      )
    );
  };

  const handleDropPhoto = (recordId: string, category: WattlineCategory, pathname: string) => {
    const photo = uploads.find((p) => p.pathname === pathname);
    if (!photo || photo.uploading || photo.moving) return;
    setErrorMsg(null);
    setUploads((prev) => prev.map((p) => (p.pathname === pathname ? { ...p, moving: true } : p)));

    fetch("/api/pruning", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ pathname, workplaceId, category }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        // JSON이 아니면 서버가 이 기능을 모르는 것(예: 개발 서버를 재시작하지 않음)이다.
        if (!data) throw new Error(`사진을 옮기지 못했습니다 (서버 응답 ${res.status}). 서버를 재시작했는지 확인하세요.`);
        return data;
      })
      .then((data) => {
        if (!data.url) throw new Error(data.error || "이동 실패");
        setUploads((prev) => prev.filter((p) => p.pathname !== pathname));
        setRecords((prev) =>
          prev.map((r) => {
            if (r.id !== recordId) return r;
            const photos = { ...(r.wattlineCategoryPhotos || {}) };
            photos[category] = [...(photos[category] || []), data.url];
            return {
              ...r,
              wattlineCategoryPhotos: photos,
              wattlinePhotoIds: { ...(r.wattlinePhotoIds || {}), [data.url]: data.id },
              url: r.url || data.url,
            };
          })
        );
      })
      .catch((err) => {
        setUploads((prev) => prev.map((p) => (p.pathname === pathname ? { ...p, moving: false } : p)));
        setErrorMsg(err.message || "사진을 옮기지 못했습니다.");
      });
  };

  const handleRemove = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (detail?.id === id) setDetail(null);
  };

  const handleUpdateInfo = (id: string, updatedFields: Partial<PruningRecord>) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...updatedFields } : r)));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragActive(true);
    else if (e.type === "dragleave") setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) uploadFiles(e.target.files);
    e.target.value = "";
  };

  const detailRecord = records.find((r) => r.id === detail?.id) || null;
  const totalCount = records.length;

  // 작업장 선택 (표가 있으면 표 머리 왼쪽에, 없으면 단독 상자로 표시)
  const workplaceSelect = (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-bold text-text">작업장</span>
      <select
        value={workplaceId || ""}
        onChange={(e) => onChangeWorkplace(e.target.value || null)}
        className="min-w-64 text-sm border border-line rounded-lg px-2 py-2 bg-panel"
      >
        <option value="">작업장을 선택하세요</option>
        {workplaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.company?.name ? `[${w.company.name}]` : ""}
            {w.name}
            {w.is_completed ? "(완료)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
  const workplaceSelector = <div className="bg-panel border border-line rounded-lg px-4 py-3">{workplaceSelect}</div>;

  if (!workplaceId) {
    return (
      <div className="space-y-5">
        {workplaceSelector}
        <div className="bg-panel border border-line rounded-lg p-10 text-center text-text-soft">
          작업장을 선택하면 해당 작업장의 전지작업 사진과 분석 결과가 표시됩니다.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {(isLoadingList || totalCount === 0) && workplaceSelector}
      {isLoadingList ? (
        <div className="flex items-center justify-center py-10 text-text-soft text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          불러오는 중...
        </div>
      ) : (
        totalCount > 0 && (
          <PruningTable
            records={records}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRemove={handleRemove}
            onAnalyze={handleAnalyze}
            onUpdate={handleUpdateInfo}
            onDropPhoto={handleDropPhoto}
            onDeletePhoto={handleDeleteAppPhoto}
            onReorderPhotos={handleReorderPhotos}
            onSave={handleSave}
            headerLeft={workplaceSelect}
            onOpenDetail={(id, photo) => setDetail({ id, ...photo })}
            saveStatus={saveStatus}
            unsaved={Object.fromEntries(records.map((r) => [r.id, JSON.stringify(buildSavePayload(r)) !== savedSnapshots[r.id]]))}
          />
        )
      )}

      {/* 전지작업 사진 업로드: 왼쪽 업로드 칸 + 오른쪽 올린 사진 목록 */}
      <div className="bg-panel border border-line rounded-lg p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-text text-sm">전지작업 사진 업로드</h2>
            <p className="text-xs text-text-soft mt-0.5">사진을 선택하거나 드롭하면 이 작업장에 저장됩니다. 저장된 사진을 위 표의 사진 칸(시작전주·작업전 등)으로 끌어다 놓으면 그 분류로 옮겨집니다.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-bold text-text">업로드한 사진</span>
            <span className="px-2 rounded-full bg-panel-2 text-text font-semibold">{uploads.length}</span>
          </div>
        </div>

        <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*" onChange={handleFileChange} />

        <div className="flex flex-wrap gap-3">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            title="클릭하거나 사진을 끌어다 놓으세요 (여러 장 가능)"
            className={`w-36 h-36 shrink-0 border-2 border-dashed border-blue rounded-lg flex flex-col items-center justify-center gap-3 p-3 text-center cursor-pointer transition-colors ${ isDragActive ? "bg-violet-soft" : "bg-panel hover:bg-violet-soft" }`}
          >
            <div className="p-2.5 bg-panel rounded-lg border border-line text-blue">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-text font-bold">사진을 드래그</p>
          </div>

          {isLoadingUploads ? (
            <div className="h-36 flex items-center gap-2 text-text-soft">
              <Loader2 className="w-4 h-4 animate-spin" />
              불러오는 중...
            </div>
          ) : uploads.length === 0 ? (
            <p className="h-36 flex items-center text-text-soft">아직 올린 사진이 없습니다.</p>
          ) : (
            <>
                {uploads.map((photo) => (
                  <div
                    key={photo.pathname}
                    draggable={!photo.uploading && !photo.moving}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(UPLOAD_DRAG_TYPE, photo.pathname);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    title="표의 사진 칸(시작전주·작업전 등)으로 끌어다 놓으면 그 분류로 옮겨집니다. 누르면 원본 보기"
                    className="relative w-36 h-36 shrink-0 rounded-lg border border-line bg-panel-2 overflow-hidden group cursor-grab active:cursor-grabbing"
                  >
                    <a href={photo.uploading ? undefined : photo.url} target="_blank" rel="noreferrer" draggable={false}>
                      <img src={photo.url} alt="업로드한 사진" draggable={false} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </a>
                    {(photo.uploading || photo.moving) && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white gap-1.5">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {photo.moving ? "옮기는 중" : "업로드 중"}
                      </div>
                    )}
                    {!photo.uploading && !photo.moving && confirmDeletePath !== photo.pathname && (
                      <button
                        onClick={() => setPreviewUrl(photo.url)}
                        title="확대 보기"
                        className="absolute top-1.5 left-1.5 p-1.5 rounded-lg bg-panel border border-line text-text-soft hover:text-blue opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!photo.uploading && !photo.moving && confirmDeletePath !== photo.pathname && (
                      <button
                        onClick={() => setConfirmDeletePath(photo.pathname)}
                        title="삭제"
                        className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-panel border border-line text-text-soft hover:text-red opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {confirmDeletePath === photo.pathname && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white">
                        <span className="font-semibold">삭제할까요?</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => deleteUpload(photo.pathname)} className="px-2.5 py-1 rounded-lg bg-red text-white font-semibold">
                            삭제
                          </button>
                          <button onClick={() => setConfirmDeletePath(null)} className="px-2.5 py-1 rounded-lg bg-panel text-text font-semibold">
                            취소
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </>
          )}
        </div>

        {/* 확대 버튼을 누른 업로드 사진을 화면에 들어가는 최대 크기로 보여준다 (아무 곳이나 누르면 닫힘) */}
        {previewUrl && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setPreviewUrl(null)} title="닫기">
            <img
              src={previewUrl}
              alt="확대 보기"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg border border-line bg-panel shadow-card"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-red/10 text-red rounded-lg text-sm border border-red/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} title="닫기">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {detailRecord && detail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center p-4 z-50" onClick={() => setDetail(null)}>
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <PruningDetail
              record={detailRecord}
              photo={{ url: detail.url, category: detail.category, analysis: detailRecord.photoAnalysis?.[detail.url] }}
              onAnalyze={handleAnalyze}
              onUpdateInfo={handleUpdateInfo}
              onClose={() => setDetail(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

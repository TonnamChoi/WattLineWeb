import React, { useEffect, useRef, useState } from "react";
import { Upload, AlertCircle, Loader2, Play, Trash2 } from "lucide-react";
import { resizeImageFile } from "../lib/resizeImage";
import { runWithConcurrency } from "../lib/asyncQueue";
import { AppSettings, ProviderId } from "../lib/settings";
import { PruningRecord, WattlineCategory } from "../types";
import { authHeaders } from "../lib/auth";
import PruningTable from "./PruningTable";
import PruningDetail from "./PruningDetail";

interface PruningWorkProps {
  settings: AppSettings;
  onNeedSettings: () => void;
  workplaceId: string | null;
  onChangeWorkplace: (id: string | null) => void;
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
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [workplaces, setWorkplaces] = useState<WorkplaceOption[]>([]);

  // 선택 가능한 작업장 (작업자는 서버에서 자기 회사 작업장으로 제한됨)
  useEffect(() => {
    fetch("/api/workplaces", { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => setWorkplaces(data.items || []))
      .catch(() => {});
  }, []);

  // 기존에 Blob에 저장된 사진 목록을 불러와 "대기중" 상태의 행으로 보여준다 (AI 분석 결과는 새로고침 시 유지되지 않음).
  useEffect(() => {
    if (!workplaceId) {
      setIsLoadingList(false);
      return;
    }
    fetch(`/api/pruning?workplaceId=${workplaceId}`)
      .then((res) => res.json())
      .then((data) => {
        const photos = data.photos || [];
        // 조회가 끝나기 전에 사용자가 이미 업로드했을 수 있으므로, 기존 목록을 덮어쓰지 않고
        // 아직 없는 사진만 뒤에 추가한다 (URL 기준 중복 제거).
        setRecords((prev) => {
          const existingUrls = new Set(prev.map((r) => r.url));
          const loaded = photos
            .filter((p: { url: string }) => !existingUrls.has(p.url))
            .map((p: { url: string; pathname: string; uploadedAt: string }) => ({
            id: p.url,
            name: p.pathname.split("/").pop() || p.pathname,
            url: p.url,
            mimeType: "image/jpeg",
            status: "idle" as const,
            error: null,
            poleStart: null,
            poleEnd: null,
            treeSpecies: null,
            diameterCounts: null,
            note: null,
            workIntensity: null,
            treeClassification: null,
            spanDescription: null,
            workContent: null,
            confidence: null,
            reasoning: null,
            boundingBox: null,
            extraPhotoUrls: [],
            uploadedAt: new Date(p.uploadedAt).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          }));
          return [...prev, ...loaded];
        });
      })
      .catch(() => {})
      .finally(() => setIsLoadingList(false));
  }, []);

  // WattLine(모바일 촬영 앱)이 Supabase DB에 저장한 사진 목록을 불러와, 같은 작업 건(작업장, 촬영일 무관)의
  // 분류별 사진을 한 행에 모아서 "대기중" 상태로 추가한다.
  useEffect(() => {
    if (!workplaceId) return;
    fetch(`/api/wattline-db?workplaceId=${workplaceId}`)
      .then((res) => res.json())
      .then((data) => {
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
          { workplaceName: string; photoDates: Set<string>; latestCreatedAt: string; photosByCategory: Partial<Record<WattlineCategory, string[]>> }
        >();
        photos.forEach((p) => {
          // 촬영일과 상관없이 작업장 하나를 한 작업 건(한 줄)으로 묶는다.
          const key = workplaceId;
          const group = groups.get(key) || {
            workplaceName: p.workplaceName,
            photoDates: new Set<string>(),
            latestCreatedAt: p.createdAt,
            photosByCategory: {},
          };
          group.photoDates.add(p.photoDate);
          // 같은 분류 사진이 여러 장일 수 있으므로 모두 모은다. API가 최신순이라 앞에 넣어 촬영 순으로 만든다.
          (group.photosByCategory[p.category] ||= []).unshift(p.url);
          if (p.createdAt > group.latestCreatedAt) group.latestCreatedAt = p.createdAt;
          groups.set(key, group);
        });

        setRecords((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const loaded = Array.from(groups.entries())
            .filter(([key]) => !existingIds.has(`wl-db-${key}`))
            .map(([key, g]) => ({
              id: `wl-db-${key}`,
              name: `${g.workplaceName} · ${formatDateRange(g.photoDates)}`,
              url: g.photosByCategory["작업전"]?.[0] || g.photosByCategory["흉고직경"]?.[0] || Object.values(g.photosByCategory)[0]?.[0] || "",
              mimeType: "image/jpeg",
              status: "idle" as const,
              error: null,
              poleStart: null,
              poleEnd: null,
              treeSpecies: null,
              diameterCounts: null,
              note: null,
              workIntensity: null,
              treeClassification: null,
              spanDescription: null,
              workContent: null,
              confidence: null,
              reasoning: null,
              boundingBox: null,
              wattlineCategoryPhotos: g.photosByCategory,
              extraPhotoUrls: [],
              uploadedAt: new Date(g.latestCreatedAt).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            }));
          return [...prev, ...loaded];
        });
      })
      .catch(() => {});
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
                workIntensity: data.workIntensity,
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

  const uploadFiles = async (files: FileList) => {
    setErrorMsg(null);
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setErrorMsg("올바른 이미지 파일을 업로드해 주세요. (PNG, JPG, JPEG 등)");
      return;
    }

    const newRecords: { record: PruningRecord; dataUrl: string; mimeType: string; file: File }[] = [];

    for (const file of imageFiles) {
      try {
        const { url: dataUrl, mimeType } = await resizeImageFile(file);
        const record: PruningRecord = {
          id: `pruning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          url: dataUrl,
          mimeType,
          status: "idle",
          error: null,
          poleStart: null,
          poleEnd: null,
          treeSpecies: null,
          diameterCounts: null,
          note: null,
          workIntensity: null,
          treeClassification: null,
          spanDescription: null,
          workContent: null,
          confidence: null,
          reasoning: null,
          boundingBox: null,
          extraPhotoUrls: [],
          uploadedAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        };
        newRecords.push({ record, dataUrl, mimeType, file });
      } catch (err) {
        console.error("Image resize failed for file", file.name, err);
      }
    }

    if (newRecords.length === 0) return;

    setRecords((prev) => [...newRecords.map((n) => n.record), ...prev]);
    setSelectedId(newRecords[newRecords.length - 1].record.id);

    // Blob 저장(영구 보관)과 AI 분석은 서로 독립적으로 진행한다.
    newRecords.forEach(({ record, dataUrl, mimeType }) => {
      fetch("/api/pruning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: record.name, mimeType, dataUrl, workplaceId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.url) {
            setRecords((prev) => prev.map((r) => (r.id === record.id ? { ...r, url: data.url } : r)));
          }
        })
        .catch(() => {});
    });

    runWithConcurrency<{ record: PruningRecord; dataUrl: string; mimeType: string; file: File }>(
      newRecords,
      ANALYSIS_CONCURRENCY,
      ({ record, dataUrl, mimeType }) => analyzeRecord(record, dataUrl, mimeType)
    );
  };

  const handleAnalyze = async (id: string) => {
    const record = records.find((r) => r.id === id);
    if (!record) return;
    await analyzeRecord(record, record.url, record.mimeType);
  };

  const handleAnalyzeAll = async () => {
    const pending = records.filter((r) => r.status === "idle" || r.status === "failed");
    if (pending.length === 0) return;
    setIsBulkProcessing(true);
    await runWithConcurrency<PruningRecord>(pending, ANALYSIS_CONCURRENCY, (r) => handleAnalyze(r.id));
    setIsBulkProcessing(false);
  };

  const handleRemove = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (detailId === id) setDetailId(null);
  };

  const handleClearAll = () => {
    setRecords([]);
    setSelectedId(null);
    setDetailId(null);
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

  const detailRecord = records.find((r) => r.id === detailId) || null;
  const totalCount = records.length;
  const pendingCount = records.filter((r) => r.status === "idle" || r.status === "failed").length;

  const workplaceSelector = (
    <div className="bg-panel border border-line rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
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
      {workplaceSelector}
      <div className="bg-panel border border-line rounded-lg p-4">
        <div className="mb-3">
          <h2 className="font-bold text-text text-sm">전지작업 사진 업로드</h2>
          <p className="text-xs text-text-soft mt-0.5">전지작업 사진을 선택하거나 드롭하면 AI가 자동으로 분석합니다</p>
        </div>

        <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*" onChange={handleFileChange} />

        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-200 ${ isDragActive ? "border-blue bg-blue/50" : "border-text-soft/40 hover:border-blue bg-panel-2/60 hover:bg-panel" }`}
        >
          <div className="p-2.5 bg-panel rounded-lg border border-line mb-2 text-blue">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-text font-bold text-xs md:text-sm mb-0.5">여기에 전지작업 사진을 드래그하거나 클릭하여 업로드</p>
          <p className="text-text-soft text-[11px]">여러 장의 사진을 동시에 업로드할 수 있습니다. (PNG, JPG, JPEG 지원)</p>
        </div>

        {errorMsg && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-red/10 text-red rounded-lg text-sm border border-red/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {totalCount > 0 && (
        <div className="bg-panel border border-line px-4 py-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-panel-2 text-text-soft font-semibold">전체 {totalCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAll}
              disabled={isBulkProcessing}
              className="px-3 py-1.5 text-xs font-semibold text-text-soft hover:bg-panel-2 rounded-lg transition-colors disabled:opacity-40"
            >
              <span className="inline-flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" />
                전체 삭제
              </span>
            </button>
            <button
              onClick={handleAnalyzeAll}
              disabled={isBulkProcessing || pendingCount === 0}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${ pendingCount === 0 ? "bg-panel-2 text-text-soft cursor-not-allowed" : "bg-blue hover:bg-blue-hover text-white" }`}
            >
              {isBulkProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  대기중 {pendingCount}건 일괄 분석
                </>
              )}
            </button>
          </div>
        </div>
      )}

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
            onClearAll={handleClearAll}
            onAnalyze={handleAnalyze}
            onOpenDetail={setDetailId}
            onUpdate={handleUpdateInfo}
          />
        )
      )}

      {detailRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center p-4 z-50" onClick={() => setDetailId(null)}>
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <PruningDetail record={detailRecord} onAnalyze={handleAnalyze} onUpdateInfo={handleUpdateInfo} onClose={() => setDetailId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

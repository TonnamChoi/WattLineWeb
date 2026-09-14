import React, { useEffect, useRef, useState } from "react";
import { Upload, AlertCircle, Loader2, Play, Trash2 } from "lucide-react";
import { resizeImageFile } from "../lib/resizeImage";
import { runWithConcurrency } from "../lib/asyncQueue";
import { AppSettings, ProviderId } from "../lib/settings";
import { PruningRecord } from "../types";
import PruningTable from "./PruningTable";
import PruningDetail from "./PruningDetail";

interface PruningWorkProps {
  settings: AppSettings;
  onNeedSettings: () => void;
}

const ANALYSIS_CONCURRENCY = 5;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

export default function PruningWork({ settings, onNeedSettings }: PruningWorkProps) {
  const [records, setRecords] = useState<PruningRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 기존에 Blob에 저장된 사진 목록을 불러와 "대기중" 상태의 행으로 보여준다 (AI 분석 결과는 새로고침 시 유지되지 않음).
  useEffect(() => {
    fetch("/api/pruning")
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
        body: JSON.stringify({ fileName: record.name, mimeType, dataUrl }),
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

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="mb-3">
          <h2 className="font-bold text-gray-800 text-sm">전지작업 사진 업로드</h2>
          <p className="text-xs text-gray-400 mt-0.5">전지작업 사진을 선택하거나 드롭하면 AI가 자동으로 분석합니다</p>
        </div>

        <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*" onChange={handleFileChange} />

        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-200 ${
            isDragActive ? "border-blue-500 bg-blue-50/50" : "border-gray-300 hover:border-blue-400 bg-gray-50/60 hover:bg-white"
          }`}
        >
          <div className="p-2.5 bg-white rounded border border-gray-200 shadow-xs mb-2 text-blue-600">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-gray-800 font-bold text-xs md:text-sm mb-0.5">여기에 전지작업 사진을 드래그하거나 클릭하여 업로드</p>
          <p className="text-gray-400 text-[11px]">여러 장의 사진을 동시에 업로드할 수 있습니다. (PNG, JPG, JPEG 지원)</p>
        </div>

        {errorMsg && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {totalCount > 0 && (
        <div className="bg-white border border-gray-200 px-4 py-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-semibold">전체 {totalCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAll}
              disabled={isBulkProcessing}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
            >
              <span className="inline-flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" />
                전체 삭제
              </span>
            </button>
            <button
              onClick={handleAnalyzeAll}
              disabled={isBulkProcessing || pendingCount === 0}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                pendingCount === 0 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
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
        <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
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
          />
        )
      )}

      {detailRecord && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setDetailId(null)}>
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <PruningDetail record={detailRecord} onAnalyze={handleAnalyze} onUpdateInfo={handleUpdateInfo} onClose={() => setDetailId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

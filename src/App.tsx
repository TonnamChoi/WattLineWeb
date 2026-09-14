import React, { useState } from "react";
import DropZone from "./components/DropZone";
import PoleDetail from "./components/PoleDetail";
import PoleTable from "./components/PoleTable";
import SettingsPanel from "./components/SettingsPanel";
import AboutPlate from "./components/AboutPlate";
import PruningWork from "./components/PruningWork";
import Sidebar, { ViewId } from "./components/Sidebar";
import { PoleImage } from "./types";
import { AppSettings, ProviderId, loadSettings, saveSettings } from "./lib/settings";
import { runWithConcurrency } from "./lib/asyncQueue";
import {
  Sparkles, ShieldCheck, Zap, Server,
  Play, Trash2, Layers, Cpu, Loader2, Settings, ExternalLink, Menu
} from "lucide-react";

// 대량 업로드 시 API 요청이 한꺼번에 몰리지 않도록 동시 처리 개수를 제한한다.
const ANALYSIS_CONCURRENCY = 5;

// 429(요청 한도 초과)·5xx(서버 오류/과부하)처럼 일시적인 오류만 자동 재시도 대상으로 삼는다.
// 401(키 오류) 등은 재시도해도 결과가 같으므로 바로 실패 처리해 수동 재시도로 넘긴다.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestExtraction(targetPole: PoleImage, provider: ProviderId, apiKey: string) {
  const response = await fetch("/api/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider,
      apiKey,
      image: targetPole.url,
      mimeType: targetPole.mimeType,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || "서버 응답 오류가 발생했습니다.") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function requestExtractionWithRetry(targetPole: PoleImage, provider: ProviderId, apiKey: string) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await requestExtraction(targetPole, provider, apiKey);
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

export default function App() {
  const [poles, setPoles] = useState<PoleImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [view, setView] = useState<ViewId>("pruning");

  const handleSaveSettings = (next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  // Add uploaded pole images and immediately start analyzing each one (동시 처리 개수 제한)
  const handleImagesAdded = (newImages: PoleImage[]) => {
    setPoles((prev) => [...prev, ...newImages]);
    if (newImages.length > 0) {
      setSelectedId(newImages[newImages.length - 1].id);
    }
    runWithConcurrency<PoleImage>(newImages, ANALYSIS_CONCURRENCY, (image) => analyzePole(image));
  };

  // Remove a single pole image from list
  const handleRemovePole = (id: string) => {
    setPoles((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) {
      setSelectedId((prev) => {
        const remaining = poles.filter((p) => p.id !== id);
        return remaining.length > 0 ? remaining[0].id : null;
      });
    }
  };

  // Clear all poles
  const handleClearAll = () => {
    setPoles([]);
    setSelectedId(null);
  };

  // Update details of a pole (e.g. manual edits)
  const handleUpdatePoleInfo = (id: string, updatedFields: Partial<PoleImage>) => {
    setPoles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updatedFields } : p))
    );
  };

  // Analyze a single pole image using server endpoint
  const analyzePole = async (targetPole: PoleImage) => {
    const apiKey = settings.keys[settings.selectedProvider];
    if (!apiKey) {
      setPoles((prev) =>
        prev.map((p) =>
          p.id === targetPole.id
            ? { ...p, status: "failed", error: "설정에서 API 키를 먼저 입력하세요." }
            : p
        )
      );
      setIsSettingsOpen(true);
      return;
    }

    // Set processing state
    setPoles((prev) =>
      prev.map((p) =>
        p.id === targetPole.id
          ? { ...p, status: "processing", error: null }
          : p
      )
    );

    try {
      const data = await requestExtractionWithRetry(targetPole, settings.selectedProvider, apiKey);

      // Update with extracted data
      setPoles((prev) =>
        prev.map((p) =>
          p.id === targetPole.id
            ? {
                ...p,
                status: "completed",
                lineName: data.lineName,
                computerizedNumber: data.computerizedNumber,
                lineNumber: data.lineNumber,
                confidence: data.confidence,
                extraInfo: data.extraInfo,
                reasoning: data.reasoning,
                boundingBox: data.boundingBox ?? null,
              }
            : p
        )
      );
    } catch (err: any) {
      console.error("Analysis failed for pole id", targetPole.id, err);
      setPoles((prev) =>
        prev.map((p) =>
          p.id === targetPole.id
            ? {
                ...p,
                status: "failed",
                error: err.message || "분석 오류가 발생했습니다.",
              }
            : p
        )
      );
    }
  };

  // Look up a pole by id and analyze it (used by retry buttons)
  const handleAnalyzePole = async (id: string) => {
    const targetPole = poles.find((p) => p.id === id);
    if (!targetPole) return;
    await analyzePole(targetPole);
  };

  // Analyze all poles that are currently in 'idle' or 'failed' status
  const handleAnalyzeAll = async () => {
    const pendingPoles = poles.filter(
      (p) => p.status === "idle" || p.status === "failed"
    );
    if (pendingPoles.length === 0) return;

    setIsBulkProcessing(true);

    // 동시 처리 개수를 제한하며 순차적으로 큐 처리
    await runWithConcurrency<PoleImage>(pendingPoles, ANALYSIS_CONCURRENCY, (p) => handleAnalyzePole(p.id));

    setIsBulkProcessing(false);
  };

  const detailPole = poles.find((p) => p.id === detailId) || null;

  // Stat calculations
  const totalCount = poles.length;
  const completedCount = poles.filter((p) => p.status === "completed").length;
  const processingCount = poles.filter((p) => p.status === "processing").length;
  const failedCount = poles.filter((p) => p.status === "failed").length;
  const idleCount = poles.filter((p) => p.status === "idle").length;
  const pendingCount = idleCount + failedCount;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex font-sans">
      <Sidebar
        view={view}
        onNavigate={setView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isMobileOpen={isMobileMenuOpen}
        onOpenMobile={() => setIsMobileMenuOpen(true)}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Main Workspace Layout */}
        <main
          className={`flex-1 w-full mx-auto space-y-5 ${
            view === "pruning" ? "px-1 py-4 md:px-2 md:py-6" : "max-w-7xl p-4 md:p-6"
          }`}
        >
          {view === "about" && <AboutPlate />}
          {view === "pruning" && <PruningWork settings={settings} onNeedSettings={() => setIsSettingsOpen(true)} />}
          {view === "main" && (
          <>
          {/* Upload */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="mb-3">
              <h2 className="font-bold text-gray-800 text-sm">이미지 업로드</h2>
              <p className="text-xs text-gray-400 mt-0.5">전주번호찰 이미지를 선택하거나 드롭 하세요</p>
            </div>
            <DropZone onImagesAdded={handleImagesAdded} uploadedCount={poles.length} />
          </div>

          {/* Action bar */}
          {totalCount > 0 && (
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-semibold">전체 {totalCount}</span>
                <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-semibold">완료 {completedCount}</span>
                {processingCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> 분석 중 {processingCount}
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-semibold">실패 {failedCount}</span>
                )}
                {idleCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-semibold">대기 {idleCount}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAll}
                  disabled={isBulkProcessing}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                >
                  전체 삭제
                </button>
                <button
                  onClick={handleAnalyzeAll}
                  disabled={isBulkProcessing || pendingCount === 0}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    pendingCount === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
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

          {/* 분석 대상 목록 + 추출 결과 테이블 통합 */}
          {totalCount > 0 && (
            <div className="w-full">
              <PoleTable
                poles={poles}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onRemove={handleRemovePole}
                onClearAll={handleClearAll}
                onAnalyze={handleAnalyzePole}
                onOpenDetail={setDetailId}
              />
            </div>
          )}
          </>
          )}
        </main>

        <footer className="py-4 text-center text-[11px] text-gray-400 shrink-0">
          제작 : therianchoi@gmail.com
        </footer>
      </div>

      <SettingsPanel
        isOpen={isSettingsOpen}
        settings={settings}
        onSave={handleSaveSettings}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* 상세 및 수정: 별도 모달 창으로 표시 */}
      {detailPole && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setDetailId(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <PoleDetail
              pole={detailPole}
              onAnalyze={handleAnalyzePole}
              onUpdateInfo={handleUpdatePoleInfo}
              onClose={() => setDetailId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

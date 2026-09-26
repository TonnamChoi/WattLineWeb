import React, { useEffect, useState } from "react";
import DropZone from "./components/DropZone";
import PoleDetail from "./components/PoleDetail";
import PoleTable from "./components/PoleTable";
import SettingsPanel from "./components/SettingsPanel";
import AboutPlate from "./components/AboutPlate";
import TreePruningGuide from "./components/TreePruningGuide";
import PruningWork from "./components/PruningWork";
import AdminPanel from "./components/AdminPanel";
import LoginPage from "./components/LoginPage";
import { AuthUser, clearToken, restoreSession } from "./lib/auth";
import Sidebar, { HOME_VIEW, ViewId } from "./components/Sidebar";
import WorkplaceList from "./components/WorkplaceList";
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
  const [view, setView] = useState<ViewId>(HOME_VIEW);
  const [pruningWorkplaceId, setPruningWorkplaceId] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    restoreSession().then((user) => {
      setAuthUser(user);
      setAuthChecked(true);
    });
  }, []);

  const handleLogout = () => {
    clearToken();
    setAuthUser(null);
    setPruningWorkplaceId(null);
    setView(HOME_VIEW);
  };

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

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue" />
      </div>
    );
  }
  if (!authUser) return <LoginPage onLogin={setAuthUser} />;

  return (
    <div className="min-h-screen bg-bg text-text flex font-sans pt-14">
      <Sidebar
        currentUser={authUser}
        isAdmin={authUser.role === "admin"}
        canManageWorkplaces={authUser.role === "admin" || authUser.role === "company_admin"}
        onLogout={handleLogout}
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
          className={`flex-1 w-full mx-auto space-y-5 ${ view === "pruning" ? "px-1 py-4 md:px-2 md:py-6" : "max-w-7xl p-4 md:p-6" }`}
        >
          {view === "workplaces" && (
            <WorkplaceList
              user={authUser}
              onOpenWorkplace={(id) => {
                setPruningWorkplaceId(id);
                setView("pruning");
              }}
            />
          )}
          {view === "about" && <AboutPlate />}
          {view === "pruning-guide" && <TreePruningGuide />}
          {view === "admin-companies" && <AdminPanel entity="companies" />}
          {view === "admin-users" && <AdminPanel entity="users" />}
          {view === "admin-workplaces" && <AdminPanel entity="workplaces" />}
          {view === "pruning" && (
            // 작업장이 바뀌면 이전 작업장 사진/분석 상태가 섞이지 않도록 새로 마운트한다.
            <React.Fragment key={pruningWorkplaceId || "none"}>
              <PruningWork
                settings={settings}
                onNeedSettings={() => setIsSettingsOpen(true)}
                workplaceId={pruningWorkplaceId}
                onChangeWorkplace={setPruningWorkplaceId}
              />
            </React.Fragment>
          )}
          {view === "main" && (
          <>
          {/* Upload */}
          <div className="bg-panel border border-line rounded-lg p-4">
            <div className="mb-3">
              <h2 className="font-bold text-text text-sm">이미지 업로드</h2>
              <p className="text-xs text-text-soft mt-0.5">전주번호찰 이미지를 선택하거나 드롭 하세요</p>
            </div>
            <DropZone onImagesAdded={handleImagesAdded} uploadedCount={poles.length} />
          </div>

          {/* Action bar */}
          {totalCount > 0 && (
            <div className="bg-panel border border-line px-4 py-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-panel-2 text-text-soft font-semibold">전체 {totalCount}</span>
                <span className="px-2.5 py-1 rounded-full bg-green/15 text-green font-semibold">완료 {completedCount}</span>
                {processingCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-blue/15 text-text font-semibold flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> 분석 중 {processingCount}
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-red/10 text-red font-semibold">실패 {failedCount}</span>
                )}
                {idleCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-panel-2 text-text-soft font-semibold">대기 {idleCount}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAll}
                  disabled={isBulkProcessing}
                  className="px-3 py-1.5 text-xs font-semibold text-text-soft hover:bg-panel-2 rounded-lg transition-colors disabled:opacity-40"
                >
                  전체 삭제
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

        <footer className="py-4 text-center text-[11px] text-text-soft shrink-0">
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
          className="fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center p-4 z-50"
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

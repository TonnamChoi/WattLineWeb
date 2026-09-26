import React, { useState, useEffect } from "react";
import { PoleImage } from "../types";
import { cropToBoundingBox } from "../lib/cropImage";
import {
  Sparkles, Loader2, Play, CheckCircle2, AlertCircle, Save,
  MapPin, HelpCircle, ShieldAlert, Zap, X
} from "lucide-react";

interface PoleDetailProps {
  pole: PoleImage | null;
  onAnalyze: (id: string) => void;
  onUpdateInfo: (id: string, updatedFields: Partial<PoleImage>) => void;
  onClose?: () => void;
}

export default function PoleDetail({ pole, onAnalyze, onUpdateInfo, onClose }: PoleDetailProps) {
  const [lineName, setLineName] = useState("");
  const [computerizedNumber, setComputerizedNumber] = useState("");
  const [lineNumber, setLineNumber] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);

  // Sync state when selected pole changes or updates
  useEffect(() => {
    if (pole) {
      setLineName(pole.lineName || "");
      setComputerizedNumber(pole.computerizedNumber || "");
      setLineNumber(pole.lineNumber || "");
      setExtraInfo(pole.extraInfo || "");
      setIsSaved(false);
    }
  }, [pole?.id, pole?.lineName, pole?.computerizedNumber, pole?.lineNumber, pole?.extraInfo]);

  // Crop the uploaded photo down to just the plate region using the AI-detected bounding box
  useEffect(() => {
    const box = pole?.boundingBox;
    if (!pole || !box) {
      setCroppedUrl(null);
      return;
    }

    let cancelled = false;
    cropToBoundingBox(pole.url, box)
      .then((url) => {
        if (!cancelled) setCroppedUrl(url);
      })
      .catch(() => {
        if (!cancelled) setCroppedUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [pole?.id, pole?.url, pole?.boundingBox?.x, pole?.boundingBox?.y, pole?.boundingBox?.width, pole?.boundingBox?.height]);

  if (!pole) {
    return (
      <div className="bg-surface border border-border rounded-lg flex flex-col items-center justify-center p-8 text-center text-text3">
        <MapPin className="w-10 h-10 mb-2 stroke-1 text-border-strong" />
        <h4 className="font-extrabold text-text2 text-xs uppercase tracking-wider mb-1">상세 정보 패널</h4>
        <p className="text-[11px] text-text3 max-w-[280px] leading-relaxed">
          좌측 분석 목록에서 전주번호찰 이미지를 선택하면 상세 정보 및 선로 데이터 분석 결과가 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  const handleSave = () => {
    onUpdateInfo(pole.id, {
      lineName: lineName.trim() || null,
      computerizedNumber: computerizedNumber.trim() || null,
      lineNumber: lineNumber.trim() || null,
      extraInfo: extraInfo.trim() || null,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // AI가 값을 찾지 못했을 때 (빈 문자열 또는 문자열 그대로의 "null") 강조 표시할지 판단
  const isMissingValue = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    return trimmed === "" || trimmed === "null";
  };

  const inputClassName = (value: string) =>
    `w-full min-w-0 text-xs font-mono font-bold outline-none p-2 rounded transition-all border ${
      isMissingValue(value)
        ? "bg-amber/40 border-amber text-[crimson] focus:border-amber focus:ring-1 focus:ring-amber-light"
        : "text-navy bg-surface border-border-strong hover:border-border-strong focus:border-navy-light focus:ring-1 focus:ring-info-bg"
    }`;

  const getConfidenceColor = (score: number | null) => {
    if (!score) return "bg-border";
    if (score >= 90) return "bg-green";
    if (score >= 70) return "bg-info";
    return "bg-red";
  };

  const getConfidenceBg = (score: number | null) => {
    if (!score) return "bg-surface2 text-text2";
    if (score >= 90) return "bg-green-bg text-green border-green/20";
    if (score >= 70) return "bg-info-bg text-navy border-border";
    return "bg-red/10 text-red border-red/20";
  };

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Title Header */}
      <div className="p-3 border-b border-border bg-surface2 flex justify-between items-center shrink-0">
        <div className="min-w-0">
          <h3 className="font-extrabold text-navy text-xs md:text-sm truncate" title={pole.name}>
            {pole.name}
          </h3>
          <p className="text-[10px] text-text3 font-semibold uppercase tracking-wider mt-0.5">상세 분석 및 수기 검증</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pole.isSample && (
            <span className="text-[10px] bg-info-bg text-navy border border-border px-2 py-0.5 rounded font-bold">
              샘플 이미지
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-text3 hover:text-text2 p-1 hover:bg-surface2 rounded"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Split Layout: Left Image, Right Text */}
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LEFT SIDE: Image Preview */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-surface2 rounded p-2.5 border border-border relative group h-48 lg:h-auto min-h-[200px]">
            <img
              src={croppedUrl || pole.url}
              alt={pole.name}
              className="max-w-full max-h-full object-contain rounded border border-border shadow-2xs bg-surface relative transition-transform duration-300 ease-out cursor-zoom-in group-hover:scale-200 group-hover:z-20 group-hover:shadow-lg"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-2 left-2 bg-black/75 text-[9px] font-semibold text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
번호판 미리보기
            </div>
          </div>

          {/* RIGHT SIDE: Extraction Form / Status */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            {/* Status: IDLE */}
            {pole.status === "idle" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <Sparkles className="w-8 h-8 mb-2 text-navy animate-pulse" />
                <h4 className="font-extrabold text-gray-800 text-xs uppercase tracking-wider">아직 분석되지 않은 이미지</h4>
                <p className="text-[11px] text-text3 mt-1 max-w-[240px] leading-relaxed">
                  인공지능(Gemini 3.5 Flash)을 가동하여 전주번호찰 이미지 속 선로명과 선로번호를 검출해보세요.
                </p>
                <button
                  onClick={() => onAnalyze(pole.id)}
                  className="mt-3 px-4 py-2 bg-navy hover:bg-navy-dark text-white font-bold text-xs rounded shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  AI 분석 시작하기
                </button>
              </div>
            )}

            {/* Status: PROCESSING */}
            {pole.status === "processing" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <div className="relative mb-3">
                  <div className="w-10 h-10 rounded-full border-4 border-border border-t-blue-600 animate-spin" />
                  <Sparkles className="w-4 h-4 text-navy absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h4 className="font-extrabold text-gray-800 text-xs uppercase tracking-wider">AI 이미지 판독 중...</h4>
                <div className="text-[11px] text-text3 mt-1.5 space-y-0.5 max-w-[260px] leading-normal">
                  <p className="font-bold text-navy animate-pulse">이미지 고화질 스캔 완료</p>
                  <p>선로명 및 숫자 패턴 검출 중...</p>
                </div>
              </div>
            )}

            {/* Status: FAILED */}
            {pole.status === "failed" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <ShieldAlert className="w-10 h-10 text-red mb-2" />
                <h4 className="font-extrabold text-red text-xs uppercase tracking-wider">선로 정보 추출 실패</h4>
                <p className="text-[11px] text-red mt-1 max-w-[240px] leading-relaxed font-semibold">
                  {pole.error || "이미지가 흐리거나 전주번호찰이 확인되지 않아 정보를 추출할 수 없었습니다."}
                </p>
                <button
                  onClick={() => onAnalyze(pole.id)}
                  className="mt-3 px-3 py-1.5 bg-red/15 hover:bg-red/25 text-red font-bold text-[11px] rounded transition-colors"
                >
                  다시 분석하기
                </button>
              </div>
            )}

            {/* Status: COMPLETED */}
            {pole.status === "completed" && (
              <div className="flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-3">
                  {/* Confidence bar */}
                  <div className="flex items-center justify-between bg-surface2 p-2 rounded border border-border">
                    <div className="flex items-center gap-1.5 text-[11px] text-text3 font-bold uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5 text-navy" />
                      AI 신뢰도 지수
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-border rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full ${getConfidenceColor(pole.confidence)}`} 
                          style={{ width: `${pole.confidence || 0}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-extrabold border px-1.5 py-0.2 rounded ${getConfidenceBg(pole.confidence)}`}>
                        {pole.confidence ? `${pole.confidence}%` : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-normal text-text3 shrink-0 whitespace-nowrap w-16">선로명</label>
                      <input
                        type="text"
                        value={lineName}
                        onChange={(e) => setLineName(e.target.value)}
                        placeholder="예: 신안선, 덕적선"
                        className={inputClassName(lineName)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-normal text-text3 shrink-0 whitespace-nowrap w-16">전산화번호</label>
                      <input
                        type="text"
                        value={computerizedNumber}
                        onChange={(e) => setComputerizedNumber(e.target.value)}
                        placeholder="예: 9281L321"
                        className={inputClassName(computerizedNumber)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-normal text-text3 shrink-0 whitespace-nowrap w-16">선로번호</label>
                      <input
                        type="text"
                        value={lineNumber}
                        onChange={(e) => setLineNumber(e.target.value)}
                        placeholder="예: 12, 15L2, 42-1"
                        className={inputClassName(lineNumber)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-normal text-text3 block uppercase tracking-wider">기타 정보 및 좌표</label>
                    <input
                      type="text"
                      value={extraInfo}
                      onChange={(e) => setExtraInfo(e.target.value)}
                      placeholder="예: 22.9kV, 제작년도, 좌표 등"
                      className={inputClassName(extraInfo)}
                    />
                  </div>

                  {pole.reasoning && (
                    <div className="bg-info-bg/40 border border-border rounded p-2.5 space-y-1">
                      <h5 className="text-[9px] font-extrabold text-navy flex items-center gap-1 uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        AI 분석 근거
                      </h5>
                      <p className="text-[11px] text-text2 leading-normal font-medium">
                        {pole.reasoning}
                      </p>
                    </div>
                  )}
                </div>

                {/* Save button and actions */}
                <div className="pt-2 shrink-0 border-t border-border flex items-center gap-2 justify-end">
                  <span className="text-[9px] text-text3 mr-auto font-medium">
                    * 판독 오류 발생 시 값을 수정한 후 저장할 수 있습니다.
                  </span>
                  
                  <button
                    onClick={handleSave}
                    className={`px-3 py-1.5 font-bold text-xs rounded flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                      isSaved
                        ? "bg-green hover:bg-green/90 text-white"
                        : "bg-navy hover:bg-navy-dark text-white"
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        저장 완료!
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        수정 내용 저장
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

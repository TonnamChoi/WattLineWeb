import React, { useState, useEffect, useRef } from "react";
import { PruningRecord, DiameterCounts } from "../types";
import { cropToBoundingBox } from "../lib/cropImage";
import { resizeImageFile } from "../lib/resizeImage";
import {
  Sparkles, Loader2, Play, CheckCircle2, ShieldAlert, Zap, X, Save, MapPin, Plus, Trash2,
} from "lucide-react";

interface PruningDetailProps {
  record: PruningRecord | null;
  onAnalyze: (id: string) => void;
  onUpdateInfo: (id: string, updatedFields: Partial<PruningRecord>) => void;
  onClose?: () => void;
}

const EMPTY_COUNTS: DiameterCounts = { under10: 0, over10: 0, over20: 0, over30: 0, over40: 0, total: 0 };

export default function PruningDetail({ record, onAnalyze, onUpdateInfo, onClose }: PruningDetailProps) {
  const [poleStart, setPoleStart] = useState("");
  const [poleEnd, setPoleEnd] = useState("");
  const [treeSpecies, setTreeSpecies] = useState("");
  const [counts, setCounts] = useState<DiameterCounts>(EMPTY_COUNTS);
  const [note, setNote] = useState("");
  const [workIntensity, setWorkIntensity] = useState("");
  const [treeClassification, setTreeClassification] = useState("");
  const [spanDescription, setSpanDescription] = useState("");
  const [workContent, setWorkContent] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [isUploadingExtra, setIsUploadingExtra] = useState(false);
  const extraPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (record) {
      setPoleStart(record.poleStart || "");
      setPoleEnd(record.poleEnd || "");
      setTreeSpecies(record.treeSpecies || "");
      setCounts(record.diameterCounts || EMPTY_COUNTS);
      setNote(record.note || "");
      setWorkIntensity(record.workIntensity || "");
      setTreeClassification(record.treeClassification || "");
      setSpanDescription(record.spanDescription || "");
      setWorkContent(record.workContent || "");
      setIsSaved(false);
    }
  }, [record?.id, record?.poleStart, record?.poleEnd, record?.treeSpecies, record?.diameterCounts, record?.note, record?.workIntensity, record?.treeClassification, record?.spanDescription, record?.workContent]);

  useEffect(() => {
    const box = record?.boundingBox;
    if (!record || !box) {
      setCroppedUrl(null);
      return;
    }
    let cancelled = false;
    cropToBoundingBox(record.url, box)
      .then((url) => {
        if (!cancelled) setCroppedUrl(url);
      })
      .catch(() => {
        if (!cancelled) setCroppedUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [record?.id, record?.url, record?.boundingBox?.x, record?.boundingBox?.y, record?.boundingBox?.width, record?.boundingBox?.height]);

  if (!record) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center p-8 text-center text-gray-400">
        <MapPin className="w-10 h-10 mb-2 stroke-1 text-gray-300" />
        <h4 className="font-extrabold text-gray-700 text-xs uppercase tracking-wider mb-1">상세 정보 패널</h4>
        <p className="text-[11px] text-gray-400 max-w-[280px] leading-relaxed">
          목록에서 전지작업 사진을 선택하면 상세 정보 및 분석 결과가 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  const handleCountChange = (field: keyof DiameterCounts, value: string) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setCounts((prev) => ({ ...prev, [field]: num }));
  };

  const handleSave = () => {
    onUpdateInfo(record.id, {
      poleStart: poleStart.trim() || null,
      poleEnd: poleEnd.trim() || null,
      treeSpecies: treeSpecies.trim() || null,
      diameterCounts: counts,
      note: note.trim() || null,
      workIntensity: workIntensity.trim() || null,
      treeClassification: treeClassification.trim() || null,
      spanDescription: spanDescription.trim() || null,
      workContent: workContent.trim() || null,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAddExtraPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    e.target.value = "";

    const remainingSlots = Math.max(0, 2 - record.extraPhotoUrls.length);
    const toUpload: File[] = [];
    for (let i = 0; i < files.length && toUpload.length < remainingSlots; i++) {
      toUpload.push(files[i]);
    }
    if (toUpload.length === 0) return;

    setIsUploadingExtra(true);
    const uploadedUrls: string[] = [];
    for (const file of toUpload) {
      try {
        const { url: dataUrl, mimeType } = await resizeImageFile(file);
        const res = await fetch("/api/pruning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, mimeType, dataUrl }),
        });
        const data = await res.json();
        if (res.ok) uploadedUrls.push(data.url);
      } catch {
        // 개별 업로드 실패는 조용히 건너뛴다 (전체 저장 흐름을 막지 않음)
      }
    }
    setIsUploadingExtra(false);
    if (uploadedUrls.length > 0) {
      onUpdateInfo(record.id, { extraPhotoUrls: [...record.extraPhotoUrls, ...uploadedUrls] });
    }
  };

  const handleRemoveExtraPhoto = (url: string) => {
    onUpdateInfo(record.id, { extraPhotoUrls: record.extraPhotoUrls.filter((u) => u !== url) });
  };

  const getConfidenceColor = (score: number | null) => {
    if (!score) return "bg-gray-200";
    if (score >= 90) return "bg-green-500";
    if (score >= 70) return "bg-blue-500";
    return "bg-red-500";
  };

  const getConfidenceBg = (score: number | null) => {
    if (!score) return "bg-gray-100 text-gray-700";
    if (score >= 90) return "bg-green-50 text-green-700 border-green-100";
    if (score >= 70) return "bg-blue-50 text-blue-700 border-blue-100";
    return "bg-red-50 text-red-700 border-red-100";
  };

  const inputClassName =
    "w-full min-w-0 text-xs font-mono font-bold outline-none p-2 rounded transition-all border text-blue-700 bg-white border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-100";

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
        <div className="min-w-0">
          <h3 className="font-extrabold text-gray-900 text-xs md:text-sm truncate" title={record.name}>
            {record.name}
          </h3>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">전지작업 상세 분석 및 수기 검증</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 hover:bg-gray-100 rounded" title="닫기">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-gray-50 rounded p-2.5 border border-gray-200 relative group h-48 lg:h-auto min-h-[200px]">
            <img
              src={croppedUrl || record.url}
              alt={record.name}
              className="max-w-full max-h-full object-contain rounded border border-gray-200 shadow-2xs bg-white relative transition-transform duration-300 ease-out cursor-zoom-in group-hover:scale-200 group-hover:z-20 group-hover:shadow-lg"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-2 left-2 bg-black/75 text-[9px] font-semibold text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
              대표 사진 미리보기
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between">
            {record.status === "idle" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <Sparkles className="w-8 h-8 mb-2 text-blue-600 animate-pulse" />
                <h4 className="font-extrabold text-gray-800 text-xs uppercase tracking-wider">아직 분석되지 않은 사진</h4>
                <p className="text-[11px] text-gray-400 mt-1 max-w-[240px] leading-relaxed">
                  AI를 가동하여 나무 종류, 굵기 구간, 작업강도 등을 검출해보세요.
                </p>
                <button
                  onClick={() => onAnalyze(record.id)}
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  AI 분석 시작하기
                </button>
              </div>
            )}

            {record.status === "processing" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <div className="relative mb-3">
                  <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                  <Sparkles className="w-4 h-4 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h4 className="font-extrabold text-gray-800 text-xs uppercase tracking-wider">AI 사진 판독 중...</h4>
              </div>
            )}

            {record.status === "failed" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <ShieldAlert className="w-10 h-10 text-red-500 mb-2" />
                <h4 className="font-extrabold text-red-800 text-xs uppercase tracking-wider">전지작업 정보 추출 실패</h4>
                <p className="text-[11px] text-red-600 mt-1 max-w-[240px] leading-relaxed font-semibold">
                  {record.error || "사진이 흐리거나 나무가 확인되지 않아 정보를 추출할 수 없었습니다."}
                </p>
                <button
                  onClick={() => onAnalyze(record.id)}
                  className="mt-3 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-[11px] rounded transition-colors"
                >
                  다시 분석하기
                </button>
              </div>
            )}

            {record.status === "completed" && (
              <div className="flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5 text-blue-600" />
                      AI 신뢰도 지수
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full ${getConfidenceColor(record.confidence)}`} style={{ width: `${record.confidence || 0}%` }} />
                      </div>
                      <span className={`text-[10px] font-extrabold border px-1.5 py-0.2 rounded ${getConfidenceBg(record.confidence)}`}>
                        {record.confidence ? `${record.confidence}%` : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-normal text-gray-500 shrink-0 whitespace-nowrap w-16">전주(시작)</label>
                      <input type="text" value={poleStart} onChange={(e) => setPoleStart(e.target.value)} placeholder="예: 80R29L1" className={inputClassName} />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-normal text-gray-500 shrink-0 whitespace-nowrap w-16">전주(끝)</label>
                      <input type="text" value={poleEnd} onChange={(e) => setPoleEnd(e.target.value)} placeholder="예: 80R29L2" className={inputClassName} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-normal text-gray-500 shrink-0 whitespace-nowrap w-16">수목종류</label>
                    <input type="text" value={treeSpecies} onChange={(e) => setTreeSpecies(e.target.value)} placeholder="예: 느티나무" className={inputClassName} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-normal text-gray-500 block uppercase tracking-wider">준공내역 (굵기별 본수)</label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                      {([
                        ["under10", "10미만"],
                        ["over10", "10이상"],
                        ["over20", "20이상"],
                        ["over30", "30이상"],
                        ["over40", "40이상"],
                        ["total", "합계"],
                      ] as [keyof DiameterCounts, string][]).map(([field, label]) => (
                        <div key={field} className="flex flex-col items-center">
                          <span className="text-[9px] text-gray-400">{label}</span>
                          <input
                            type="number"
                            min={0}
                            value={counts[field]}
                            onChange={(e) => handleCountChange(field, e.target.value)}
                            className="w-full text-center text-xs font-mono font-bold p-1 rounded border border-gray-300 focus:border-blue-500 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-normal text-gray-500 shrink-0 whitespace-nowrap w-16">작업강도</label>
                      <input type="text" value={workIntensity} onChange={(e) => setWorkIntensity(e.target.value)} placeholder="강전지/약전지" className={inputClassName} />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-normal text-gray-500 shrink-0 whitespace-nowrap w-16">나무분류</label>
                      <input type="text" value={treeClassification} onChange={(e) => setTreeClassification(e.target.value)} placeholder="낙엽수/상록수" className={inputClassName} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-normal text-gray-500 block uppercase tracking-wider">경간구분</label>
                    <input type="text" value={spanDescription} onChange={(e) => setSpanDescription(e.target.value)} placeholder="예: 금가간 80R29L1 ~ 80R29L2" className={inputClassName} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-normal text-gray-500 block uppercase tracking-wider">작업내용</label>
                    <input type="text" value={workContent} onChange={(e) => setWorkContent(e.target.value)} placeholder="예: 느티나무 40cm이상 1주 (강전지)" className={inputClassName} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-normal text-gray-500 block uppercase tracking-wider">비고</label>
                    <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="비고" className={inputClassName} />
                  </div>

                  {record.reasoning && (
                    <div className="bg-blue-50/40 border border-blue-100 rounded p-2.5 space-y-1">
                      <h5 className="text-[9px] font-extrabold text-blue-800 flex items-center gap-1 uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        AI 분석 근거
                      </h5>
                      <p className="text-[11px] text-gray-600 leading-normal font-medium">{record.reasoning}</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-normal text-gray-500 block uppercase tracking-wider">참고 사진 (최대 2장)</label>
                    <input
                      ref={extraPhotoInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={handleAddExtraPhotos}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      {record.extraPhotoUrls.map((url) => (
                        <div key={url} className="relative w-14 h-14 rounded border border-gray-200 overflow-hidden group">
                          <img src={url} alt="참고 사진" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button
                            onClick={() => handleRemoveExtraPhoto(url)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {record.extraPhotoUrls.length < 2 && (
                        <button
                          onClick={() => extraPhotoInputRef.current?.click()}
                          disabled={isUploadingExtra}
                          className="w-14 h-14 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-400 transition-colors disabled:opacity-50"
                          title="참고 사진 추가"
                        >
                          {isUploadingExtra ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 shrink-0 border-t border-gray-200 flex items-center gap-2 justify-end">
                  <span className="text-[9px] text-gray-400 mr-auto font-medium">* 판독 오류 발생 시 값을 수정한 후 저장할 수 있습니다.</span>
                  <button
                    onClick={handleSave}
                    className={`px-3 py-1.5 font-bold text-xs rounded flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                      isSaved ? "bg-green-600 hover:bg-green-700 text-white" : "bg-[#1A1C1E] hover:bg-black text-white"
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

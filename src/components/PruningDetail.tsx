import React, { useState, useEffect, useRef } from "react";
import { PruningRecord, DiameterCounts, PhotoAnalysis, WORK_INTENSITY_OPTIONS, DEFAULT_WORK_INTENSITY } from "../types";
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
  // 표에서 클릭한 사진: 있으면 이 사진과 사진별 분석 결과를 보여준다
  photo?: { url: string; category: string; analysis?: PhotoAnalysis };
}

const EMPTY_COUNTS: DiameterCounts = { under10: 0, over10: 0, over20: 0, over30: 0, over40: 0, total: 0 };

export default function PruningDetail({ record, photo, onAnalyze, onUpdateInfo, onClose }: PruningDetailProps) {
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
      setWorkIntensity(record.workIntensity || DEFAULT_WORK_INTENSITY);
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
      <div className="bg-panel border border-line rounded-lg flex flex-col items-center justify-center p-8 text-center text-text-soft">
        <MapPin className="w-10 h-10 mb-2 stroke-1 text-text-soft" />
        <h4 className="font-extrabold text-text-soft text-xs uppercase tracking-wider mb-1">상세 정보 패널</h4>
        <p className="text-[11px] text-text-soft max-w-[280px] leading-relaxed">
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
    if (!score) return "bg-line";
    if (score >= 90) return "bg-green";
    if (score >= 70) return "bg-blue";
    return "bg-red";
  };

  const getConfidenceBg = (score: number | null) => {
    if (!score) return "bg-panel-2 text-text-soft";
    if (score >= 90) return "bg-green/15 text-green border-green/20";
    if (score >= 70) return "bg-blue/15 text-blue border-line";
    return "bg-red/10 text-red border-red/20";
  };

  // 클릭한 사진 분류에 맞는 칸만 보여준다 (시작전주: 전주(시작), 종료전주: 전주(끝), 흉고직경: 준공내역·작업강도·나무분류)
  const only = photo?.category;
  const show = {
    poleStart: !only || only === "시작전주" || !["종료전주", "흉고직경"].includes(only),
    poleEnd: !only || only === "종료전주" || !["시작전주", "흉고직경"].includes(only),
    diameter: !only || !["시작전주", "종료전주"].includes(only),
    rest: !only || !["시작전주", "종료전주", "흉고직경"].includes(only),
  };

  const inputClassName =
    "w-full min-w-0 text-xs font-mono font-bold outline-none p-2 rounded-lg transition-all border text-blue bg-panel border-text-soft/40 hover:border-text-soft/40 focus:border-blue focus:ring-1 focus:ring-blue/20";

  return (
    <div className="bg-panel border border-line rounded-lg overflow-hidden flex flex-col">
      <div className="p-3 border-b border-line bg-panel-2 flex justify-between items-center shrink-0">
        <div className="min-w-0">
          <h3 className="font-extrabold text-text text-xs md:text-sm truncate" title={record.name}>
            {record.name}
          </h3>
          <p className="text-[10px] text-text-soft font-semibold uppercase tracking-wider mt-0.5">전지작업 상세 분석 및 수기 검증</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-text-soft hover:text-text-soft p-1 hover:bg-panel-2 rounded-lg" title="닫기">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-panel-2 rounded-lg p-2.5 border border-line relative group h-48 lg:h-auto min-h-[200px]">
            <img
              src={photo?.url || croppedUrl || record.url}
              alt={record.name}
              className="max-w-full max-h-full object-contain rounded-lg border border-line bg-panel relative transition-transform duration-300 ease-out cursor-zoom-in group-hover:scale-200 group-hover:z-20 group-hover:shadow-card"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-2 left-2 bg-black/75 text-[9px] font-semibold text-white px-1.5 py-0.5 rounded-lg uppercase tracking-wider">
              {photo ? `${photo.category} 사진` : "대표 사진 미리보기"}
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between">
            {record.status === "idle" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <Sparkles className="w-8 h-8 mb-2 text-blue animate-pulse" />
                <h4 className="font-extrabold text-text text-xs uppercase tracking-wider">아직 분석되지 않은 사진</h4>
                <p className="text-[11px] text-text-soft mt-1 max-w-[240px] leading-relaxed">
                  AI를 가동하여 나무 종류, 굵기 구간, 작업강도 등을 검출해보세요.
                </p>
                <button
                  onClick={() => onAnalyze(record.id)}
                  className="mt-3 px-4 py-2 bg-blue hover:bg-blue-hover text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  AI 분석 시작하기
                </button>
              </div>
            )}

            {record.status === "processing" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <div className="relative mb-3">
                  <div className="w-10 h-10 rounded-full border-4 border-line border-t-blue-600 animate-spin" />
                  <Sparkles className="w-4 h-4 text-blue absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h4 className="font-extrabold text-text text-xs uppercase tracking-wider">AI 사진 판독 중...</h4>
              </div>
            )}

            {record.status === "failed" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <ShieldAlert className="w-10 h-10 text-red mb-2" />
                <h4 className="font-extrabold text-red text-xs uppercase tracking-wider">전지작업 정보 추출 실패</h4>
                <p className="text-[11px] text-red mt-1 max-w-[240px] leading-relaxed font-semibold">
                  {record.error || "사진이 흐리거나 나무가 확인되지 않아 정보를 추출할 수 없었습니다."}
                </p>
                <button
                  onClick={() => onAnalyze(record.id)}
                  className="mt-3 px-3 py-1.5 bg-red/15 hover:bg-red/25 text-red font-bold text-[11px] rounded-lg transition-colors"
                >
                  다시 분석하기
                </button>
              </div>
            )}

            {record.status === "completed" && (
              <div className="flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-3">
                  {photo?.analysis && (
                    <div className="bg-violet-soft border border-line rounded-lg p-2.5 space-y-1">
                      <h5 className="text-[11px] font-extrabold text-text flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {photo.category} 사진 분석 결과
                        {photo.analysis.confidence != null && (
                          <span className="ml-auto text-[10px] font-extrabold text-green">정확도 {photo.analysis.confidence}%</span>
                        )}
                      </h5>
                      <p className="text-[11px] text-text leading-normal font-medium whitespace-pre-line">
                        {photo.analysis.message || "자세한 내용이 없습니다."}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between bg-panel-2 p-2 rounded-lg border border-line">
                    <div className="flex items-center gap-1.5 text-[11px] text-text-soft font-bold uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5 text-blue" />
                      AI 신뢰도 지수
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-line rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full ${getConfidenceColor(record.confidence)}`} style={{ width: `${record.confidence || 0}%` }} />
                      </div>
                      <span className={`text-[10px] font-extrabold border px-1.5 py-0.2 rounded-lg ${getConfidenceBg(record.confidence)}`}>
                        {record.confidence ? `${record.confidence}%` : "-"}
                      </span>
                    </div>
                  </div>

                  {(show.poleStart || show.poleEnd) && (
                    <div className="grid grid-cols-2 gap-3">
                      {show.poleStart && (
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-normal text-text-soft shrink-0 whitespace-nowrap w-16">전주(시작)</label>
                          <input type="text" value={poleStart} onChange={(e) => setPoleStart(e.target.value)} placeholder="예: 80R29L1" className={inputClassName} />
                        </div>
                      )}
                      {show.poleEnd && (
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-normal text-text-soft shrink-0 whitespace-nowrap w-16">전주(끝)</label>
                          <input type="text" value={poleEnd} onChange={(e) => setPoleEnd(e.target.value)} placeholder="예: 80R29L2" className={inputClassName} />
                        </div>
                      )}
                    </div>
                  )}

                  {show.rest && (
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-normal text-text-soft shrink-0 whitespace-nowrap w-16">수목종류</label>
                      <input type="text" value={treeSpecies} onChange={(e) => setTreeSpecies(e.target.value)} placeholder="예: 느티나무" className={inputClassName} />
                    </div>
                  )}

                  {show.diameter && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-normal text-text-soft block uppercase tracking-wider">준공내역 (굵기별 본수)</label>
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
                          <span className="text-[9px] text-text-soft">{label}</span>
                          <input
                            type="number"
                            min={0}
                            value={counts[field]}
                            onChange={(e) => handleCountChange(field, e.target.value)}
                            className="w-full text-center text-xs font-mono font-bold p-1 rounded-lg border border-text-soft/40 focus:border-blue outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  {show.diameter && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-normal text-text-soft shrink-0 whitespace-nowrap w-16">작업강도</label>
                      <select value={workIntensity} onChange={(e) => setWorkIntensity(e.target.value)} className={inputClassName}>
                        {(WORK_INTENSITY_OPTIONS.includes(workIntensity) ? WORK_INTENSITY_OPTIONS : [...WORK_INTENSITY_OPTIONS, workIntensity]).map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-normal text-text-soft shrink-0 whitespace-nowrap w-16">나무분류</label>
                      <input type="text" value={treeClassification} onChange={(e) => setTreeClassification(e.target.value)} placeholder="낙엽수/상록수" className={inputClassName} />
                    </div>
                  </div>
                  )}

                  {show.rest && (
                  <>

                  <div className="space-y-1">
                    <label className="text-[11px] font-normal text-text-soft block uppercase tracking-wider">경간구분</label>
                    <input type="text" value={spanDescription} onChange={(e) => setSpanDescription(e.target.value)} placeholder="예: 금가간 80R29L1 ~ 80R29L2" className={inputClassName} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-normal text-text-soft block uppercase tracking-wider">작업내용</label>
                    <input type="text" value={workContent} onChange={(e) => setWorkContent(e.target.value)} placeholder="예: 느티나무 40cm이상 1주 (강전지)" className={inputClassName} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-normal text-text-soft block uppercase tracking-wider">비고</label>
                    <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="비고" className={inputClassName} />
                  </div>

                  {record.reasoning && (
                    <div className="bg-blue/40 border border-line rounded-lg p-2.5 space-y-1">
                      <h5 className="text-[9px] font-extrabold text-text flex items-center gap-1 uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        AI 분석 근거
                      </h5>
                      <p className="text-[11px] text-text-soft leading-normal font-medium">{record.reasoning}</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-normal text-text-soft block uppercase tracking-wider">참고 사진 (최대 2장)</label>
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
                        <div key={url} className="relative w-14 h-14 rounded-lg border border-line overflow-hidden group">
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
                          className="w-14 h-14 rounded-lg border border-dashed border-text-soft/40 flex items-center justify-center text-text-soft hover:text-blue hover:border-blue transition-colors disabled:opacity-50"
                          title="참고 사진 추가"
                        >
                          {isUploadingExtra ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                  </>
                  )}
                </div>

                <div className="pt-2 shrink-0 border-t border-line flex items-center gap-2 justify-end">
                  <span className="text-[9px] text-text-soft mr-auto font-medium">* 판독 오류 발생 시 값을 수정한 후 저장할 수 있습니다.</span>
                  <button
                    onClick={handleSave}
                    className={`px-3 py-1.5 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all  cursor-pointer ${ isSaved ? "bg-green hover:bg-green/90 text-white" : "bg-blue hover:bg-blue-hover text-white" }`}
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

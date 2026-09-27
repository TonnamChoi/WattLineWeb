import React, { useState } from "react";
import { PruningRecord, DiameterCounts, WattlineCategory, PhotoAnalysis, WORK_INTENSITY_OPTIONS, DEFAULT_WORK_INTENSITY } from "../types";
import { Search, Trash2, CheckCircle2, Play, Loader2, ImageOff, X, Save } from "lucide-react";

interface PruningTableProps {
  records: PruningRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAnalyze: (id: string) => void;
  onUpdate: (id: string, updatedFields: Partial<PruningRecord>) => void;
  // 업로드 사진을 분류 칸에 드롭했을 때 (WattLineApp 사진 행에서만 동작)
  onDropPhoto?: (recordId: string, category: WattlineCategory, pathname: string) => void;
  // 분류 칸 사진 삭제 (WattLineApp 사진 행에서만 동작)
  onDeletePhoto?: (recordId: string, category: WattlineCategory, url: string) => void;
  // 줄의 값을 DB에 저장 (WattLineApp 사진 행에서만 동작)
  onSave?: (recordId: string) => void;
  // 상세보기 창 열기 (분석완료 라벨 클릭)
  onOpenDetail?: (recordId: string, photo: { url: string; category: string }) => void;
  // 같은 칸 안에서 사진 순서 변경
  onReorderPhotos?: (recordId: string, category: WattlineCategory, urls: string[]) => void;
  // 표 머리 왼쪽에 들어갈 내용 (작업장 선택)
  headerLeft?: React.ReactNode;
  saveStatus?: Record<string, "saving" | "saved" | null>;
  // 줄별 저장할 내용 있음 여부 (있으면 저장 버튼을 보라색으로)
  unsaved?: Record<string, boolean>;
}

// 업로드 섹션의 사진을 끌어올 때 쓰는 드래그 데이터 형식 (PruningWork와 공유)
export const UPLOAD_DRAG_TYPE = "application/x-wattline-upload";

// 표 안에서 바로 값을 고치는 텍스트 입력. 클릭 시 행 선택(onSelect)으로 전파되지 않도록 막는다.
function EditableText({
  value,
  onChange,
  align = "left",
  className = "",
}: {
  value: string | null;
  onChange: (value: string) => void;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      placeholder="-"
      className={`w-full min-w-[60px] bg-input outline-none rounded-lg px-1 py-0.5 hover:bg-panel-2 focus:bg-panel focus:ring-1 focus:ring-blue ${ align === "center" ? "text-center" : "" } ${className}`}
    />
  );
}

// 작업강도 선택 (약전지/강전지/순치기/벌목, 값이 없으면 약전지). 목록에 없는 기존 값은 선택지로 함께 보여준다.
function WorkIntensitySelect({ value, onChange }: { value: string | null; onChange: (value: string) => void }) {
  const current = value || DEFAULT_WORK_INTENSITY;
  const options = WORK_INTENSITY_OPTIONS.includes(current) ? WORK_INTENSITY_OPTIONS : [...WORK_INTENSITY_OPTIONS, current];
  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="w-full min-w-[70px] bg-input outline-none rounded-lg px-1 py-0.5 text-center hover:bg-panel-2 focus:bg-panel focus:ring-1 focus:ring-blue"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// 지름 구간별 개수 입력. 합계는 여기서 계산해 넘기므로 별도 입력칸이 없다.
function EditableCount({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      onClick={(e) => e.stopPropagation()}
      className="w-12 bg-input outline-none text-center font-mono rounded-lg px-0.5 py-0.5 hover:bg-panel-2 focus:bg-panel focus:ring-1 focus:ring-blue"
    />
  );
}

// 썸네일에 마우스를 올리면 커서 옆에 확대 이미지를 띄워주는 래퍼. fixed 포지셔닝이라 테이블의 overflow-x-auto에 잘리지 않는다.
function HoverPreview({ src, alt, children }: { src: string | null; alt: string; children: React.ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  if (!src) return <>{children}</>;

  return (
    <div
      className="inline-flex"
      onMouseEnter={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && (
        <div
          className="fixed z-50 pointer-events-none p-1 bg-panel border border-line rounded-lg shadow-card"
          style={{
            left: Math.min(pos.x + 16, window.innerWidth - 320),
            top: Math.min(pos.y + 16, window.innerHeight - 320),
          }}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-[300px] max-h-[300px] object-contain rounded-lg"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}

function PhotoThumb({ url }: { url?: string | null }) {
  if (!url) {
    return (
      <div className="w-16 h-22 inline-flex items-center justify-center text-text-soft">
        <ImageOff className="w-5 h-5" />
      </div>
    );
  }
  return (
    <div className="w-16 h-22 rounded-lg bg-panel-2 border border-line overflow-hidden inline-flex items-center justify-center">
      <img src={url} alt="참고 사진" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
    </div>
  );
}

// 사진 위 분석 상태 라벨 (누르면 결과·사유 팝업)
const PHOTO_STATUS: Record<PhotoAnalysis["status"], { label: string; className: string }> = {
  processing: { label: "분석중", className: "text-blue" },
  completed: { label: "분석완료", className: "text-green" },
  failed: { label: "분석에러", className: "text-red" },
  unreadable: { label: "판독불가", className: "text-amber" },
};

const TH = "py-2 px-3 text-center border-r border-b border-blue/50 bg-panel-2 text-text-soft font-medium whitespace-nowrap";

const PHOTO_CATEGORIES: WattlineCategory[] = ["시작전주", "종료전주", "작업전", "흉고직경", "작업후", "기타"];

// WattLine DB에서 불러온 행은 분류별 실제 사진(여러 장 가능)을, 수동 업로드 행은 대표 사진을 "작업전" 칸에 보여준다.
function getCategoryPhotoUrls(record: PruningRecord, category: WattlineCategory): string[] {
  if (record.wattlineCategoryPhotos) return record.wattlineCategoryPhotos[category] || [];
  return category === "작업전" && record.url ? [record.url] : [];
}

export default function PruningTable({
  records,
  selectedId,
  onSelect,
  onRemove,
  onAnalyze,
  onUpdate,
  onDropPhoto,
  onDeletePhoto,
  onSave,
  onOpenDetail,
  headerLeft,
  onReorderPhotos,
  saveStatus,
  unsaved,
}: PruningTableProps) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  // 같은 칸 안 사진 순서 바꾸기: 끌고 있는 사진과 놓을 위치의 사진
  const [reorderDrag, setReorderDrag] = useState<{ recordId: string; category: WattlineCategory; url: string } | null>(null);
  const [reorderOver, setReorderOver] = useState<string | null>(null);
  const [confirmDeleteUrl, setConfirmDeleteUrl] = useState<string | null>(null);
  const [analysisPopup, setAnalysisPopup] = useState<{ category: string; analysis: PhotoAnalysis } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedErrorId, setCopiedErrorId] = useState<string | null>(null);

  const handleCountChange = (record: PruningRecord, field: keyof Omit<DiameterCounts, "total">, value: number) => {
    const current = record.diameterCounts || { under10: 0, over10: 0, over20: 0, over30: 0, over40: 0, total: 0 };
    const updated: DiameterCounts = { ...current, [field]: value };
    updated.total = updated.under10 + updated.over10 + updated.over20 + updated.over30 + updated.over40;
    onUpdate(record.id, { diameterCounts: updated });
  };

  const handleCopyError = (record: PruningRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!record.error) return;
    navigator.clipboard.writeText(record.error).then(() => {
      setCopiedErrorId(record.id);
      setTimeout(() => setCopiedErrorId((prev) => (prev === record.id ? null : prev)), 1500);
    });
  };

  const filteredRecords = records.filter((record) => {
    const term = searchTerm.toLowerCase();
    return (
      record.treeSpecies?.toLowerCase().includes(term) ||
      record.poleStart?.toLowerCase().includes(term) ||
      record.poleEnd?.toLowerCase().includes(term) ||
      record.spanDescription?.toLowerCase().includes(term) ||
      record.name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-panel border border-blue/50 rounded-lg overflow-hidden">
      <div className="p-3.5 border-b border-blue/50 bg-panel-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>{headerLeft}</div>

          <div className="relative md:max-w-[240px] w-full">
            <Search className="w-3.5 h-3.5 text-text-soft absolute left-2.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="수목종류, 전주번호, 파일명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2.5 py-1 w-full text-xs border border-text-soft/40 rounded-lg outline-none hover:border-text-soft/40 focus:border-blue transition-all bg-panel font-medium"
            />
          </div>
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="py-12 text-center text-text-soft text-[11px]">
          {searchTerm ? "검색 결과와 일치하는 데이터가 없습니다." : "표시할 분석 결과 데이터가 없습니다."}
        </div>
      ) : (
        <>
          {/* 1행: 전주번호/수목종류/준공내역/비고/작업강도/나무분류/경간구분/작업내용 */}
          <table className="w-full text-left border-collapse">
            <thead className="text-text-soft font-bold text-[10px] uppercase tracking-wider">
              <tr>
                <th className={TH} colSpan={2} rowSpan={1}>전주번호</th>
                <th className={TH} rowSpan={2}>수목종류</th>
                <th className={TH} colSpan={6}>준공내역</th>
                <th className={TH} rowSpan={2}>비고</th>
                <th className={TH} rowSpan={2}>작업 강도</th>
                <th className={TH} rowSpan={2}>나무 분류</th>
                <th className={TH} rowSpan={2}>경간 구분</th>
                <th className={TH} rowSpan={2}>작업 내용</th>
              </tr>
              <tr>
                <th className={TH}>시작</th>
                <th className={TH}>끝</th>
                <th className={`${TH} w-14`}>10cm 미만</th>
                <th className={`${TH} w-14`}>10cm 이상</th>
                <th className={`${TH} w-14`}>20cm 이상</th>
                <th className={`${TH} w-14`}>30cm 이상</th>
                <th className={`${TH} w-14`}>40cm 이상</th>
                <th className={`${TH} w-12`}>합계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue/50 font-medium">
              {filteredRecords.map((record) => {
                const isSelected = record.id === selectedId;
                const d = record.diameterCounts;
                return (
                  <tr
                    key={record.id}
                    onClick={() => onSelect(record.id)}
                    className={`text-[12px] cursor-pointer ${ isSelected ? "bg-violet-soft" : "" }`}
                  >
                    <td className="py-1 px-1 border-r border-blue/50 font-mono">
                      <EditableText value={record.poleStart} onChange={(v) => onUpdate(record.id, { poleStart: v })} align="center" />
                    </td>
                    <td className="py-1 px-1 border-r border-blue/50 font-mono">
                      <EditableText value={record.poleEnd} onChange={(v) => onUpdate(record.id, { poleEnd: v })} align="center" />
                    </td>
                    <td className="py-1 px-1 border-r border-blue/50">
                      <EditableText
                        value={record.treeSpecies}
                        onChange={(v) => onUpdate(record.id, { treeSpecies: v })}
                        className="font-extrabold text-text font-sans"
                      />
                    </td>
                    <td className="py-1 px-1 text-center border-r border-blue/50 font-mono">
                      <EditableCount value={d?.under10 ?? 0} onChange={(v) => handleCountChange(record, "under10", v)} />
                    </td>
                    <td className="py-1 px-1 text-center border-r border-blue/50 font-mono">
                      <EditableCount value={d?.over10 ?? 0} onChange={(v) => handleCountChange(record, "over10", v)} />
                    </td>
                    <td className="py-1 px-1 text-center border-r border-blue/50 font-mono">
                      <EditableCount value={d?.over20 ?? 0} onChange={(v) => handleCountChange(record, "over20", v)} />
                    </td>
                    <td className="py-1 px-1 text-center border-r border-blue/50 font-mono">
                      <EditableCount value={d?.over30 ?? 0} onChange={(v) => handleCountChange(record, "over30", v)} />
                    </td>
                    <td className="py-1 px-1 text-center border-r border-blue/50 font-mono">
                      <EditableCount value={d?.over40 ?? 0} onChange={(v) => handleCountChange(record, "over40", v)} />
                    </td>
                    <td className="py-2 px-3 text-center border-r border-blue/50 font-mono font-extrabold">{d?.total ?? 0}</td>
                    <td className="py-1 px-1 border-r border-blue/50">
                      <EditableText value={record.note} onChange={(v) => onUpdate(record.id, { note: v })} className="text-text-soft" />
                    </td>
                    <td className="py-1 px-1 border-r border-blue/50">
                      <WorkIntensitySelect value={record.workIntensity} onChange={(v) => onUpdate(record.id, { workIntensity: v })} />
                    </td>
                    <td className="py-1 px-1 border-r border-blue/50">
                      <EditableText value={record.treeClassification} onChange={(v) => onUpdate(record.id, { treeClassification: v })} align="center" />
                    </td>
                    <td className="py-1 px-1 border-r border-blue/50">
                      <EditableText value={record.spanDescription} onChange={(v) => onUpdate(record.id, { spanDescription: v })} className="text-text-soft" />
                    </td>
                    <td className="py-1 px-1 border-r border-blue/50">
                      <EditableText value={record.workContent} onChange={(v) => onUpdate(record.id, { workContent: v })} className="text-text-soft" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 2행: 사진/기타 세부정보/정확도/판독상태/작업/삭제 */}
          <table className="w-full text-left border-collapse border-t-2 border-blue/50">
            <thead className="text-text-soft font-bold text-[10px] uppercase tracking-wider">
              <tr>
                <th className={TH} colSpan={6}>사진</th>
                <th className={TH} rowSpan={2}>기타 세부 정보</th>
                <th className={TH} rowSpan={2}>정확도</th>
                <th className={TH} rowSpan={2}>판독상태</th>
                <th className={TH} rowSpan={2}>작업</th>
                <th className={TH} rowSpan={2}>삭제</th>
              </tr>
              <tr>
                <th className={TH}>시작전주</th>
                <th className={TH}>종료전주</th>
                <th className={TH}>작업전</th>
                <th className={TH}>흉고직경</th>
                <th className={TH}>작업후</th>
                <th className={TH}>기타</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue/50 font-medium">
              {filteredRecords.map((record) => {
                const isSelected = record.id === selectedId;
                const isCompleted = record.status === "completed";
                return (
                  <tr
                    key={record.id}
                    onClick={() => onSelect(record.id)}
                    className={`text-[12px] cursor-pointer ${ isSelected ? "bg-violet-soft" : "" }`}
                  >
                    {PHOTO_CATEGORIES.map((category) => {
                      const photoUrls = getCategoryPhotoUrls(record, category);
                      const cellKey = `${record.id}|${category}`;
                      const canDrop = !!onDropPhoto && !!record.wattlineCategoryPhotos;
                      return (
                        <td
                          key={category}
                          className={`py-1 px-3 text-center border-r border-blue/50 transition-colors ${ dropTarget === cellKey ? "bg-violet-soft outline-2 outline-dashed outline-blue -outline-offset-2" : "" }`}
                          onDragOver={(e) => {
                            if (!canDrop || !e.dataTransfer.types.includes(UPLOAD_DRAG_TYPE)) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (dropTarget !== cellKey) setDropTarget(cellKey);
                          }}
                          onDragLeave={() => setDropTarget((t) => (t === cellKey ? null : t))}
                          onDrop={(e) => {
                            setDropTarget(null);
                            const pathname = e.dataTransfer.getData(UPLOAD_DRAG_TYPE);
                            if (!canDrop || !pathname) return;
                            e.preventDefault();
                            onDropPhoto!(record.id, category, pathname);
                          }}
                        >
                          {photoUrls.length === 0 ? (
                            <PhotoThumb url={null} />
                          ) : (
                            <div className="flex flex-wrap justify-center gap-1">
                              {photoUrls.map((url) => {
                                const canDelete = !!onDeletePhoto && !!record.wattlinePhotoIds?.[url];
                                const analysis = record.photoAnalysis?.[url];
                                return (
                                  <div
                                    key={url}
                                    draggable={!!onReorderPhotos && photoUrls.length > 1}
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.effectAllowed = "move";
                                      e.dataTransfer.setData("text/plain", url);
                                      setReorderDrag({ recordId: record.id, category, url });
                                    }}
                                    onDragOver={(e) => {
                                      const d = reorderDrag;
                                      if (!d || d.recordId !== record.id || d.category !== category || d.url === url) return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      e.dataTransfer.dropEffect = "move";
                                      if (reorderOver !== url) setReorderOver(url);
                                    }}
                                    onDragLeave={() => setReorderOver((o) => (o === url ? null : o))}
                                    onDrop={(e) => {
                                      const d = reorderDrag;
                                      setReorderOver(null);
                                      setReorderDrag(null);
                                      if (!d || d.recordId !== record.id || d.category !== category || d.url === url) return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // 끌던 사진을 놓은 사진 자리로 옮긴다
                                      const next = photoUrls.filter((u) => u !== d.url);
                                      next.splice(photoUrls.indexOf(url), 0, d.url);
                                      onReorderPhotos!(record.id, category, next);
                                    }}
                                    onDragEnd={() => {
                                      setReorderDrag(null);
                                      setReorderOver(null);
                                    }}
                                    title={onReorderPhotos && photoUrls.length > 1 ? "끌어다 놓으면 순서가 바뀝니다" : undefined}
                                    className={`flex flex-col items-center gap-0.5 rounded-lg ${ onReorderPhotos && photoUrls.length > 1 ? "cursor-grab active:cursor-grabbing" : "" } ${ reorderOver === url ? "outline-2 outline-dashed outline-blue outline-offset-1" : "" } ${ reorderDrag?.url === url ? "opacity-40" : "" }`}
                                  >
                                    <div className="h-5 flex items-center">
                                      {analysis && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // 분석완료: 상세보기 창(상세 내용·편집), 에러·판독불가: 사유 팝업
                                            if (analysis.status === "completed" && onOpenDetail) onOpenDetail(record.id, { url, category });
                                            else if (analysis.status !== "processing") setAnalysisPopup({ category, analysis });
                                          }}
                                          title={analysis.status === "processing" ? "분석 중입니다" : analysis.message || "자세한 내용이 없습니다."}
                                          className={`inline-flex items-center gap-0.5 font-semibold whitespace-nowrap ${PHOTO_STATUS[analysis.status].className} ${ analysis.status === "processing" ? "cursor-default" : "" }`}
                                        >
                                          {analysis.status === "processing" && <Loader2 className="w-3 h-3 animate-spin" />}
                                          {PHOTO_STATUS[analysis.status].label}
                                          {(analysis.status === "failed" || analysis.status === "unreadable") && "!"}
                                          {/* 돋보기: 누르면 분석 내용(읽은 값·에러 사유) 팝업 */}
                                          {analysis.status !== "processing" && <Search className="w-3.5 h-3.5" />}
                                        </button>
                                      )}
                                    </div>
                                  <div className="relative group/photo">
                                    <HoverPreview src={url} alt={category}>
                                      <PhotoThumb url={url} />
                                    </HoverPreview>
                                    {canDelete && confirmDeleteUrl !== url && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDeleteUrl(url);
                                        }}
                                        title="사진 삭제"
                                        className="absolute top-1 right-1 p-1 rounded-full bg-panel border border-line text-text-soft hover:text-red opacity-0 group-hover/photo:opacity-100 transition-opacity"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {canDelete && confirmDeleteUrl === url && (
                                      <div
                                        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 rounded-lg bg-black/70"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <span className="text-white font-semibold">삭제?</span>
                                        <button
                                          onClick={() => {
                                            setConfirmDeleteUrl(null);
                                            onDeletePhoto!(record.id, category, url);
                                          }}
                                          className="w-12 py-0.5 rounded-lg bg-red text-white font-semibold"
                                        >
                                          삭제
                                        </button>
                                        <button onClick={() => setConfirmDeleteUrl(null)} className="w-12 py-0.5 rounded-lg bg-panel text-text font-semibold">
                                          취소
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-text-soft truncate max-w-[160px] border-r border-blue/50" title={record.reasoning || ""}>
                      {isCompleted ? record.reasoning || "-" : "-"}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-blue/50">
                      {isCompleted && record.confidence ? (
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className="w-12 bg-line h-1 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full ${ record.confidence >= 90 ? "bg-green" : record.confidence >= 70 ? "bg-blue" : "bg-red" }`}
                              style={{ width: `${record.confidence}%` }}
                            />
                          </div>
                          <span
                            className={`inline-block text-[10px] font-extrabold font-mono px-1 py-0.2 rounded-lg ${ record.confidence >= 90 ? "bg-green/15 text-green" : record.confidence >= 70 ? "bg-blue/15 text-blue" : "bg-red/10 text-red" }`}
                          >
                            {record.confidence}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-text-soft italic font-mono">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-blue/50">
                      {record.status === "completed" && (
                        <span className="inline-block text-[10px] bg-green/15 text-green rounded-lg px-1.5 py-0.5 font-extrabold tracking-wider">
                          추출완료
                        </span>
                      )}
                      {record.status === "failed" && (
                        <button
                          onClick={(e) => handleCopyError(record, e)}
                          title={record.error ? `${record.error}\n(클릭하여 실패 사유 복사)` : "실패"}
                          className="inline-block bg-red/10 hover:bg-red/15 text-red rounded-lg px-1.5 py-0.5 font-extrabold tracking-wider cursor-pointer"
                        >
                          {copiedErrorId === record.id ? "복사됨!" : "실패"}
                        </button>
                      )}
                      {record.status === "processing" && (
                        <span className="inline-block text-[10px] bg-blue/15 text-text rounded-lg px-1.5 py-0.5 font-extrabold tracking-wider animate-pulse">
                          분석중
                        </span>
                      )}
                      {record.status === "idle" && (
                        <span className="inline-block text-[10px] bg-panel-2 text-text-soft rounded-lg px-1.5 py-0.5 font-bold tracking-wider">
                          대기중
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 border-r border-blue/50" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-stretch gap-1 w-full min-w-[110px]">
                        {record.status === "processing" ? (
                          <span className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 bg-blue/15 text-blue rounded-lg font-bold whitespace-nowrap text-sm">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            분석 중...
                          </span>
                        ) : (
                          <button
                            onClick={() => onAnalyze(record.id)}
                            title={record.status === "completed" ? "재분석" : "분석 시작"}
                            className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 bg-blue/15 hover:bg-blue/15 text-blue rounded-lg border border-line font-bold whitespace-nowrap text-sm"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            {record.status === "completed" ? "재분석" : "분석 시작"}
                          </button>
                        )}
                        {onSave && record.wattlineCategoryPhotos && (
                          <button
                            onClick={() => onSave(record.id)}
                            disabled={saveStatus?.[record.id] === "saving" || record.status === "processing"}
                            title="이 줄의 값을 DB에 저장"
                            className={`w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg font-bold whitespace-nowrap text-sm disabled:opacity-60 ${ saveStatus?.[record.id] === "saved" ? "bg-green text-white" : unsaved?.[record.id] ? "bg-blue hover:bg-blue-hover text-white" : "bg-panel border border-line text-text hover:bg-panel-2" }`}
                          >
                            {saveStatus?.[record.id] === "saving" ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : saveStatus?.[record.id] === "saved" ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            {saveStatus?.[record.id] === "saving" ? "저장 중..." : saveStatus?.[record.id] === "saved" ? "저장됨" : "저장"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onRemove(record.id)}
                        className="p-1 text-text-soft hover:text-red rounded-lg hover:bg-red/10 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
      {analysisPopup && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[3px] flex items-center justify-center p-4"
          onClick={() => setAnalysisPopup(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-3xl bg-panel border border-line shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-line">
              <h3 className="font-bold text-text">
                {analysisPopup.category} 사진 ·{" "}
                <span className={PHOTO_STATUS[analysisPopup.analysis.status].className}>{PHOTO_STATUS[analysisPopup.analysis.status].label}</span>
              </h3>
              <button onClick={() => setAnalysisPopup(null)} className="p-1 text-text-soft hover:text-text" title="닫기">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="px-5 py-4 text-text whitespace-pre-line break-words">{analysisPopup.analysis.message || "자세한 내용이 없습니다."}</p>
          </div>
        </div>
      )}
    </div>
  );
}

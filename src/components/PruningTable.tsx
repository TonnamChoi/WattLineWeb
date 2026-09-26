import React, { useState } from "react";
import { PruningRecord, DiameterCounts, WattlineCategory } from "../types";
import { Search, Download, Clipboard, Trash2, CheckCircle2, Play, Loader2, Eye, ImageOff } from "lucide-react";

interface PruningTableProps {
  records: PruningRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onAnalyze: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onUpdate: (id: string, updatedFields: Partial<PruningRecord>) => void;
}

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
      className={`w-full min-w-[60px] bg-transparent outline-none rounded px-1 py-0.5 hover:bg-panel-2 focus:bg-panel focus:ring-1 focus:ring-blue ${ align === "center" ? "text-center" : "" } ${className}`}
    />
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
      className="w-12 bg-transparent outline-none text-center font-mono rounded px-0.5 py-0.5 hover:bg-panel-2 focus:bg-panel focus:ring-1 focus:ring-blue"
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
          className="fixed z-50 pointer-events-none p-1 bg-panel border border-line rounded-lg shadow-2xl"
          style={{
            left: Math.min(pos.x + 16, window.innerWidth - 320),
            top: Math.min(pos.y + 16, window.innerHeight - 320),
          }}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-[300px] max-h-[300px] object-contain rounded"
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
      <div className="w-8 h-11 inline-flex items-center justify-center text-text-soft/60">
        <ImageOff className="w-3.5 h-3.5" />
      </div>
    );
  }
  return (
    <div className="w-8 h-11 rounded bg-panel-2 border border-line overflow-hidden inline-flex items-center justify-center">
      <img src={url} alt="참고 사진" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
    </div>
  );
}

const TH = "py-2 px-3 text-center border-r border-b border-green/20 bg-green/15 whitespace-nowrap";

const PHOTO_CATEGORIES: WattlineCategory[] = ["시작전주", "종료전주", "작업전", "흉고직경", "작업후", "기타"];

// WattLine DB에서 불러온 행은 분류별 실제 사진을, 수동 업로드 행은 대표 사진을 "작업전" 칸에 보여준다.
function getCategoryPhotoUrl(record: PruningRecord, category: WattlineCategory): string | null {
  if (record.wattlineCategoryPhotos) return record.wattlineCategoryPhotos[category] || null;
  return category === "작업전" ? record.url : null;
}

export default function PruningTable({
  records,
  selectedId,
  onSelect,
  onRemove,
  onClearAll,
  onAnalyze,
  onOpenDetail,
  onUpdate,
}: PruningTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCopied, setIsCopied] = useState(false);
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

  const handleDownloadCSV = () => {
    if (records.length === 0) return;

    let csvContent = "﻿";
    csvContent +=
      "전주번호(시작),전주번호(끝),수목종류,10cm미만,10cm이상,20cm이상,30cm이상,40cm이상,합계,비고,작업강도,나무분류,경간구분,작업내용,기타 세부정보,신뢰도(%),판독상태\n";

    records.forEach((record) => {
      const d = record.diameterCounts;
      const row = [
        `"${(record.poleStart || "미검출").replace(/"/g, '""')}"`,
        `"${(record.poleEnd || "미검출").replace(/"/g, '""')}"`,
        `"${(record.treeSpecies || "미검출").replace(/"/g, '""')}"`,
        d?.under10 ?? 0,
        d?.over10 ?? 0,
        d?.over20 ?? 0,
        d?.over30 ?? 0,
        d?.over40 ?? 0,
        d?.total ?? 0,
        `"${(record.note || "").replace(/"/g, '""')}"`,
        `"${(record.workIntensity || "").replace(/"/g, '""')}"`,
        `"${(record.treeClassification || "").replace(/"/g, '""')}"`,
        `"${(record.spanDescription || "").replace(/"/g, '""')}"`,
        `"${(record.workContent || "").replace(/"/g, '""')}"`,
        `"${(record.reasoning || "").replace(/"/g, '""')}"`,
        record.confidence || 0,
        record.status === "completed" ? "성공" : record.status === "failed" ? "실패" : "대기중",
      ];
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `전지작업_분석결과_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyToClipboard = () => {
    if (records.length === 0) return;

    let tsvText =
      "전주번호(시작)\t전주번호(끝)\t수목종류\t10cm미만\t10cm이상\t20cm이상\t30cm이상\t40cm이상\t합계\t비고\t작업강도\t나무분류\t경간구분\t작업내용\t기타 세부정보\t신뢰도(%)\n";
    records.forEach((record) => {
      const d = record.diameterCounts;
      tsvText += `${record.poleStart || "미검출"}\t${record.poleEnd || "미검출"}\t${record.treeSpecies || "미검출"}\t${d?.under10 ?? 0}\t${d?.over10 ?? 0}\t${d?.over20 ?? 0}\t${d?.over30 ?? 0}\t${d?.over40 ?? 0}\t${d?.total ?? 0}\t${record.note || ""}\t${record.workIntensity || ""}\t${record.treeClassification || ""}\t${record.spanDescription || ""}\t${record.workContent || ""}\t${record.reasoning || ""}\t${record.confidence || 0}\n`;
    });

    navigator.clipboard.writeText(tsvText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="bg-panel border border-line rounded-lg overflow-hidden shadow-2xs">
      <div className="p-3.5 border-b border-line bg-panel-2 space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-text-soft text-xs uppercase tracking-wider">전지작업 분석 결과</h3>
            <span className="text-[11px] bg-blue/15 text-text font-extrabold px-2 py-0.5 rounded font-mono">
              {records.length}건 로드됨
            </span>
          </div>

          {records.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyToClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-panel hover:bg-panel-2 border border-line text-text-soft rounded transition-colors cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green" />
                    클립보드 복사됨!
                  </>
                ) : (
                  <>
                    <Clipboard className="w-3.5 h-3.5 text-text-soft" />
                    엑셀용 복사 (TSV)
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-green hover:bg-green-strong text-bg rounded transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                엑셀 다운로드 (.csv)
              </button>

              <button
                onClick={onClearAll}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold hover:bg-red/10 text-red border border-transparent rounded transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                목록 비우기
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-[200px] w-full">
            <Search className="w-3.5 h-3.5 text-text-soft absolute left-2.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="수목종류, 전주번호, 파일명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2.5 py-1 w-full text-xs border border-text-soft/40 rounded outline-none hover:border-text-soft/40 focus:border-blue transition-all bg-panel font-medium"
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
                <th className={TH} rowSpan={2}>작업<br />강도</th>
                <th className={TH} rowSpan={2}>나무<br />분류</th>
                <th className={TH} rowSpan={2}>경간구분</th>
                <th className={TH} rowSpan={2}>작업내용</th>
              </tr>
              <tr>
                <th className={TH}>시작</th>
                <th className={TH}>끝</th>
                <th className={`${TH} w-14`}>10cm<br />미만</th>
                <th className={`${TH} w-14`}>10cm<br />이상</th>
                <th className={`${TH} w-14`}>20cm<br />이상</th>
                <th className={`${TH} w-14`}>30cm<br />이상</th>
                <th className={`${TH} w-14`}>40cm<br />이상</th>
                <th className={`${TH} w-12`}>합계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-medium">
              {filteredRecords.map((record) => {
                const isSelected = record.id === selectedId;
                const d = record.diameterCounts;
                return (
                  <tr
                    key={record.id}
                    onClick={() => onSelect(record.id)}
                    className={`text-[12px] hover:bg-blue/50 transition-colors cursor-pointer ${ isSelected ? "bg-blue/30 font-bold" : "" }`}
                  >
                    <td className="py-1 px-1 border-r border-line font-mono">
                      <EditableText value={record.poleStart} onChange={(v) => onUpdate(record.id, { poleStart: v })} align="center" />
                    </td>
                    <td className="py-1 px-1 border-r border-line font-mono">
                      <EditableText value={record.poleEnd} onChange={(v) => onUpdate(record.id, { poleEnd: v })} align="center" />
                    </td>
                    <td className="py-1 px-1 border-r border-line">
                      <EditableText
                        value={record.treeSpecies}
                        onChange={(v) => onUpdate(record.id, { treeSpecies: v })}
                        className="font-extrabold text-text font-sans"
                      />
                    </td>
                    <td className="py-1 px-1 text-center border-r border-line font-mono">
                      <EditableCount value={d?.under10 ?? 0} onChange={(v) => handleCountChange(record, "under10", v)} />
                    </td>
                    <td className="py-1 px-1 text-center border-r border-line font-mono">
                      <EditableCount value={d?.over10 ?? 0} onChange={(v) => handleCountChange(record, "over10", v)} />
                    </td>
                    <td className="py-1 px-1 text-center border-r border-line font-mono">
                      <EditableCount value={d?.over20 ?? 0} onChange={(v) => handleCountChange(record, "over20", v)} />
                    </td>
                    <td className="py-1 px-1 text-center border-r border-line font-mono">
                      <EditableCount value={d?.over30 ?? 0} onChange={(v) => handleCountChange(record, "over30", v)} />
                    </td>
                    <td className="py-1 px-1 text-center border-r border-line font-mono">
                      <EditableCount value={d?.over40 ?? 0} onChange={(v) => handleCountChange(record, "over40", v)} />
                    </td>
                    <td className="py-2 px-3 text-center border-r border-line font-mono font-extrabold">{d?.total ?? 0}</td>
                    <td className="py-1 px-1 border-r border-line">
                      <EditableText value={record.note} onChange={(v) => onUpdate(record.id, { note: v })} className="text-text-soft" />
                    </td>
                    <td className="py-1 px-1 border-r border-line">
                      <EditableText value={record.workIntensity} onChange={(v) => onUpdate(record.id, { workIntensity: v })} align="center" />
                    </td>
                    <td className="py-1 px-1 border-r border-line">
                      <EditableText value={record.treeClassification} onChange={(v) => onUpdate(record.id, { treeClassification: v })} align="center" />
                    </td>
                    <td className="py-1 px-1 border-r border-line">
                      <EditableText value={record.spanDescription} onChange={(v) => onUpdate(record.id, { spanDescription: v })} className="text-text-soft" />
                    </td>
                    <td className="py-1 px-1 border-r border-line">
                      <EditableText value={record.workContent} onChange={(v) => onUpdate(record.id, { workContent: v })} className="text-text-soft" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 2행: 사진/기타 세부정보/정확도/판독상태/작업/삭제 */}
          <table className="w-full text-left border-collapse border-t-2 border-line">
            <thead className="text-text-soft font-bold text-[10px] uppercase tracking-wider">
              <tr>
                <th className={TH} colSpan={6}>사진</th>
                <th className={TH} rowSpan={2}>기타 세부<br />정보</th>
                <th className={TH} rowSpan={2}>정확도</th>
                <th className={TH} rowSpan={2}>판독<br />상태</th>
                <th className={TH} rowSpan={2}>작업</th>
                <th className={TH} rowSpan={2}>삭제</th>
              </tr>
              <tr>
                <th className={TH}>시작<br />전주</th>
                <th className={TH}>종료<br />전주</th>
                <th className={TH}>작업전</th>
                <th className={TH}>흉고<br />직경</th>
                <th className={TH}>작업후</th>
                <th className={TH}>기타</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-medium">
              {filteredRecords.map((record) => {
                const isSelected = record.id === selectedId;
                const isCompleted = record.status === "completed";
                return (
                  <tr
                    key={record.id}
                    onClick={() => onSelect(record.id)}
                    className={`text-[12px] hover:bg-blue/50 transition-colors cursor-pointer ${ isSelected ? "bg-blue/30 font-bold" : "" }`}
                  >
                    {PHOTO_CATEGORIES.map((category) => {
                      const photoUrl = getCategoryPhotoUrl(record, category);
                      return (
                        <td key={category} className="py-1 px-3 text-center border-r border-line">
                          <HoverPreview src={photoUrl} alt={category}>
                            <PhotoThumb url={photoUrl} />
                          </HoverPreview>
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-text-soft truncate max-w-[160px] border-r border-line" title={record.reasoning || ""}>
                      {isCompleted ? record.reasoning || "-" : "-"}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-line">
                      {isCompleted && record.confidence ? (
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className="w-12 bg-line h-1 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full ${ record.confidence >= 90 ? "bg-green" : record.confidence >= 70 ? "bg-blue" : "bg-red" }`}
                              style={{ width: `${record.confidence}%` }}
                            />
                          </div>
                          <span
                            className={`inline-block text-[10px] font-extrabold font-mono px-1 py-0.2 rounded ${ record.confidence >= 90 ? "bg-green/15 text-green" : record.confidence >= 70 ? "bg-blue/15 text-blue" : "bg-red/10 text-red" }`}
                          >
                            {record.confidence}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-text-soft italic font-mono">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-line">
                      {record.status === "completed" && (
                        <span className="inline-block text-[10px] bg-green/15 text-green rounded px-1.5 py-0.5 font-extrabold tracking-wider">
                          추출완료
                        </span>
                      )}
                      {record.status === "failed" && (
                        <button
                          onClick={(e) => handleCopyError(record, e)}
                          title={record.error ? `${record.error}\n(클릭하여 실패 사유 복사)` : "실패"}
                          className="inline-block bg-red/10 hover:bg-red/15 text-red rounded px-1.5 py-0.5 font-extrabold tracking-wider cursor-pointer"
                        >
                          {copiedErrorId === record.id ? "복사됨!" : "실패"}
                        </button>
                      )}
                      {record.status === "processing" && (
                        <span className="inline-block text-[10px] bg-blue/15 text-text rounded px-1.5 py-0.5 font-extrabold tracking-wider animate-pulse">
                          분석중
                        </span>
                      )}
                      {record.status === "idle" && (
                        <span className="inline-block text-[10px] bg-panel-2 text-text-soft rounded px-1.5 py-0.5 font-bold tracking-wider">
                          대기중
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 border-r border-line" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-stretch gap-1 w-full min-w-[110px]">
                        <button
                          onClick={() => onOpenDetail(record.id)}
                          title="상세 및 수정"
                          className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 bg-green hover:bg-green-strong text-bg rounded font-bold whitespace-nowrap text-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          상세보기
                        </button>
                        {record.status === "processing" ? (
                          <span className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 bg-blue/15 text-blue rounded font-bold whitespace-nowrap text-sm">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            분석 중...
                          </span>
                        ) : (
                          <button
                            onClick={() => onAnalyze(record.id)}
                            title={record.status === "completed" ? "재분석" : "분석 시작"}
                            className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 bg-blue/15 hover:bg-blue/15 text-blue rounded border border-line font-bold whitespace-nowrap text-sm"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            {record.status === "completed" ? "재분석" : "분석 시작"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onRemove(record.id)}
                        className="p-1 text-text-soft hover:text-red rounded hover:bg-red/10 transition-colors"
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
    </div>
  );
}

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
      className={`w-full min-w-[60px] bg-transparent outline-none rounded px-1 py-0.5 hover:bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-400 ${
        align === "center" ? "text-center" : ""
      } ${className}`}
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
      className="w-12 bg-transparent outline-none text-center font-mono rounded px-0.5 py-0.5 hover:bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-400"
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
          className="fixed z-50 pointer-events-none p-1 bg-white border border-gray-200 rounded-lg shadow-2xl"
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
      <div className="w-8 h-11 inline-flex items-center justify-center text-gray-300">
        <ImageOff className="w-3.5 h-3.5" />
      </div>
    );
  }
  return (
    <div className="w-8 h-11 rounded bg-gray-100 border border-gray-200 overflow-hidden inline-flex items-center justify-center">
      <img src={url} alt="참고 사진" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
    </div>
  );
}

const TH = "py-2 px-3 text-center border-r border-b border-green-200 bg-green-50 whitespace-nowrap";

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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
      <div className="p-3.5 border-b border-gray-200 bg-gray-50 space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-gray-700 text-xs uppercase tracking-wider">전지작업 분석 결과</h3>
            <span className="text-[11px] bg-blue-100 text-blue-700 font-extrabold px-2 py-0.5 rounded font-mono">
              {records.length}건 로드됨
            </span>
          </div>

          {records.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyToClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded transition-colors cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    클립보드 복사됨!
                  </>
                ) : (
                  <>
                    <Clipboard className="w-3.5 h-3.5 text-gray-500" />
                    엑셀용 복사 (TSV)
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#1A1C1E] hover:bg-black text-white rounded transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                엑셀 다운로드 (.csv)
              </button>

              <button
                onClick={onClearAll}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold hover:bg-red-50 text-red-600 border border-transparent rounded transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                목록 비우기
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-[200px] w-full">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="수목종류, 전주번호, 파일명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2.5 py-1 w-full text-xs border border-gray-300 rounded outline-none hover:border-gray-400 focus:border-blue-500 transition-all bg-white font-medium"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="text-gray-600 font-bold text-[10px] uppercase tracking-wider">
            <tr>
              <th className={TH} colSpan={2} rowSpan={1}>전주번호</th>
              <th className={TH} rowSpan={2}>수목종류</th>
              <th className={TH} colSpan={6}>준공내역</th>
              <th className={TH} rowSpan={2}>비고</th>
              <th className={TH} rowSpan={2}>작업<br />강도</th>
              <th className={TH} rowSpan={2}>나무<br />분류</th>
              <th className={TH} rowSpan={2}>경간구분</th>
              <th className={TH} rowSpan={2}>작업내용</th>
              <th className={TH} colSpan={6}>사진</th>
              <th className={TH} rowSpan={2}>기타 세부<br />정보</th>
              <th className={TH} rowSpan={2}>정확도</th>
              <th className={TH} rowSpan={2}>판독<br />상태</th>
              <th className={TH} rowSpan={2}>작업</th>
              <th className={TH} rowSpan={2}>삭제</th>
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
              <th className={TH}>시작<br />전주</th>
              <th className={TH}>종료<br />전주</th>
              <th className={TH}>작업전</th>
              <th className={TH}>흉고<br />직경</th>
              <th className={TH}>작업후</th>
              <th className={TH}>기타</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={25} className="py-12 text-center text-gray-400 text-[11px]">
                  {searchTerm ? "검색 결과와 일치하는 데이터가 없습니다." : "표시할 분석 결과 데이터가 없습니다."}
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => {
                const isSelected = record.id === selectedId;
                const d = record.diameterCounts;
                const isCompleted = record.status === "completed";
                return (
                  <tr
                    key={record.id}
                    onClick={() => onSelect(record.id)}
                    className={`text-[12px] hover:bg-blue-50/50 transition-colors cursor-pointer ${
                      isSelected ? "bg-blue-50/30 font-bold" : ""
                    }`}
                  >
                    <td className="py-1 px-1 border-r border-gray-100 font-mono">
                      <EditableText value={record.poleStart} onChange={(v) => onUpdate(record.id, { poleStart: v })} align="center" />
                    </td>
                    <td className="py-1 px-1 border-r border-gray-100 font-mono">
                      <EditableText value={record.poleEnd} onChange={(v) => onUpdate(record.id, { poleEnd: v })} align="center" />
                    </td>
                    <td className="py-1 px-1 border-r border-gray-100">
                      <EditableText
                        value={record.treeSpecies}
                        onChange={(v) => onUpdate(record.id, { treeSpecies: v })}
                        className="font-extrabold text-blue-700 font-sans"
                      />
                    </td>
                    <td className="py-1 px-1 text-center border-r border-gray-100 font-mono">
                      <EditableCount value={d?.under10 ?? 0} onChange={(v) => handleCountChange(record, "under10", v)} />
                    </td>
                    <td className="py-1 px-1 text-center border-r border-gray-100 font-mono">
                      <EditableCount value={d?.over10 ?? 0} onChange={(v) => handleCountChange(record, "over10", v)} />
                    </td>
                    <td className="py-1 px-1 text-center border-r border-gray-100 font-mono">
                      <EditableCount value={d?.over20 ?? 0} onChange={(v) => handleCountChange(record, "over20", v)} />
                    </td>
                    <td className="py-1 px-1 text-center border-r border-gray-100 font-mono">
                      <EditableCount value={d?.over30 ?? 0} onChange={(v) => handleCountChange(record, "over30", v)} />
                    </td>
                    <td className="py-1 px-1 text-center border-r border-gray-100 font-mono">
                      <EditableCount value={d?.over40 ?? 0} onChange={(v) => handleCountChange(record, "over40", v)} />
                    </td>
                    <td className="py-2 px-3 text-center border-r border-gray-100 font-mono font-extrabold">{d?.total ?? 0}</td>
                    <td className="py-1 px-1 border-r border-gray-100">
                      <EditableText value={record.note} onChange={(v) => onUpdate(record.id, { note: v })} className="text-gray-500" />
                    </td>
                    <td className="py-1 px-1 border-r border-gray-100">
                      <EditableText value={record.workIntensity} onChange={(v) => onUpdate(record.id, { workIntensity: v })} align="center" />
                    </td>
                    <td className="py-1 px-1 border-r border-gray-100">
                      <EditableText value={record.treeClassification} onChange={(v) => onUpdate(record.id, { treeClassification: v })} align="center" />
                    </td>
                    <td className="py-1 px-1 border-r border-gray-100">
                      <EditableText value={record.spanDescription} onChange={(v) => onUpdate(record.id, { spanDescription: v })} className="text-gray-500" />
                    </td>
                    <td className="py-1 px-1 border-r border-gray-100">
                      <EditableText value={record.workContent} onChange={(v) => onUpdate(record.id, { workContent: v })} className="text-gray-500" />
                    </td>
                    {PHOTO_CATEGORIES.map((category) => {
                      const photoUrl = getCategoryPhotoUrl(record, category);
                      return (
                        <td key={category} className="py-1 px-3 text-center border-r border-gray-100">
                          <HoverPreview src={photoUrl} alt={category}>
                            <PhotoThumb url={photoUrl} />
                          </HoverPreview>
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-gray-500 truncate max-w-[160px] border-r border-gray-100" title={record.reasoning || ""}>
                      {isCompleted ? record.reasoning || "-" : "-"}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-gray-100">
                      {isCompleted && record.confidence ? (
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className="w-12 bg-gray-200 h-1 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full ${
                                record.confidence >= 90 ? "bg-green-500" : record.confidence >= 70 ? "bg-blue-500" : "bg-red-500"
                              }`}
                              style={{ width: `${record.confidence}%` }}
                            />
                          </div>
                          <span
                            className={`inline-block text-[10px] font-extrabold font-mono px-1 py-0.2 rounded ${
                              record.confidence >= 90
                                ? "bg-green-50 text-green-700"
                                : record.confidence >= 70
                                ? "bg-blue-50 text-blue-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {record.confidence}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic font-mono">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-gray-100">
                      {record.status === "completed" && (
                        <span className="inline-block text-[10px] bg-green-50 text-green-700 rounded px-1.5 py-0.5 font-extrabold tracking-wider">
                          추출완료
                        </span>
                      )}
                      {record.status === "failed" && (
                        <button
                          onClick={(e) => handleCopyError(record, e)}
                          title={record.error ? `${record.error}\n(클릭하여 실패 사유 복사)` : "실패"}
                          className="inline-block bg-red-50 hover:bg-red-100 text-red-700 rounded px-1.5 py-0.5 font-extrabold tracking-wider cursor-pointer"
                        >
                          {copiedErrorId === record.id ? "복사됨!" : "실패"}
                        </button>
                      )}
                      {record.status === "processing" && (
                        <span className="inline-block text-[10px] bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 font-extrabold tracking-wider animate-pulse">
                          분석중
                        </span>
                      )}
                      {record.status === "idle" && (
                        <span className="inline-block text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 font-bold tracking-wider">
                          대기중
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-stretch gap-1 w-full min-w-[110px]">
                        <button
                          onClick={() => onOpenDetail(record.id)}
                          title="상세 및 수정"
                          className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 bg-gray-900 hover:bg-black text-white rounded font-bold whitespace-nowrap text-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          상세보기
                        </button>
                        {record.status === "processing" ? (
                          <span className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 bg-blue-50 text-blue-400 rounded font-bold whitespace-nowrap text-sm">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            분석 중...
                          </span>
                        ) : (
                          <button
                            onClick={() => onAnalyze(record.id)}
                            title={record.status === "completed" ? "재분석" : "분석 시작"}
                            className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 font-bold whitespace-nowrap text-sm"
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
                        className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

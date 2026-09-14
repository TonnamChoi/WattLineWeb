import React, { useState } from "react";
import { PruningRecord } from "../types";
import { cropToBoundingBox } from "../lib/cropImage";
import { Search, Download, Clipboard, Trash2, CheckCircle2, Play, Loader2, Eye } from "lucide-react";

interface PruningTableProps {
  records: PruningRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onAnalyze: (id: string) => void;
  onOpenDetail: (id: string) => void;
}

export default function PruningTable({
  records,
  selectedId,
  onSelect,
  onRemove,
  onClearAll,
  onAnalyze,
  onOpenDetail,
}: PruningTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ top: number; left: number } | null>(null);
  const [cropCache, setCropCache] = useState<Record<string, string>>({});

  const handlePreviewEnter = (record: PruningRecord, e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPos({ top: rect.top, left: rect.left + rect.width / 2 });
    setHoveredId(record.id);

    if (!cropCache[record.id] && record.boundingBox) {
      cropToBoundingBox(record.url, record.boundingBox)
        .then((url) => setCropCache((prev) => ({ ...prev, [record.id]: url })))
        .catch(() => {});
    }
  };

  const handlePreviewLeave = () => setHoveredId(null);
  const hoveredRecord = hoveredId ? records.find((r) => r.id === hoveredId) : null;

  const [copiedErrorId, setCopiedErrorId] = useState<string | null>(null);
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
      "No,파일명,전주번호(시작),전주번호(끝),수목종류,10cm미만,10cm이상,20cm이상,30cm이상,40cm이상,합계,비고,작업강도,나무분류,경간구분,작업내용,신뢰도(%),분석상태,등록시간\n";

    records.forEach((record, index) => {
      const d = record.diameterCounts;
      const row = [
        index + 1,
        `"${record.name.replace(/"/g, '""')}"`,
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
        record.confidence || 0,
        record.status === "completed" ? "성공" : record.status === "failed" ? "실패" : "대기중",
        record.uploadedAt,
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
      "No\t파일명\t전주번호(시작)\t전주번호(끝)\t수목종류\t10cm미만\t10cm이상\t20cm이상\t30cm이상\t40cm이상\t합계\t비고\t작업강도\t나무분류\t경간구분\t작업내용\t신뢰도(%)\t등록시간\n";
    records.forEach((record, index) => {
      const d = record.diameterCounts;
      tsvText += `${index + 1}\t${record.name}\t${record.poleStart || "미검출"}\t${record.poleEnd || "미검출"}\t${record.treeSpecies || "미검출"}\t${d?.under10 ?? 0}\t${d?.over10 ?? 0}\t${d?.over20 ?? 0}\t${d?.over30 ?? 0}\t${d?.over40 ?? 0}\t${d?.total ?? 0}\t${record.note || ""}\t${record.workIntensity || ""}\t${record.treeClassification || ""}\t${record.spanDescription || ""}\t${record.workContent || ""}\t${record.confidence || 0}\t${record.uploadedAt}\n`;
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
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold text-[10px] uppercase tracking-wider">
              <th className="py-2 px-3 text-center w-12 border-r border-gray-200">번호</th>
              <th className="py-2 px-3 w-14 text-center border-r border-gray-200">미리보기</th>
              <th className="py-2 px-3 border-r border-gray-200">전주번호</th>
              <th className="py-2 px-3 border-r border-gray-200">수목종류</th>
              <th className="py-2 px-3 text-center border-r border-gray-200 w-16">합계</th>
              <th className="py-2 px-3 border-r border-gray-200">작업강도</th>
              <th className="py-2 px-3 border-r border-gray-200">나무분류</th>
              <th className="py-2 px-3 border-r border-gray-200">경간구분</th>
              <th className="py-2 px-3 border-r border-gray-200">작업내용</th>
              <th className="py-2 px-3 text-center border-r border-gray-200 w-24">정확도</th>
              <th className="py-2 px-3 text-center border-r border-gray-200 w-24">판독 상태</th>
              <th className="py-2 px-3 text-center border-r border-gray-200 w-32">작업</th>
              <th className="py-2 px-3 text-center w-16">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-gray-400 text-[11px]">
                  {searchTerm ? "검색 결과와 일치하는 데이터가 없습니다." : "표시할 분석 결과 데이터가 없습니다."}
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, index) => {
                const isSelected = record.id === selectedId;
                return (
                  <tr
                    key={record.id}
                    onClick={() => onSelect(record.id)}
                    className={`text-[12px] hover:bg-blue-50/50 transition-colors cursor-pointer ${
                      isSelected ? "bg-blue-50/30 font-bold" : ""
                    }`}
                  >
                    <td className="py-2 px-3 text-center text-gray-400 font-mono border-r border-gray-100">
                      {String(index + 1).padStart(3, "0")}
                    </td>
                    <td className="py-1 px-3 text-center border-r border-gray-100">
                      <div
                        className="w-8 h-11 rounded bg-gray-100 border border-gray-200 overflow-hidden inline-flex items-center justify-center cursor-zoom-in"
                        onMouseEnter={(e) => handlePreviewEnter(record, e)}
                        onMouseLeave={handlePreviewLeave}
                      >
                        <img src={record.url} alt="preview" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-gray-700 border-r border-gray-100 font-mono">
                      {record.status === "completed" ? `${record.poleStart || "-"} ~ ${record.poleEnd || "-"}` : "-"}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100">
                      {record.status === "completed" ? (
                        <span className="font-extrabold text-blue-700 font-sans">{record.treeSpecies || "-"}</span>
                      ) : (
                        <span className="text-gray-400 italic font-mono">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-gray-100 font-mono">
                      {record.status === "completed" ? record.diameterCounts?.total ?? "-" : "-"}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100">{record.status === "completed" ? record.workIntensity || "-" : "-"}</td>
                    <td className="py-2 px-3 border-r border-gray-100">{record.status === "completed" ? record.treeClassification || "-" : "-"}</td>
                    <td className="py-2 px-3 text-gray-500 truncate max-w-[140px] border-r border-gray-100" title={record.spanDescription || ""}>
                      {record.status === "completed" ? record.spanDescription || "-" : "-"}
                    </td>
                    <td className="py-2 px-3 text-gray-500 truncate max-w-[180px] border-r border-gray-100" title={record.workContent || ""}>
                      {record.status === "completed" ? record.workContent || "-" : "-"}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-gray-100">
                      {record.status === "completed" && record.confidence ? (
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
                      <div className="flex flex-col items-stretch gap-1 w-full">
                        <button
                          onClick={() => onOpenDetail(record.id)}
                          onMouseEnter={(e) => handlePreviewEnter(record, e)}
                          onMouseLeave={handlePreviewLeave}
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

      {hoveredRecord && hoverPos && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{ top: hoverPos.top - 8, left: hoverPos.left, transform: "translate(-50%, -100%)" }}
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-1.5">
            <img
              src={cropCache[hoveredRecord.id] || hoveredRecord.url}
              alt="사진 미리보기"
              className="max-w-[220px] max-h-[280px] object-contain rounded"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
